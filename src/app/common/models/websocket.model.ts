export interface WebSocketMessage {
  id: number;
  method: string;
  data?: any;
  request: boolean;
  ok?: boolean;  // For response messages
}

export class WebSocketMessageGenerator {
  private static instance: WebSocketMessageGenerator;
  private currentId: number = 1;

  private constructor() {}

  public static getInstance(): WebSocketMessageGenerator {
    if (!WebSocketMessageGenerator.instance) {
      WebSocketMessageGenerator.instance = new WebSocketMessageGenerator();
    }
    return WebSocketMessageGenerator.instance;
  }

  public generateMessage(method: string, data?: any): WebSocketMessage {
    const message: WebSocketMessage = {
      id: this.currentId++,
      method,
      request: true
    };

    if (data) {
      message.data = data;
    }

    return message;
  }

  // Reset ID counter - useful for testing or if needed
  public resetCounter(): void {
    this.currentId = 1;
  }
}
