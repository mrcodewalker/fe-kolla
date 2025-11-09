import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
export class HomeService extends BaseService<User> {
  constructor(http: HttpClient) {
    super(http, 'users');
  }

  getCurrentUser() {
    return this.http.get<User>(`${this.apiUrl}/me`);
  }
}
