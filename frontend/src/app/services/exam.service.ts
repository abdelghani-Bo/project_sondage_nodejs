import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface ExamOption {
  id?: number;
  optionText: string;
  isCorrect?: boolean;
  orderIndex?: number;
}

export interface ExamQuestion {
  id?: number;
  questionText: string;
  explanation?: string;
  points: number;
  orderIndex?: number;
  options: ExamOption[];
}

export interface ExamItem {
  id: number;
  title: string;
  description: string;
  timePerQuestionSeconds: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  requireWebcam: boolean;
  maxTabSwitchWarnings: number;
  status: 'draft' | 'published' | 'active' | 'ended';
  theme?: string;
  difficulty?: string;
  totalQuestions?: number;
  creator?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  myAttempt?: {
    id: number;
    score: number;
    status: 'in_progress' | 'completed' | 'disqualified_anti_cheat';
    correctAnswersCount: number;
    totalQuestions: number;
    tabSwitchCount: number;
    submittedAt?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private apiUrl = 'http://localhost:5000/api/exams';

  constructor(private http: HttpClient, private authService: AuthService) {}

  generateQuestionsAI(data: { theme: string; difficulty: string; count: number; textContent?: string; file?: File }): Observable<{ message: string; questions: ExamQuestion[] }> {
    const formData = new FormData();
    formData.append('theme', data.theme);
    formData.append('difficulty', data.difficulty);
    formData.append('count', data.count.toString());
    if (data.textContent) {
      formData.append('textContent', data.textContent);
    }
    if (data.file) {
      formData.append('document', data.file);
    }

    const headers = this.authService.getHeaders().headers;
    return this.http.post<{ message: string; questions: ExamQuestion[] }>(`${this.apiUrl}/ai/generate`, formData, { headers });
  }

  createExam(classId: number, data: any): Observable<{ message: string; exam: any }> {
    return this.http.post<{ message: string; exam: any }>(`${this.apiUrl}/class/${classId}`, data, this.authService.getHeaders());
  }

  getClassExams(classId: number): Observable<{ exams: ExamItem[] }> {
    return this.http.get<{ exams: ExamItem[] }>(`${this.apiUrl}/class/${classId}`, this.authService.getHeaders());
  }

  getExamForTaking(examId: number): Observable<{ exam: any; attempt: any }> {
    return this.http.get<{ exam: any; attempt: any }>(`${this.apiUrl}/${examId}/take`, this.authService.getHeaders());
  }

  submitQuestionAnswer(attemptId: number, data: { questionId: number; selectedOptionId: number | null; timeSpentSeconds: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/attempts/${attemptId}/answer`, data, this.authService.getHeaders());
  }

  recordSecurityEvent(attemptId: number, data: { type: string; details?: string; snapshotUrl?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/attempts/${attemptId}/security-event`, data, this.authService.getHeaders());
  }

  finishExam(attemptId: number): Observable<{ message: string; attempt: any }> {
    return this.http.post<{ message: string; attempt: any }>(`${this.apiUrl}/attempts/${attemptId}/finish`, {}, this.authService.getHeaders());
  }

  getMyAttemptReview(attemptId: number): Observable<{ attempt: any }> {
    return this.http.get<{ attempt: any }>(`${this.apiUrl}/attempts/${attemptId}/review`, this.authService.getHeaders());
  }

  getTeacherResults(examId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${examId}/teacher-results`, this.authService.getHeaders());
  }

  exportCSVUrl(examId: number): string {
    const token = this.authService.token();
    return `${this.apiUrl}/${examId}/export-csv?token=${token}`;
  }
}
