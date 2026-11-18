import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-brand-50/20 to-indigo-50/30">
      <div class="max-w-md w-full">
        
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-xl shadow-brand-500/25 mb-4 transform hover:scale-105 transition-transform">
            <i class="fa-solid fa-bolt-lightning text-2xl"></i>
          </div>
          <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">
            Bienvenue sur <span class="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">ClassPulse</span>
          </h2>
          <p class="mt-2 text-sm text-slate-500">
            Plateforme collaborative de sondages, votes et examens surveillés
          </p>
        </div>

        <!-- Main Auth Card -->
        <div class="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">
          
          <!-- Tabs -->
          <div class="flex p-1 bg-slate-100 rounded-2xl mb-6">
            <button 
              type="button"
              (click)="isRegister.set(false)"
              [class.bg-white]="!isRegister()"
              [class.shadow-sm]="!isRegister()"
              [class.text-slate-900]="!isRegister()"
              class="flex-1 py-2.5 text-xs font-bold rounded-xl text-slate-500 transition">
              Se connecter
            </button>
            <button 
              type="button"
              (click)="isRegister.set(true)"
              [class.bg-white]="isRegister()"
              [class.shadow-sm]="isRegister()"
              [class.text-slate-900]="isRegister()"
              class="flex-1 py-2.5 text-xs font-bold rounded-xl text-slate-500 transition">
              Créer un compte
            </button>
          </div>

          <!-- Error Alert -->
          @if (errorMessage()) {
            <div class="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <i class="fa-solid fa-circle-exclamation text-base"></i>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <!-- Form -->
          <form (ngSubmit)="submitForm()" class="space-y-4">
            @if (isRegister()) {
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Prénom</label>
                  <input type="text" [(ngModel)]="firstName" name="firstName" required placeholder="Jean" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Nom</label>
                  <input type="text" [(ngModel)]="lastName" name="lastName" required placeholder="Dupont" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
            }

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Adresse Email</label>
              <div class="relative">
                <i class="fa-regular fa-envelope absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
                <input type="email" [(ngModel)]="email" name="email" required placeholder="exemple@domaine.com" class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Mot de passe</label>
              <div class="relative">
                <i class="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
                <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••" class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            <button 
              type="submit" 
              [disabled]="loading()"
              class="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 shadow-md shadow-brand-500/25 transition disabled:opacity-50">
              @if (loading()) {
                <i class="fa-solid fa-spinner fa-spin mr-2"></i> Traitement en cours...
              } @else {
                {{ isRegister() ? 'S’inscrire gratuitement' : 'Connexion à ClassPulse' }}
              }
            </button>
          </form>

          <!-- OAuth2 Divider -->
          <div class="relative my-6 text-center">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <span class="relative px-3 bg-white text-xs text-slate-400 font-medium">Ou continuer avec</span>
          </div>

          <!-- OAuth2 Buttons (Google & Microsoft) -->
          <div class="grid grid-cols-2 gap-3">
            <button 
              type="button" 
              (click)="oauthDemo('google')"
              class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-xs font-semibold text-slate-700">
              <i class="fa-brands fa-google text-red-500 text-sm"></i> Google
            </button>
            <button 
              type="button" 
              (click)="oauthDemo('microsoft')"
              class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-xs font-semibold text-slate-700">
              <i class="fa-brands fa-microsoft text-blue-500 text-sm"></i> Microsoft
            </button>
          </div>

        </div>

      </div>
    </div>
  `
})
export class LoginComponent {
  isRegister = signal(false);
  loading = signal(false);
  errorMessage = signal('');

  email = '';
  password = '';
  firstName = '';
  lastName = '';

  constructor(private authService: AuthService, private router: Router) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  submitForm() {
    this.errorMessage.set('');
    this.loading.set(true);

    if (this.isRegister()) {
      this.authService.register({
        email: this.email,
        password: this.password,
        firstName: this.firstName,
        lastName: this.lastName
      }).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.message || 'Erreur lors de l’inscription');
        }
      });
    } else {
      this.authService.login({
        email: this.email,
        password: this.password
      }).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.message || 'Identifiants invalides');
        }
      });
    }
  }

  oauthDemo(provider: string) {
    this.loading.set(true);
    const mockEmail = provider === 'google' ? 'utilisateur.google@univ.fr' : 'utilisateur.microsoft@school.org';
    const first = provider === 'google' ? 'Karim' : 'Sophie';
    const last = provider === 'google' ? 'Benali' : 'Lambert';

    this.authService.oauthLogin(provider, mockEmail, first, last).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur OAuth');
      }
    });
  }
}
