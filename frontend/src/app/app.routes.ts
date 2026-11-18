import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login.component';
import { DashboardComponent } from './pages/dashboard.component';
import { ClassDetailComponent } from './pages/class-detail.component';
import { ExamTakeComponent } from './pages/exam-take.component';
import { JoinInviteComponent } from './pages/join-invite.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'classes/:id', component: ClassDetailComponent },
  { path: 'exams/:id/take', component: ExamTakeComponent },
  { path: 'join/:token', component: JoinInviteComponent },
  { path: '**', redirectTo: 'dashboard' }
];
