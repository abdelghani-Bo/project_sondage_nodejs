import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private readonly serverUrl = 'http://localhost:5000';

  constructor() {
    this.connect();
  }

  connect() {
    if (!this.socket) {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true
      });

      this.socket.on('connect', () => {
        // Socket connected
      });
    }
  }

  joinClass(classId: number, userId: number, userName: string) {
    if (this.socket) {
      this.socket.emit('join_class', { classId, userId, userName });
    }
  }

  leaveClass(classId: number, userId: number, userName: string) {
    if (this.socket) {
      this.socket.emit('leave_class', { classId, userId, userName });
    }
  }

  joinExamMonitor(examId: number) {
    if (this.socket) {
      this.socket.emit('join_exam_monitor', { examId });
    }
  }

  onEvent<T>(eventName: string): Observable<T> {
    return new Observable<T>(observer => {
      if (!this.socket) {
        this.connect();
      }

      const handler = (data: T) => {
        observer.next(data);
      };

      this.socket?.on(eventName, handler);

      return () => {
        this.socket?.off(eventName, handler);
      };
    });
  }

  emit(eventName: string, data: any) {
    if (this.socket) {
      this.socket.emit(eventName, data);
    }
  }
}
