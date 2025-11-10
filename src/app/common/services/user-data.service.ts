import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import { BaseService } from './base.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserDataService extends BaseService<User> {
  constructor(http: HttpClient) {
    super(http, 'users');
  }
  
  // Có thể thêm các phương thức đặc thù cho user tại đây nếu cần
  getMe() {
    return this.getById('me');
  }

  updateProfile(profileData: Partial<User>): Observable<any> {
    return this.http.put(`${environment.apiUrl}/users/me/profile`, profileData);
  }

  searchBasic(query: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/users/search-basic`, {
      params: { q: query }
    });
  }

  
}
