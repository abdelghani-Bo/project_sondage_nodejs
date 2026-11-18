import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClassService } from '../services/class.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-join-invite',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50">
      <div class="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 text-center shadow-xl">
        
        @if (loading()) {
          <div class="py-8">
            <i class="fa-solid fa-spinner fa-spin text-4xl text-brand-600 mb-4"></i>
            <h3 class="text-base font-bold text-slate-800">Adhésion à la classe en cours...</h3>
            <p class="text-xs text-slate-500 mt-1">Validation de votre lien d'invitation sécurisé.</p>
          </div>
        } @else if (errorMessage()) {
          <div class="py-4">
            <div class="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 text-2xl">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 class="text-base font-bold text-slate-800">Impossible de rejoindre la classe</h3>
            <p class="text-xs text-slate-500 mt-1 mb-6">{{ errorMessage() }}</p>
            <a routerLink="/dashboard" class="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl">
              Retour au tableau de bord
            </a>
          </div>
        } @else {
          <div class="py-4">
            <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-2xl">
              <i class="fa-solid fa-circle-check"></i>
            </div>
            <h3 class="text-base font-bold text-slate-800">Bienvenue dans la classe !</h3>
            <p class="text-xs text-slate-500 mt-1 mb-6">Vous avez rejoint le groupe avec succès.</p>
            <button (click)="goToClass()" class="px-5 py-2.5 bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md">
              Accéder à l'espace de travail
            </button>
          </div>
        }

      </div>
    </div>
  `
})
export class JoinInviteComponent implements OnInit {
  loading = signal(true);
  errorMessage = signal('');
  classId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private classService: ClassService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const token = params['token'];
      if (!this.authService.isLoggedIn()) {
        // Redirect to login first with return URL
        this.router.navigate(['/login']);
        return;
      }

      if (token) {
        this.classService.joinByToken(token).subscribe({
          next: (res) => {
            this.classId = res.classId;
            this.loading.set(false);
            // Automatic redirect after 1.5 seconds
            setTimeout(() => this.goToClass(), 1500);
          },
          error: (err) => {
            this.loading.set(false);
            this.errorMessage.set(err.error?.message || 'Lien invalide ou expiré');
          }
        });
      }
    });
  }

  goToClass() {
    if (this.classId) {
      this.router.navigate(['/classes', this.classId]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
