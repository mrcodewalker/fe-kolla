import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificationItem {
  id: number;
  title?: string;
  content?: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
  read?: boolean;
  [key: string]: any;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  data: {
    content: NotificationItem[];
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

export interface NotificationSearchParams {
  page?: number;      // 0-based, default 0
  size?: number;      // default 10
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getNotificationsByToken(params: NotificationSearchParams = {}): Observable<NotificationResponse> {
    let httpParams = new HttpParams();
    
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    
    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size.toString());
    }

    return this.http.get<NotificationResponse>(`${this.apiUrl}/by-token`, {
      params: httpParams
    });
  }
}

