import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  provider?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  refreshToken?: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth';

  currentUser = signal<User | null>(this.getStoredUser());
  token = signal<string | null>(localStorage.getItem('classpulse_token'));
  isLoggedIn = computed(() => !!this.currentUser());

  constructor(private http: HttpClient) {}

  private getStoredUser(): User | null {
    const raw = localStorage.getItem('classpulse_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  getHeaders() {
    const tok = this.token();
    return {
      headers: {
        Authorization: tok ? `Bearer ${tok}` : ''
      }
    };
  }

  register(data: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  oauthLogin(provider: string, email: string, firstName: string, lastName: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/oauth-login`, {
      provider,
      email,
      firstName,
      lastName
    }).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  updateProfile(data: { firstName: string; lastName: string; avatarUrl?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile`, data, this.getHeaders()).pipe(
      tap((res: any) => {
        if (res.user) {
          this.currentUser.set(res.user);
          localStorage.setItem('classpulse_user', JSON.stringify(res.user));
        }
      })
    );
  }

  private handleAuthSuccess(res: AuthResponse) {
    if (res.token && res.user) {
      localStorage.setItem('classpulse_token', res.token);
      localStorage.setItem('classpulse_user', JSON.stringify(res.user));
      this.token.set(res.token);
      this.currentUser.set(res.user);
    }
  }

  logout() {
    localStorage.removeItem('classpulse_token');
    localStorage.removeItem('classpulse_user');
    this.token.set(null);
    this.currentUser.set(null);
  }
}
