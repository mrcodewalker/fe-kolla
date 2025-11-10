import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserSessionItem {
  id: number;
  deviceInfo: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  action: string;
  userId: number;
  userName: string;
  userEmail: string;
  active: boolean;
}

export interface UserSessionResponse {
  success: boolean;
  message: string;
  data: {
    content: UserSessionItem[];
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

export interface UserSessionSearchParams {
  keyword?: string;   // Search keyword (deviceInfo, ipAddress, location, action, userName, userEmail)
  userId?: number;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
  action?: string;
  isActive?: boolean;
  startDate?: string; // dd/MM/yyyy HH:mm hoặc dd/MM/yyyy format
  endDate?: string;   // dd/MM/yyyy HH:mm hoặc dd/MM/yyyy format
  page?: number;      // 0-based, default 0
  size?: number;      // default 10
  sortBy?: string;    // default createdAt
  sortDirection?: 'asc' | 'desc'; // default desc
}

@Injectable({
  providedIn: 'root'
})
export class UserSessionService {
  private apiUrl = `${environment.apiUrl}/user-sessions`;

  constructor(private http: HttpClient) {}

  /**
   * Get all user sessions
   */
  getAllUserSessions(): Observable<UserSessionResponse> {
    return this.http.get<UserSessionResponse>(`${this.apiUrl}`);
  }

  /**
   * Get user session by ID
   */
  getUserSessionById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Search user sessions with filters
   */
  searchUserSessions(params: UserSessionSearchParams): Observable<UserSessionResponse> {
    let httpParams = new HttpParams();

    // Add search parameters if they have values
    if (params.keyword !== undefined && params.keyword !== null && params.keyword.trim() !== '') {
      httpParams = httpParams.set('keyword', params.keyword.trim());
    }
    if (params.userId !== undefined && params.userId !== null) {
      httpParams = httpParams.set('userId', params.userId.toString());
    }
    if (params.deviceInfo !== undefined && params.deviceInfo !== null && params.deviceInfo.trim() !== '') {
      httpParams = httpParams.set('deviceInfo', params.deviceInfo.trim());
    }
    if (params.ipAddress !== undefined && params.ipAddress !== null && params.ipAddress.trim() !== '') {
      httpParams = httpParams.set('ipAddress', params.ipAddress.trim());
    }
    if (params.location !== undefined && params.location !== null && params.location.trim() !== '') {
      httpParams = httpParams.set('location', params.location.trim());
    }
    if (params.action !== undefined && params.action !== null && params.action.trim() !== '') {
      httpParams = httpParams.set('action', params.action.trim());
    }
    if (params.isActive !== undefined && params.isActive !== null) {
      httpParams = httpParams.set('isActive', params.isActive.toString());
    }
    if (params.startDate !== undefined && params.startDate !== null && params.startDate.trim() !== '') {
      httpParams = httpParams.set('startDate', params.startDate.trim());
    }
    if (params.endDate !== undefined && params.endDate !== null && params.endDate.trim() !== '') {
      httpParams = httpParams.set('endDate', params.endDate.trim());
    }
    if (params.page !== undefined && params.page !== null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size !== undefined && params.size !== null) {
      httpParams = httpParams.set('size', params.size.toString());
    }
    if (params.sortBy !== undefined && params.sortBy !== null && params.sortBy.trim() !== '') {
      httpParams = httpParams.set('sortBy', params.sortBy.trim());
    }
    if (params.sortDirection !== undefined && params.sortDirection !== null) {
      httpParams = httpParams.set('sortDirection', params.sortDirection);
    }

    return this.http.get<UserSessionResponse>(`${this.apiUrl}/search`, { params: httpParams });
  }

  /**
   * Get current user's sessions
   */
  getMyUserSessions(params?: UserSessionSearchParams): Observable<UserSessionResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.startDate !== undefined && params.startDate !== null && params.startDate.trim() !== '') {
        httpParams = httpParams.set('startDate', params.startDate.trim());
      }
      if (params.endDate !== undefined && params.endDate !== null && params.endDate.trim() !== '') {
        httpParams = httpParams.set('endDate', params.endDate.trim());
      }
      if (params.isActive !== undefined && params.isActive !== null) {
        httpParams = httpParams.set('isActive', params.isActive.toString());
      }
      if (params.page !== undefined && params.page !== null) {
        httpParams = httpParams.set('page', params.page.toString());
      }
      if (params.size !== undefined && params.size !== null) {
        httpParams = httpParams.set('size', params.size.toString());
      }
      if (params.sortBy !== undefined && params.sortBy !== null && params.sortBy.trim() !== '') {
        httpParams = httpParams.set('sortBy', params.sortBy.trim());
      }
      if (params.sortDirection !== undefined && params.sortDirection !== null) {
        httpParams = httpParams.set('sortDirection', params.sortDirection);
      }
    }

    return this.http.get<UserSessionResponse>(`${this.apiUrl}/me`, { params: httpParams });
  }

  /**
   * Terminate a user session (admin only)
   */
  terminateUserSession(sessionId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${sessionId}`);
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/active/count`);
  }

  /**
   * Get user sessions by meeting ID
   */
  getUserSessionsByMeeting(meetingId: number, params?: UserSessionSearchParams): Observable<UserSessionResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.page !== undefined && params.page !== null) {
        httpParams = httpParams.set('page', params.page.toString());
      }
      if (params.size !== undefined && params.size !== null) {
        httpParams = httpParams.set('size', params.size.toString());
      }
      if (params.sortBy !== undefined && params.sortBy !== null && params.sortBy.trim() !== '') {
        httpParams = httpParams.set('sortBy', params.sortBy.trim());
      }
      if (params.sortDirection !== undefined && params.sortDirection !== null) {
        httpParams = httpParams.set('sortDirection', params.sortDirection);
      }
    }

    return this.http.get<UserSessionResponse>(`${this.apiUrl}/meeting/${meetingId}`, { params: httpParams });
  }
}