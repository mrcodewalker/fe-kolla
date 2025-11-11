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
  meeting?: {
    id: number;
    title: string;
    description: string;
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
    membershipStatus: string;
    meetingRole: string;
    isComingSoon: boolean;
    isExpired: boolean;
  };
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

export interface AttendanceLogsSearchParams {
  keyword?: string;   // Search keyword (deviceInfo, ipAddress, location, userName, meetingTitle)
  meetingId?: number; // Meeting ID
  userId?: number;    // User ID
  startDate?: string; // Start date (dd/MM/yyyy HH:mm hoặc dd/MM/yyyy)
  endDate?: string;   // End date (dd/MM/yyyy HH:mm hoặc dd/MM/yyyy)
  isPresent?: boolean; // Present status
  page?: number;      // Page number (0-based), default 0
  size?: number;      // Page size, default 10
  sortBy?: string;    // Sort by field, default joinAt
  sortDirection?: 'asc' | 'desc'; // Sort direction, default desc
}

@Injectable({ providedIn: 'root' })
export class AttendanceLogService {
  private readonly baseUrl = `${environment.apiUrl}/attendance-logs/users/me`;
  private readonly searchUrl = `${environment.apiUrl}/attendance-logs/search`;

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

  /**
   * Search attendance logs with filters
   */
  searchAttendanceLogs(searchParams: AttendanceLogsSearchParams): Observable<AttendanceLogsResponse> {
    let httpParams = new HttpParams();

    // Add search parameters if they have values
    if (searchParams.keyword !== undefined && searchParams.keyword !== null && searchParams.keyword.trim() !== '') {
      httpParams = httpParams.set('keyword', searchParams.keyword.trim());
    }
    if (searchParams.meetingId !== undefined && searchParams.meetingId !== null) {
      httpParams = httpParams.set('meetingId', searchParams.meetingId.toString());
    }
    if (searchParams.userId !== undefined && searchParams.userId !== null) {
      httpParams = httpParams.set('userId', searchParams.userId.toString());
    }
    if (searchParams.startDate !== undefined && searchParams.startDate !== null && searchParams.startDate.trim() !== '') {
      httpParams = httpParams.set('startDate', searchParams.startDate.trim());
    }
    if (searchParams.endDate !== undefined && searchParams.endDate !== null && searchParams.endDate.trim() !== '') {
      httpParams = httpParams.set('endDate', searchParams.endDate.trim());
    }
    if (searchParams.isPresent !== undefined && searchParams.isPresent !== null) {
      httpParams = httpParams.set('isPresent', searchParams.isPresent.toString());
    }
    if (searchParams.page !== undefined && searchParams.page !== null) {
      httpParams = httpParams.set('page', searchParams.page.toString());
    }
    if (searchParams.size !== undefined && searchParams.size !== null) {
      httpParams = httpParams.set('size', searchParams.size.toString());
    }
    if (searchParams.sortBy !== undefined && searchParams.sortBy !== null && searchParams.sortBy.trim() !== '') {
      httpParams = httpParams.set('sortBy', searchParams.sortBy.trim());
    }
    if (searchParams.sortDirection !== undefined && searchParams.sortDirection !== null) {
      httpParams = httpParams.set('sortDirection', searchParams.sortDirection);
    }

    return this.http.get<AttendanceLogsResponse>(this.searchUrl, { params: httpParams });
  }
}


