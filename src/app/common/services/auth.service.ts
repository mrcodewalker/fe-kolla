import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, timer } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthResponse, User } from '../models/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private tokenExpirationTimer: any;
  private readonly TOKEN_KEY = 'access_token';
  private readonly TOKEN_EXPIRATION_KEY = 'access_token_expiration';
  private readonly USER_DATA_KEY = 'user_meta_data';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredUser();
  }

  private loadStoredUser() {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expirationDate = localStorage.getItem(this.TOKEN_EXPIRATION_KEY);
    const userData = localStorage.getItem(this.USER_DATA_KEY);

    if (token && expirationDate && userData) {
      const user: User = JSON.parse(userData);
      const expirationTime = new Date(expirationDate).getTime() - new Date().getTime();
      
      if (expirationTime > 0) {
        this.currentUserSubject.next(user);
        this.autoLogout(expirationTime);
      } else {
        this.logout();
      }
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, {
        email,
      password
    }).pipe(
      tap(response => {
        const expirationDate = new Date(response.tokenExpiration);
        const expirationTime = expirationDate.getTime() - new Date().getTime();
        
        // Store auth data
        localStorage.setItem(this.TOKEN_KEY, response.token);
        localStorage.setItem(this.TOKEN_EXPIRATION_KEY, expirationDate.toISOString());
        localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(this.mapToUser(response)));
        
        // Set current user
        this.currentUserSubject.next(this.mapToUser(response));
        
        // Set auto logout
        this.autoLogout(expirationTime);
      })
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRATION_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
    this.currentUserSubject.next(null);
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    this.router.navigate(['/login']);
  }

  private autoLogout(expirationDuration: number) {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expirationDuration);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expirationDate = localStorage.getItem(this.TOKEN_EXPIRATION_KEY);
    
    if (!token || !expirationDate) {
      return false;
    }
    
    const expirationTime = new Date(expirationDate).getTime() - new Date().getTime();
    if (expirationTime <= 0) {
      this.logout();
      return false;
    }
    
    return !!this.currentUserSubject.value;
  }

  getAuthToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isTokenExpired(): boolean {
    const expiration = localStorage.getItem(this.TOKEN_EXPIRATION_KEY);
    if (!expiration) return true;
    return new Date(expiration) <= new Date();
  }

  private mapToUser(response: AuthResponse): User {
    return response.user;
  }

  getCurrentUserRole(): string | null {
    return this.currentUserSubject.value?.role || null;
  }
  getCurrentUser(): User | null {
    return this.currentUserSubject.value || null;
  }
}