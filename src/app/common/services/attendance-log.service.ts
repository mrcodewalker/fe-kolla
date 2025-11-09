import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AttendanceLogItem {
  id: number;
  userName: string;
  userEmail: string;
  leaveAt: string;
  joinAt: string;
  ipAddress: string;
  deviceInfo: string;
  location: string;
  present: boolean;
}

export interface AttendanceLogsResponse {
  success: boolean;
  message: string;
  data: {
    content: AttendanceLogItem[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
  };
}

export interface AttendanceLogsQuery {
  ip?: string;
  startDate?: string; // dd/MM/yyyy or dd/MM/yyyy HH:mm
  endDate?: string;   // dd/MM/yyyy or dd/MM/yyyy HH:mm
  page?: number;      // 0-based
  size?: number;
  sortBy?: string;    // field
  sortDirection?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class AttendanceLogService {
  private readonly baseUrl = `${environment.apiUrl}/attendance-logs/users/me`;

  constructor(private http: HttpClient) {}

  getMyAttendanceLogs(query: AttendanceLogsQuery): Observable<AttendanceLogsResponse> {
    let params = new HttpParams();
    if (query.ip) params = params.set('ip', query.ip);
    if (query.startDate) params = params.set('startDate', query.startDate);
    if (query.endDate) params = params.set('endDate', query.endDate);
    if (query.page !== undefined) params = params.set('page', String(query.page));
    if (query.size !== undefined) params = params.set('size', String(query.size));
    if (query.sortBy) params = params.set('sortBy', query.sortBy);
    if (query.sortDirection) params = params.set('sortDirection', query.sortDirection);

    return this.http.get<AttendanceLogsResponse>(this.baseUrl, { params });
  }
}


