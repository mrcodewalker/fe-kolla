import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserManagementItem {
  id: number;
  email: string;
  name: string;
  imgUrl: string | null;
  department: string;
  position: string;
  role: string;
  userCode: string | null;
  dob: string | null;
  bankName: string | null;
  bankNumber: string | null;
  address: string | null;
  phoneNumber: string | null;
  degree: string;
  active: boolean;
}

export interface UserSearchParams {
  keyword?: string;
  name?: string;
  email?: string;
  userCode?: string;
  phoneNumber?: string;
  identification?: string;
  bankName?: string;
  bankNumber?: string;
  departmentId?: number;
  roleId?: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface UpdateUserRequest {
  id: number;
  email: string;
  name: string;
  imgUrl?: string;
  position?: string;
  userCode?: string;
  dob?: string;
  bankName?: string;
  bankNumber?: string;
  address?: string;
  phoneNumber?: string;
  departmentId?: number;
  roleId?: number;
  degree?: string;
  active: boolean;
}

export interface UserManagementResponse {
  success: boolean;
  data: {
    content: UserManagementItem[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  searchUsers(params: UserSearchParams): Observable<UserManagementResponse> {
    let httpParams = new HttpParams();

    // Add search parameters if they have values
    if (params.keyword && params.keyword.trim()) {
      httpParams = httpParams.set('keyword', params.keyword.trim());
    }
    if (params.name && params.name.trim()) {
      httpParams = httpParams.set('name', params.name.trim());
    }
    if (params.email && params.email.trim()) {
      httpParams = httpParams.set('email', params.email.trim());
    }
    if (params.userCode && params.userCode.trim()) {
      httpParams = httpParams.set('userCode', params.userCode.trim());
    }
    if (params.phoneNumber && params.phoneNumber.trim()) {
      httpParams = httpParams.set('phoneNumber', params.phoneNumber.trim());
    }
    if (params.identification && params.identification.trim()) {
      httpParams = httpParams.set('identification', params.identification.trim());
    }
    if (params.bankName && params.bankName.trim()) {
      httpParams = httpParams.set('bankName', params.bankName.trim());
    }
    if (params.bankNumber && params.bankNumber.trim()) {
      httpParams = httpParams.set('bankNumber', params.bankNumber.trim());
    }
    if (params.departmentId !== undefined && params.departmentId !== null) {
      httpParams = httpParams.set('departmentId', params.departmentId.toString());
    }
    if (params.roleId !== undefined && params.roleId !== null) {
      httpParams = httpParams.set('roleId', params.roleId.toString());
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

    return this.http.get<UserManagementResponse>(`${this.apiUrl}/search`, { params: httpParams });
  }

  updateUser(id: number, user: UpdateUserRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}