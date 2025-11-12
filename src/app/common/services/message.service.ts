import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MessageItem {
  id: number;
  message: string;
  sentAt: string;
  senderId: number;
  meetingId: number;
  senderName?: string;
  senderEmail?: string;
  [key: string]: any;
}

export interface MessageResponse {
  success: boolean;
  message: string;
  data: {
    content: MessageItem[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
  };
  error?: {
    status: number;
    error: string;
    message: string;
    timestamp: string;
  };
}

export interface MessageSearchParams {
  keyword?: string;
  meetingId?: number;
  senderId?: number;
  receiverId?: number;
  startDate?: string; // dd/MM/yyyy HH:mm hoặc dd/MM/yyyy
  endDate?: string;   // dd/MM/yyyy HH:mm hoặc dd/MM/yyyy
  page?: number;      // 0-based, default 0
  size?: number;      // default 10
  sortBy?: string;    // default sentAt
  sortDirection?: 'asc' | 'desc'; // default desc
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = `${environment.apiUrl}/messages`;

  constructor(private http: HttpClient) {}

  searchMessages(params: MessageSearchParams = {}): Observable<MessageResponse> {
    let httpParams = new HttpParams();
    
    if (params.keyword) {
      httpParams = httpParams.set('keyword', params.keyword);
    }
    
    if (params.meetingId !== undefined) {
      httpParams = httpParams.set('meetingId', params.meetingId.toString());
    }
    
    if (params.senderId !== undefined) {
      httpParams = httpParams.set('senderId', params.senderId.toString());
    }
    
    if (params.receiverId !== undefined) {
      httpParams = httpParams.set('receiverId', params.receiverId.toString());
    }
    
    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    
    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size.toString());
    }
    
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    
    if (params.sortDirection) {
      httpParams = httpParams.set('sortDirection', params.sortDirection);
    }

    return this.http.get<MessageResponse>(`${this.apiUrl}/search`, {
      params: httpParams
    });
  }
}

