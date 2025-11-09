import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MemberSearchParams {
  keyword?: string;
  userId?: number;
  meetingId?: number;
  roleId?: number;
  isActive?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface MemberItem {
  id: number;
  userId: number;
  userEmail: string;
  name: string;
  meetingId: number;
  meetingTitle: string;
  meetingCode: string;
  roleName: string;
  roleId: number;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface MemberSearchResponse {
  success: boolean;
  message: string;
  data: {
    content: Array<{
      members: MemberItem[];
      pendingCount: number;
      joinedCount: number;
    }>;
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

@Injectable({
  providedIn: 'root'
})
export class ApproveService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  searchMembers(params: MemberSearchParams): Observable<MemberSearchResponse> {
    let httpParams = new HttpParams();

    // Add search parameters if they have values
    if (params.keyword && params.keyword.trim()) {
      httpParams = httpParams.set('keyword', params.keyword.trim());
    }
    if (params.userId !== undefined && params.userId !== null) {
      httpParams = httpParams.set('userId', params.userId.toString());
    }
    if (params.meetingId !== undefined && params.meetingId !== null) {
      httpParams = httpParams.set('meetingId', params.meetingId.toString());
    }
    if (params.roleId !== undefined && params.roleId !== null) {
      httpParams = httpParams.set('roleId', params.roleId.toString());
    }
    if (params.isActive !== undefined && params.isActive !== null) {
      httpParams = httpParams.set('isActive', params.isActive.toString());
    }

    // Pagination parameters with defaults
    httpParams = httpParams.set('page', (params.page || 0).toString());
    httpParams = httpParams.set('size', (params.size || 10).toString());
    httpParams = httpParams.set('sortBy', params.sortBy || 'createdAt');
    httpParams = httpParams.set('sortDirection', params.sortDirection || 'desc');

    return this.http.get<MemberSearchResponse>(`${this.apiUrl}/members/search`, { params: httpParams });
  }
}