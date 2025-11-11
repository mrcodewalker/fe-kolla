import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  
}
