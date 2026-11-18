import { Component, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <header class="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Logo & Brand -->
        <div class="flex items-center gap-4">
          <a routerLink="/dashboard" class="flex items-center gap-2.5 group">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <i class="fa-solid fa-bolt-lightning text-lg"></i>
            </div>
            <div>
              <span class="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-brand-900 to-indigo-950 bg-clip-text text-transparent">
                Class<span class="text-brand-600">Pulse</span>
              </span>
              <span class="hidden sm:inline-block ml-2 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                Live & Exam
              </span>
            </div>
          </a>
        </div>

        <!-- Right Side Nav -->
        <div class="flex items-center gap-3">
          @if (authService.currentUser(); as user) {
            
            <!-- Profile & Menu Button -->
            <button 
              (click)="openProfileModal()" 
              class="flex items-center gap-2.5 p-1.5 rounded-2xl hover:bg-slate-100 transition group border border-slate-100">
              <img 
                [src]="user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.email" 
                alt="Avatar" 
                class="w-8 h-8 rounded-full border-2 border-brand-200 group-hover:border-brand-500 transition object-cover" />
              <div class="hidden sm:block text-left text-xs">
                <p class="font-bold text-slate-800 leading-tight flex items-center gap-1">
                  {{ user.firstName }} {{ user.lastName }}
                  <i class="fa-solid fa-gear text-[10px] text-slate-400 group-hover:text-brand-600 transition"></i>
                </p>
                <p class="text-slate-400 text-[11px] truncate max-w-[130px]">{{ user.email }}</p>
              </div>
            </button>

            <!-- Logout Button -->
            <button 
              (click)="logout()" 
              title="Déconnexion"
              class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-slate-100">
              <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </button>

          } @else {
            <a routerLink="/login" class="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition">
              Connexion
            </a>
          }
        </div>
      </div>
    </header>

    <!-- Comprehensive Account Configuration Modal -->
    @if (isProfileOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
                <i class="fa-solid fa-user-gear text-brand-600"></i> Configuration du Compte
              </h3>
              <p class="text-xs text-slate-500">Personnalisez votre photo de profil, vos informations et votre sécurité</p>
            </div>
            <button (click)="isProfileOpen.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          @if (saveSuccessMessage()) {
            <div class="my-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <i class="fa-solid fa-circle-check text-base"></i>
              <span>{{ saveSuccessMessage() }}</span>
            </div>
          }

          @if (saveErrorMessage()) {
            <div class="my-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <i class="fa-solid fa-circle-exclamation text-base"></i>
              <span>{{ saveErrorMessage() }}</span>
            </div>
          }

          <form (ngSubmit)="saveProfile()" class="mt-4 space-y-6">
            
            <!-- Avatar Section -->
            <div class="text-center p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div class="relative inline-block mx-auto mb-3">
                <img 
                  [src]="profileAvatar" 
                  alt="Avatar" 
                  class="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-white" />
                
                <label 
                  title="Changer la photo"
                  class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center cursor-pointer shadow-md transition hover:scale-110">
                  <i class="fa-solid fa-camera text-xs"></i>
                  <input type="file" (change)="onAvatarFileSelected($event)" accept="image/*" class="hidden" />
                </label>
              </div>

              <div class="flex flex-wrap justify-center gap-2">
                <button 
                  type="button" 
                  (click)="generateRandomAvatar()"
                  class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5">
                  <i class="fa-solid fa-shuffle text-brand-600"></i> Avatar Aléatoire
                </button>
                <label class="px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-[11px] font-bold text-brand-700 hover:bg-brand-100 cursor-pointer transition flex items-center gap-1.5">
                  <i class="fa-solid fa-upload"></i> Uploader une Photo
                  <input type="file" (change)="onAvatarFileSelected($event)" accept="image/*" class="hidden" />
                </label>
              </div>

              <!-- Preset Avatars -->
              <div class="mt-4 pt-3 border-t border-slate-200/60">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Ou choisir un style prédéfini :</p>
                <div class="flex justify-center gap-2">
                  @for (av of presetAvatars; track av) {
                    <img 
                      [src]="av" 
                      (click)="profileAvatar = av"
                      [class.ring-2]="profileAvatar === av"
                      [class.ring-brand-600]="profileAvatar === av"
                      alt="Preset" 
                      class="w-8 h-8 rounded-full cursor-pointer hover:scale-110 transition bg-white border border-slate-200" />
                  }
                </div>
              </div>
            </div>

            <!-- Identity Fields -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Prénom</label>
                <input 
                  type="text" 
                  [(ngModel)]="profileFirstName" 
                  name="firstName" 
                  required 
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Nom</label>
                <input 
                  type="text" 
                  [(ngModel)]="profileLastName" 
                  name="lastName" 
                  required 
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Adresse Email</label>
              <input 
                type="email" 
                [value]="authService.currentUser()?.email" 
                disabled 
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs sm:text-sm text-slate-500 font-medium cursor-not-allowed" />
            </div>

            <!-- Security: Password Change -->
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 class="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <i class="fa-solid fa-lock text-brand-600"></i> Modifier le mot de passe (optionnel)
              </h4>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Mot de passe actuel</label>
                <input 
                  type="password" 
                  [(ngModel)]="currentPassword" 
                  name="currentPassword" 
                  placeholder="••••••••" 
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 mb-1">Nouveau mot de passe</label>
                  <input 
                    type="password" 
                    [(ngModel)]="newPassword" 
                    name="newPassword" 
                    placeholder="••••••••" 
                    class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 mb-1">Confirmer</label>
                  <input 
                    type="password" 
                    [(ngModel)]="confirmPassword" 
                    name="confirmPassword" 
                    placeholder="••••••••" 
                    class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
            </div>

            <!-- Modal Action Buttons -->
            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                type="button" 
                (click)="isProfileOpen.set(false)" 
                class="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
                Fermer
              </button>
              <button 
                type="submit" 
                [disabled]="isSaving()"
                class="px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-500/20 transition disabled:opacity-50">
                @if (isSaving()) {
                  <i class="fa-solid fa-spinner fa-spin mr-1"></i> Enregistrement...
                } @else {
                  Enregistrer les modifications
                }
              </button>
            </div>

          </form>
        </div>
      </div>
    }
  `
})
export class NavbarComponent {
  isProfileOpen = signal(false);
  isSaving = signal(false);
  saveSuccessMessage = signal('');
  saveErrorMessage = signal('');

  profileFirstName = '';
  profileLastName = '';
  profileAvatar = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80'
  ];

  constructor(public authService: AuthService, private router: Router) {}

  openProfileModal() {
    const user = this.authService.currentUser();
    if (user) {
      this.profileFirstName = user.firstName;
      this.profileLastName = user.lastName;
      this.profileAvatar = user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
    }
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.saveSuccessMessage.set('');
    this.saveErrorMessage.set('');
    this.isProfileOpen.set(true);
  }

  onAvatarFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('L’image est trop volumineuse (maximum 5 Mo).');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileAvatar = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  generateRandomAvatar() {
    const randomSeed = Math.random().toString(36).substring(7);
    this.profileAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
  }

  saveProfile() {
    this.saveSuccessMessage.set('');
    this.saveErrorMessage.set('');

    if (this.newPassword && this.newPassword !== this.confirmPassword) {
      this.saveErrorMessage.set('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }

    this.isSaving.set(true);

    const payload: any = {
      firstName: this.profileFirstName,
      lastName: this.profileLastName,
      avatarUrl: this.profileAvatar
    };

    if (this.newPassword) {
      payload.currentPassword = this.currentPassword;
      payload.newPassword = this.newPassword;
    }

    this.authService.updateProfile(payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.saveSuccessMessage.set('Profil et photo mis à jour avec succès !');
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        setTimeout(() => {
          this.isProfileOpen.set(false);
        }, 1200);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveErrorMessage.set(err.error?.message || 'Erreur lors de la mise à jour du profil.');
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
