import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentEditLog {
  id: number;
  meetingId: number;
  meetingTitle: string;
  editedById: number;
  editedByName: string;
  editedAt: string;
  changeSummary: string;
}

export interface DocumentEditLogSearchParams {
  keyword?: string;
  meetingId?: number;
  editedById?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface DocumentEditLogSearchResponse {
  success: boolean;
  message?: string;
  data?: {
    content: DocumentEditLog[];
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

export interface CreateDocumentEditLogRequest {
  meetingId: number;
  changeSummary: string;
}

export interface CreateDocumentEditLogResponse {
  success: boolean;
  message?: string;
  data?: DocumentEditLog;
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
export class DocumentEditLogService {
  private readonly endpoint = `${environment.apiUrl}/document-edit-logs`;

  constructor(private http: HttpClient) {}

  searchDocumentEditLogs(
    params: DocumentEditLogSearchParams
  ): Observable<DocumentEditLogSearchResponse> {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value as any);
      }
    });

    return this.http.get<DocumentEditLogSearchResponse>(
      `${this.endpoint}/search`,
      { params: httpParams }
    );
  }

  createDocumentEditLog(
    request: CreateDocumentEditLogRequest
  ): Observable<CreateDocumentEditLogResponse> {
    return this.http.post<CreateDocumentEditLogResponse>(
      this.endpoint,
      request
    );
  }
}

