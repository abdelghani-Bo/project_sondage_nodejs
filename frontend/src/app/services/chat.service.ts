import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface ChatReaction {
  emoji: string;
  count: number;
  userIds: number[];
}

export interface ChatMessageItem {
  id: number;
  classId: number;
  senderId: number;
  content: string;
  isDeleted: boolean;
  reactions: ChatReaction[];
  createdAt: string;
  sender?: {
    id: number;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:5000/api/messages';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getClassMessages(classId: number): Observable<{ messages: ChatMessageItem[] }> {
    return this.http.get<{ messages: ChatMessageItem[] }>(`${this.apiUrl}/class/${classId}`, this.authService.getHeaders());
  }

  sendMessage(classId: number, content: string): Observable<{ message: string; chatMessage: ChatMessageItem }> {
    return this.http.post<{ message: string; chatMessage: ChatMessageItem }>(`${this.apiUrl}/class/${classId}`, { content }, this.authService.getHeaders());
  }

  addReaction(messageId: number, emoji: string): Observable<{ message: string; chatMessage: ChatMessageItem }> {
    return this.http.post<{ message: string; chatMessage: ChatMessageItem }>(`${this.apiUrl}/${messageId}/reaction`, { emoji }, this.authService.getHeaders());
  }

  deleteMessage(messageId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${messageId}`, this.authService.getHeaders());
  }
}
