import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DepartmentItem {
  id: number;
  departmentCode: string;
  departmentName: string;
}

export interface DepartmentSearchParams {
  id?: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
}

export interface UpdateDepartmentRequest {
  name: string;
  description?: string;
}

export interface DepartmentResponse {
  success: boolean;
  message: string;
  data: DepartmentItem[];
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
export class DepartmentService {
  private apiUrl = `${environment.apiUrl}/departments`;

  constructor(private http: HttpClient) {}

  getAllDepartments(): Observable<DepartmentResponse> {
    return this.http.get<DepartmentResponse>(`${this.apiUrl}`);
  }

  getDepartmentById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  searchDepartments(params: DepartmentSearchParams): Observable<DepartmentResponse> {
    let httpParams = new HttpParams();

    // Add search parameters if they have values
    if (params.id !== undefined && params.id !== null) {
      httpParams = httpParams.set('id', params.id.toString());
    }

    // Note: Since the API returns simple array, we handle pagination client-side
    return this.http.get<DepartmentResponse>(`${this.apiUrl}`, { params: httpParams });
  }

  createDepartment(department: CreateDepartmentRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, department);
  }

  updateDepartment(id: number, department: UpdateDepartmentRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, department);
  }

  deleteDepartment(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
