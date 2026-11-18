import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface ClassItem {
  id: number;
  code: string;
  inviteToken: string;
  name: string;
  description: string;
  subject: string;
  bannerUrl: string;
  isLocked: boolean;
  chatLocked: boolean;
  creatorId: number;
  currentUserRole?: 'admin' | 'member';
  isMuted?: boolean;
  membersCount?: number;
  creator?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  memberships?: Array<{
    id: number;
    role: 'admin' | 'member';
    userId: number;
    isMuted?: boolean;
    user?: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ClassService {
  private apiUrl = 'http://localhost:5000/api/classes';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getMyClasses(): Observable<{ classes: ClassItem[] }> {
    return this.http.get<{ classes: ClassItem[] }>(this.apiUrl, this.authService.getHeaders());
  }

  getClassById(classId: number): Observable<{ class: ClassItem }> {
    return this.http.get<{ class: ClassItem }>(`${this.apiUrl}/${classId}`, this.authService.getHeaders());
  }

  createClass(data: { name: string; description?: string; subject?: string; bannerUrl?: string }): Observable<any> {
    return this.http.post(this.apiUrl, data, this.authService.getHeaders());
  }

  joinByCode(code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/join`, { code }, this.authService.getHeaders());
  }

  joinByToken(inviteToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/join/token/${inviteToken}`, {}, this.authService.getHeaders());
  }

  kickMember(classId: number, memberUserId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${classId}/members/${memberUserId}`, this.authService.getHeaders());
  }

  resetClassCode(classId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${classId}/reset-code`, {}, this.authService.getHeaders());
  }

  toggleLock(classId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${classId}/toggle-lock`, {}, this.authService.getHeaders());
  }

  toggleChatLock(classId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${classId}/toggle-chat-lock`, {}, this.authService.getHeaders());
  }

  toggleMemberMute(classId: number, memberUserId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${classId}/members/${memberUserId}/mute`, {}, this.authService.getHeaders());
  }
}
