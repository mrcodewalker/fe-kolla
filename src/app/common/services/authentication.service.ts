import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  departmentId: number;
  roleId: number;
}

export interface RegisterResponse {
  id: number;
  email: string;
  name: string;
  imgUrl?: string | null;
  department?: string;
  position?: string;
  role?: string;
  userCode?: string | null;
  dob?: string | null;
  bankName?: string | null;
  bankNumber?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  degree?: string;
  active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Register a new user
   * @param registerData - The registration data
   * @returns Observable<RegisterResponse>
   */
  register(registerData: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`, registerData);
  }
}