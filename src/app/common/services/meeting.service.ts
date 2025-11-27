import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Meeting } from '../models/meeting.model';
import { BaseService } from './base.service';

@Injectable({ providedIn: 'root' })
export class MeetingService extends BaseService<Meeting> {
  getMeetingsByTimeRange(start: string, end: string) {
    return this.http.get<any>(`${this.apiUrl}/time-range`, {
      params: { start, end }
    });
  }
  override create(payload: any) {
    return this.http.post<any>(`${this.apiUrl}`, payload);
  }
  constructor(http: HttpClient) {
    super(http, 'meetings');
  }

  getMeetingsByRoom(
    roomId: number | string
  ) {
    return this.http.get<any>(`${this.apiUrl}/room/${roomId}`, {
      params: {
        
      },
    });
  }

  /**
   * Search meetings with multiple query params
   * @param params object chứa các trường:
   *  - keyword, title, description, createdBy, roomId, startTime, endTime, startDate, endDate, isRecording, page, size, sortBy, sortDirection
   */
  searchMeeting(params: {
    keyword?: string;
    title?: string;
    description?: string;
    createdBy?: number;
    roomId?: number;
    startTime?: string;
    endTime?: string;
    startDate?: string;
    endDate?: string;
    isRecording?: boolean;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    // Xây dựng object params chỉ chứa các trường có giá trị
    const queryParams: any = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = value;
      }
    });
    return this.http.get<any>(`${this.apiUrl}/search`, { params: queryParams });
  }

  /**
   * Update isMeeting status to true
   * @param id Meeting ID
   */
  updateIsMeeting(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/is-meeting`, {});
  }

  getMemberMeetingStats(params: { startDate?: string; endDate?: string }) {
    let httpParams = new HttpParams();

    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }

    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }

    return this.http.get<any>(`${this.apiUrl}/stats/members`, {
      params: httpParams
    });
  }

  /**
   * Get daily meeting stats for charting
   * @param params startDate, endDate (format: dd/MM/yyyy) or days preset
   */
  getDailyMeetingStats(params: { startDate?: string; endDate?: string; days?: number }) {
    let httpParams = new HttpParams();

    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }

    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }

    if (params.days) {
      httpParams = httpParams.set('days', params.days.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/stats/daily`, {
      params: httpParams
    });
  }
}
