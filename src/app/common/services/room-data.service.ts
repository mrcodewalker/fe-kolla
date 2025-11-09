import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BaseService } from './base.service';
import { Room } from '../models/room.model'; // Đảm bảo có file này

@Injectable({
  providedIn: 'root'
})
export class RoomDataService extends BaseService<Room> {
  getRoomSchedule(params: any) {
    return this.http.get<any>(`${this.apiUrl}/schedule`, { params });
  }

  searchRooms(params: {
    keyword?: string;
    departmentId?: number;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    let httpParams = new HttpParams();
    if (params.keyword) {
      httpParams = httpParams.set('keyword', params.keyword);
    }
    if (params.departmentId !== undefined && params.departmentId !== null) {
      httpParams = httpParams.set('departmentId', String(params.departmentId));
    }
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.size !== undefined) {
      httpParams = httpParams.set('size', String(params.size));
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortDirection) {
      httpParams = httpParams.set('sortDirection', params.sortDirection);
    }
    return this.http.get<any>(`${this.apiUrl}`, { params: httpParams });
  }
  constructor(http: HttpClient) {
    super(http, 'rooms');
  }
}