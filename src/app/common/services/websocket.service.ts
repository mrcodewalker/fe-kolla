import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WebSocketMessage, WebSocketMessageGenerator } from '../models/websocket.model';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private subjects: Map<string, Subject<any>> = new Map();
  private currentUrl: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 second
  private messageQueue: WebSocketMessage[] = [];
  private messageGenerator: WebSocketMessageGenerator;
  private isReady = false; // Flag to track if socket is ready for messages
  private pendingMessages: Map<number, Subject<any>> = new Map(); // Track pending message responses

  constructor() {
    this.messageGenerator = WebSocketMessageGenerator.getInstance();
  }

  initializeSocket(roomId: string, peerId: string): void {
    try {
      // Clean up existing socket
      this.cleanup();

      // Create WebSocket URL with protoo protocol, including roomId and peerId
      const baseUrl = environment.wsUrl.replace('http', 'ws');
      this.currentUrl = `${baseUrl}/?roomId=${roomId}&peerId=${peerId}`;
      console.log('Initializing WebSocket connection to:', this.currentUrl);
      
      this.connectWebSocket();
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      throw error;
    }
  }

  private connectWebSocket(): void {
    try {
      this.ws = new WebSocket(this.currentUrl, ['protoo']);

      this.ws.onopen = () => {
        console.log('WebSocket connected:', this.currentUrl);
        this.reconnectAttempts = 0;
        this.isReady = true;
        
        // Process queued messages
        this.processMessageQueue();
        
        // Notify connection success
        this.subjects.get('connect')?.next(true);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.handleReconnect();
        // Notify connection closed
        this.subjects.get('disconnect')?.next(event);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Notify error
        this.subjects.get('error')?.next(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('Received message:', message);

          // Handle response messages
          if (!message.request && message.id) {
            // Check if we have a pending message waiting for this response
            const pendingSubject = this.pendingMessages.get(message.id);
            if (pendingSubject) {
              if (message.ok === false) {
                pendingSubject.error(message.data?.error || 'Unknown error');
              } else {
                pendingSubject.next(message.data);
              }
              pendingSubject.complete();
              this.pendingMessages.delete(message.id);
            }
            
            // Also emit to response subject if exists
            const responseSubject = this.subjects.get(`response_${message.id}`);
            if (responseSubject) {
              if (message.ok === false) {
                responseSubject.error(message.data?.error || 'Unknown error');
              } else {
                responseSubject.next(message.data);
              }
              responseSubject.complete();
              this.subjects.delete(`response_${message.id}`);
            }
          }

          // Handle method-based messages (both requests and notifications)
          if (message.method) {
            if (message.request) {
              // For request messages, include the request ID in the data
              const dataWithId = { ...message.data, requestId: message.id };
              this.subjects.get(message.method)?.next(dataWithId);
            } else {
              // For notification messages
              this.subjects.get(message.method)?.next(message.data);
            }
          }

          // Process any queued messages after successful response
          this.processMessageQueue();
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connectWebSocket(), this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
      this.subjects.get('error')?.next(new Error('Max reconnection attempts reached'));
    }
  }

  private cleanup(): void {
    this.isReady = false;
    
    // Clear all pending messages with error
    this.pendingMessages.forEach((subject) => {
      subject.error(new Error('WebSocket connection closed'));
      subject.complete();
    });
    this.pendingMessages.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Keep message queue for potential reconnect
    // Keep subjects for potential reconnect
  }

  connect(): void {
    if (!this.ws) {
      console.error('WebSocket not initialized. Call initializeSocket first.');
      return;
    }
    if (this.ws.readyState === WebSocket.CLOSED) {
      this.connectWebSocket();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  private processMessageQueue(): void {
    console.log('Processing message queue, messages:', this.messageQueue.length);
    while (this.messageQueue.length > 0 && this.isReady) {
      const msg = this.messageQueue.shift();
      if (msg) {
        this.sendMessage(msg);
      }
    }
  }

  private sendMessage(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready, queueing message:', message);
      this.messageQueue.push(message);
      return;
    }

    try {
      console.log('Sending message:', message);
      this.ws.send(JSON.stringify(message));
      
      // Track pending response if it's a request
      if (message.request) {
        const responseSubject = new Subject<any>();
        this.pendingMessages.set(message.id, responseSubject);
        
        // Setup timeout for pending message
        setTimeout(() => {
          if (this.pendingMessages.has(message.id)) {
            console.warn('Message timeout:', message);
            this.pendingMessages.get(message.id)?.error(new Error('Message timeout'));
            this.pendingMessages.delete(message.id);
          }
        }, 10000); // 10 second timeout
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.messageQueue.push(message);
    }
  }

  emit(event: string, data?: any, existingMessage?: WebSocketMessage): void {
    const message = existingMessage || this.messageGenerator.generateMessage(event, data);
    this.sendMessage(message);
  }

  // Send a response message (not a request)
  emitResponse(id: number, data?: any, ok: boolean = true): void {
    const message: WebSocketMessage = {
      id,
      method: '',
      request: false,
      ok
    };
    
    if (data) {
      message.data = data;
    }
    
    this.sendMessage(message);
  }

  // Send a message and wait for its response
  emitWithResponse<T>(event: string, data?: any, timeout: number = 10000): Promise<T> {
    return new Promise((resolve, reject) => {
      const message = this.messageGenerator.generateMessage(event, data);
      console.log('Emitting message:', message);
      const responseSubject = new Subject<T>();
      
      // Setup response listener
      this.subjects.set(`response_${message.id}`, responseSubject);
      
      // Setup timeout
      const timeoutId = setTimeout(() => {
        this.subjects.delete(`response_${message.id}`);
        reject(new Error(`Timeout waiting for response to message ${message.id}`));
      }, timeout);

      // Subscribe to response
      responseSubject.subscribe({
        next: (response) => {
          clearTimeout(timeoutId);
          this.subjects.delete(`response_${message.id}`);
          resolve(response);
        },
        error: (error) => {
          clearTimeout(timeoutId);
          this.subjects.delete(`response_${message.id}`);
          reject(error);
        }
      });

      // Send the message
      this.emit(event, data, message);
    });
  }

  on<T>(event: string): Observable<T> {
    if (!this.subjects.has(event)) {
      const subject = new Subject<T>();
      this.subjects.set(event, subject);
    }
    return this.subjects.get(event)!.asObservable();
  }

  off(event: string): void {
    if (this.subjects.has(event)) {
      const subject = this.subjects.get(event);
      subject?.complete();
      this.subjects.delete(event);
      console.log(`Removed listener for ${event} event`);
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}