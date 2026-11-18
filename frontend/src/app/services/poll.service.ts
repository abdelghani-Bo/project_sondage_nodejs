import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface PollOption {
  id: number;
  text: string;
  votesCount: number;
  orderIndex: number;
}

export interface PollItem {
  id: number;
  title: string;
  description: string;
  type: 'single' | 'multiple';
  isAnonymous: boolean;
  resultsVisibility: 'live' | 'after_close';
  status: 'draft' | 'active' | 'closed';
  closedAt?: string;
  createdAt: string;
  options: PollOption[];
  hasVoted?: boolean;
  mySelectedOptionIds?: number[];
  totalVotes?: number;
  creator?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PollService {
  private apiUrl = 'http://localhost:5000/api/polls';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getClassPolls(classId: number): Observable<{ polls: PollItem[] }> {
    return this.http.get<{ polls: PollItem[] }>(`${this.apiUrl}/class/${classId}`, this.authService.getHeaders());
  }

  createPoll(classId: number, data: {
    title: string;
    description?: string;
    type: 'single' | 'multiple';
    isAnonymous: boolean;
    resultsVisibility: 'live' | 'after_close';
    options: string[];
  }): Observable<{ message: string; poll: PollItem }> {
    return this.http.post<{ message: string; poll: PollItem }>(`${this.apiUrl}/class/${classId}`, data, this.authService.getHeaders());
  }

  vote(pollId: number, optionIds: number | number[]): Observable<{ message: string; poll: PollItem }> {
    return this.http.post<{ message: string; poll: PollItem }>(`${this.apiUrl}/${pollId}/vote`, { optionIds }, this.authService.getHeaders());
  }

  toggleStatus(pollId: number): Observable<{ message: string; poll: PollItem }> {
    return this.http.post<{ message: string; poll: PollItem }>(`${this.apiUrl}/${pollId}/toggle-status`, {}, this.authService.getHeaders());
  }

  deletePoll(pollId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${pollId}`, this.authService.getHeaders());
  }
}
