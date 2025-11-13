import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface MeetingResponse {
  id: number;
  title: string;
  description?: string;
  meetingCode: string;
  meetingLink: string;
  createdByName: string;
  createdByEmail: string;
  startTime: string;
  endTime: string;
  roomName: string;
  roomCode: string;
  departmentName: string;
  departmentCode: string;
  membershipStatus: string | null;
  meetingRole: string | null;
  isComingSoon: boolean;
  isExpired: boolean;
}

export interface NotificationItem {
  id: number;
  title?: string;
  content?: string;
  notificationType?: string;
  senderName?: string;
  senderEmail?: string;
  receiverId?: number;
  receiverName?: string;
  receiverEmail?: string;
  meetingId?: number;
  meetingResponse?: MeetingResponse;
  isRead?: boolean;
  createdAt?: string;
  updatedAt?: string;
  read?: boolean; // Keep for backward compatibility
  type?: string; // Keep for backward compatibility
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
  private joinMeetingUrl = 'https://36.50.54.109:8081';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getNotificationsByToken(params: NotificationSearchParams = {}): Observable<NotificationResponse> {
    let httpParams = new HttpParams();
    
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    
    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size.toString());
    }

    return this.http.get<NotificationResponse>(`${this.apiUrl}/users/me`, {
      params: httpParams
    });
  }

  markAsRead(notificationId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${notificationId}/read`, {});
  }

  joinMeeting(meetingLink: string): Observable<any> {
    const token = this.authService.getAuthToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    });

    return this.http.post(`${this.joinMeetingUrl}/${meetingLink}`, {}, {
      headers: headers
    });
  }
}

