import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface QAQuestionItem {
  id: number;
  classId: number;
  authorId: number;
  content: string;
  upvotesCount: number;
  isAnswered: boolean;
  createdAt: string;
  hasUpvoted?: boolean;
  author?: {
    id: number;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class QAService {
  private apiUrl = 'http://localhost:5000/api/qa';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getQuestions(classId: number): Observable<{ questions: QAQuestionItem[] }> {
    return this.http.get<{ questions: QAQuestionItem[] }>(`${this.apiUrl}/class/${classId}`, this.authService.getHeaders());
  }

  createQuestion(classId: number, content: string): Observable<{ message: string; question: QAQuestionItem }> {
    return this.http.post<{ message: string; question: QAQuestionItem }>(`${this.apiUrl}/class/${classId}`, { content }, this.authService.getHeaders());
  }

  toggleUpvote(questionId: number): Observable<{ message: string; questionId: number; upvotesCount: number; hasUpvoted: boolean }> {
    return this.http.post<{ message: string; questionId: number; upvotesCount: number; hasUpvoted: boolean }>(`${this.apiUrl}/${questionId}/upvote`, {}, this.authService.getHeaders());
  }

  toggleAnswered(questionId: number): Observable<{ message: string; question: QAQuestionItem }> {
    return this.http.post<{ message: string; question: QAQuestionItem }>(`${this.apiUrl}/${questionId}/toggle-answered`, {}, this.authService.getHeaders());
  }

  deleteQuestion(questionId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${questionId}`, this.authService.getHeaders());
  }
}
