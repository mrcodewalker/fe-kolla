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
}
