import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClassService, ClassItem } from '../services/class.service';
import { ExamService } from '../services/exam.service';
import { AuthService } from '../services/auth.service';

export interface CalendarEvent {
  id: string;
  title: string;
  className: string;
  classId: number;
  type: 'exam' | 'poll' | 'session';
  time: string;
  dateStr: string; // YYYY-MM-DD
  examId?: number;
}

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Top Welcome Banner — 3D Modern Hero -->
      <div class="relative overflow-hidden rounded-3xl text-white p-8 md:p-10 shadow-2xl" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0c1445 70%, #0f172a 100%);">
        <!-- 3D Mesh Background Layers -->
        <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse at 80% 10%, rgba(99,102,241,0.35) 0%, transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(14,165,233,0.25) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 60%);"></div>
        <!-- Subtle Grid Lines for 3D depth -->
        <div class="absolute inset-0 pointer-events-none opacity-10" style="background-image: linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px); background-size: 48px 48px;"></div>
        <!-- Shimmer Orbs -->
        <div class="absolute -top-8 -right-8 w-80 h-80 rounded-full pointer-events-none" style="background: radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 65%); filter: blur(32px);"></div>
        <div class="absolute bottom-0 left-1/3 w-56 h-56 rounded-full pointer-events-none" style="background: radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 65%); filter: blur(28px);"></div>
        <div class="relative z-10 max-w-2xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-brand-200 border border-white/10 mb-4">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Espace de Travail Collaboratif
          </div>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            Bonjour, {{ authService.currentUser()?.firstName }}
            <span class="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
              <i class="fa-solid fa-bolt text-amber-300 text-lg"></i>
            </span>
          </h1>
          <p class="mt-2 text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed">
            Gérez vos cours, participez aux sondages interactifs et préparez vos examens sécurisés par intelligence artificielle.
          </p>

          <!-- Quick Actions -->
          <div class="mt-6 flex flex-wrap gap-3">
            <button 
              (click)="isCreateModalOpen.set(true)"
              class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-brand-500/30 flex items-center gap-2 transition hover:-translate-y-0.5">
              <i class="fa-solid fa-plus"></i> Créer une Classe
            </button>
            <button 
              (click)="isJoinModalOpen.set(true)"
              class="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm backdrop-blur-md border border-white/20 flex items-center gap-2 transition hover:-translate-y-0.5">
              <i class="fa-solid fa-key"></i> Rejoindre avec un Code
            </button>
          </div>
        </div>

      </div>

      <!-- Controls & Toolbar Bar -->
      <div class="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
        
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <!-- Instant Search Bar -->
          <div class="relative flex-1 max-w-md">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
            <input 
              type="text" 
              [ngModel]="searchQuery()" 
              (ngModelChange)="searchQuery.set($event)" 
              placeholder="Rechercher par titre de cours ou matière..." 
              class="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 hover:bg-white transition" />
            
            @if (searchQuery()) {
              <button 
                (click)="searchQuery.set('')" 
                class="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs">
                <i class="fa-solid fa-xmark"></i>
              </button>
            }
          </div>

          <!-- View Mode Switcher (Grille vs Calendrier) -->
          <div class="flex items-center gap-2 self-start md:self-auto">
            <div class="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button 
                (click)="viewMode.set('grid')"
                [class.bg-white]="viewMode() === 'grid'"
                [class.text-brand-600]="viewMode() === 'grid'"
                [class.shadow-sm]="viewMode() === 'grid'"
                class="px-3.5 py-1.5 rounded-xl font-bold text-xs text-slate-500 transition flex items-center gap-1.5">
                <i class="fa-solid fa-grid-2 text-xs"></i> Vue Grille
              </button>
              <button 
                (click)="viewMode.set('calendar')"
                [class.bg-white]="viewMode() === 'calendar'"
                [class.text-brand-600]="viewMode() === 'calendar'"
                [class.shadow-sm]="viewMode() === 'calendar'"
                class="px-3.5 py-1.5 rounded-xl font-bold text-xs text-slate-500 transition flex items-center gap-1.5">
                <i class="fa-solid fa-calendar-days text-xs"></i> Vue Calendrier
              </button>
            </div>
          </div>

        </div>

        <!-- Role Filter Tabs -->
        @if (viewMode() === 'grid') {
          <div class="flex items-center justify-between pt-2 border-t border-slate-100 overflow-x-auto">
            <div class="flex items-center gap-2">
              <button 
                (click)="roleFilter.set('all')"
                [class.bg-slate-900]="roleFilter() === 'all'"
                [class.text-white]="roleFilter() === 'all'"
                [class.bg-slate-100]="roleFilter() !== 'all'"
                [class.text-slate-600]="roleFilter() !== 'all'"
                class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-2 hover:opacity-90">
                <span>Tous les cours</span>
                <span class="px-1.5 py-0.5 rounded-md text-[10px]" [class.bg-white/20]="roleFilter() === 'all'" [class.bg-slate-200]="roleFilter() !== 'all'">
                  {{ classes().length }}
                </span>
              </button>

              <button 
                (click)="roleFilter.set('admin')"
                [class.bg-amber-600]="roleFilter() === 'admin'"
                [class.text-white]="roleFilter() === 'admin'"
                [class.bg-slate-100]="roleFilter() !== 'admin'"
                [class.text-slate-600]="roleFilter() !== 'admin'"
                class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-2 hover:opacity-90">
                <i class="fa-solid fa-crown text-[10px] text-amber-300"></i>
                <span>En tant qu'Enseignant</span>
                <span class="px-1.5 py-0.5 rounded-md text-[10px]" [class.bg-white/20]="roleFilter() === 'admin'" [class.bg-slate-200]="roleFilter() !== 'admin'">
                  {{ teacherClassesCount() }}
                </span>
              </button>

              <button 
                (click)="roleFilter.set('member')"
                [class.bg-emerald-600]="roleFilter() === 'member'"
                [class.text-white]="roleFilter() === 'member'"
                [class.bg-slate-100]="roleFilter() !== 'member'"
                [class.text-slate-600]="roleFilter() !== 'member'"
                class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-2 hover:opacity-90">
                <i class="fa-solid fa-graduation-cap text-[10px] text-emerald-300"></i>
                <span>En tant qu'Étudiant</span>
                <span class="px-1.5 py-0.5 rounded-md text-[10px]" [class.bg-white/20]="roleFilter() === 'member'" [class.bg-slate-200]="roleFilter() !== 'member'">
                  {{ studentClassesCount() }}
                </span>
              </button>
            </div>

            <span class="hidden sm:inline-block text-xs font-semibold text-slate-400">
              {{ filteredClasses().length }} résultat(s)
            </span>
          </div>
        }

      </div>

      <!-- ================= MODE 1: VUE GRILLE DE COURS ================= -->
      @if (viewMode() === 'grid') {
        @if (loading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div *ngFor="let i of [1,2,3]" class="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse h-72"></div>
          </div>
        } @else if (filteredClasses().length === 0) {
          <div class="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 shadow-sm">
            <div class="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 text-2xl">
              <i class="fa-solid fa-search"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800">Aucun cours trouvé</h3>
            <p class="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mt-1 mb-6">
              @if (searchQuery()) {
                Aucun résultat ne correspond à votre recherche "{{ searchQuery() }}".
              } @else {
                Vous n'avez aucun cours correspondant au filtre sélectionné.
              }
            </p>
            @if (searchQuery()) {
              <button (click)="searchQuery.set('')" class="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-brand-700">
                Réinitialiser la recherche
              </button>
            }
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (cls of filteredClasses(); track cls.id; let idx = $index) {

              <!-- Interactive Card - Clickable as a whole -->
              <div 
                (click)="goToClass(cls.id)"
                class="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 hover:border-brand-400 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer transform hover:-translate-y-1.5 relative">
                
                <!-- Dynamic Header Banner with distinct Gradient Overlay -->
                <div class="relative h-44 overflow-hidden bg-slate-900">
                  <img [src]="cls.bannerUrl" alt="Banner" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70" />
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent"></div>
                  
                  <!-- Color Accent Bar on Top — uses inline style to avoid Tailwind purge -->
                  <div class="absolute top-0 inset-x-0 h-1.5" [style]="getPaletteBarStyle(idx)"></div>

                  <!-- Dynamic Role Badge -->
                  <div class="absolute top-3.5 left-3.5">
                    @if (cls.currentUserRole === 'admin') {
                      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30 backdrop-blur-md">
                        <i class="fa-solid fa-crown text-[10px]"></i> Enseignant (Admin)
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30 backdrop-blur-md">
                        <i class="fa-solid fa-graduation-cap text-[10px]"></i> Étudiant (Membre)
                      </span>
                    }
                  </div>

                  <!-- Subject & Members Pill on Banner -->
                  <div class="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white">
                    <span class="text-xs font-bold px-2.5 py-1 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 truncate max-w-[190px]">
                      {{ cls.subject }}
                    </span>
                    <span class="text-[11px] font-semibold flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-xl backdrop-blur-md text-slate-200">
                      <i class="fa-solid fa-users text-xs text-brand-300"></i> {{ cls.membersCount || 1 }}
                    </span>
                  </div>
                </div>

                <!-- Content Body -->
                <div class="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 class="text-lg font-black text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                      {{ cls.name }}
                    </h3>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {{ cls.description || 'Espace de cours collaboratif avec votes en direct, Q&A et examens chronométrés.' }}
                    </p>
                  </div>

                  <!-- Footer with Interactive Copy Code Button -->
                  <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
                    
                    <!-- Code Copy Button with Instant Visual Feedback -->
                    <div class="flex items-center gap-1.5">
                      <button 
                        (click)="copyCode(cls, $event)"
                        title="Copier le code de la classe"
                        [class.bg-emerald-500]="copiedCodeId() === cls.id"
                        [class.text-white]="copiedCodeId() === cls.id"
                        [class.border-emerald-500]="copiedCodeId() === cls.id"
                        [class.bg-slate-100]="copiedCodeId() !== cls.id"
                        [class.text-slate-700]="copiedCodeId() !== cls.id"
                        class="px-2.5 py-1.5 rounded-xl text-xs font-mono font-extrabold border border-slate-200 transition-all flex items-center gap-1.5 hover:border-brand-500">
                        @if (copiedCodeId() === cls.id) {
                          <i class="fa-solid fa-check text-xs"></i>
                          <span>✓ Copié !</span>
                        } @else {
                          <i class="fa-regular fa-copy text-xs text-slate-400"></i>
                          <span>{{ cls.code }}</span>
                        }
                      </button>
                    </div>

                    <!-- Direct Card Entry Arrow -->
                    <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-600 bg-brand-50 group-hover:bg-brand-600 group-hover:text-white transition-all shadow-xs">
                      <span>Accéder</span>
                      <i class="fa-solid fa-arrow-right text-[10px] transform group-hover:translate-x-1 transition-transform"></i>
                    </span>

                  </div>
                </div>

              </div>
            }
          </div>
        }
      }

      <!-- ================= MODE 2: VUE CALENDRIER INTERACTIF ================= -->
      @if (viewMode() === 'calendar') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          
          <!-- Left 2 Cols: Monthly Calendar Grid -->
          <div class="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            
            <!-- Calendar Navigation Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <i class="fa-regular fa-calendar-check text-brand-600"></i>
                  <span>{{ formatMonthYear(currentMonth()) }}</span>
                </h3>
                <p class="text-xs text-slate-400">Planning des examens, sondages et sessions de cours</p>
              </div>

              <!-- Month Nav Buttons -->
              <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
                <button 
                  (click)="prevMonth()" 
                  class="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs shadow-xs transition">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button 
                  (click)="goToToday()" 
                  class="px-3 py-1 text-xs font-bold rounded-xl bg-white text-brand-700 shadow-xs hover:bg-slate-200 transition">
                  Aujourd'hui
                </button>
                <button 
                  (click)="nextMonth()" 
                  class="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs shadow-xs transition">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>

            <!-- Days of Week Header -->
            <div class="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mer</span>
              <span>Jeu</span>
              <span>Ven</span>
              <span>Sam</span>
              <span>Dim</span>
            </div>

            <!-- Calendar Days Cells -->
            <div class="grid grid-cols-7 gap-1 sm:gap-2">
              @for (day of calendarDays(); track day.dateStr) {
                <div 
                  (click)="selectCalendarDate(day)"
                  [class.opacity-30]="!day.isCurrentMonth"
                  [class.bg-brand-50]="day.isSelected"
                  [class.ring-2]="day.isSelected"
                  [class.ring-brand-500]="day.isSelected"
                  [class.border-brand-300]="day.isToday && !day.isSelected"
                  class="min-h-[75px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-2xl border border-slate-100 hover:border-brand-300 cursor-pointer transition flex flex-col justify-between bg-slate-50/40 hover:bg-white group">
                  
                  <!-- Top Day Number & Today Indicator -->
                  <div class="flex items-center justify-between">
                    <span 
                      [class.bg-brand-600]="day.isToday"
                      [class.text-white]="day.isToday"
                      [class.rounded-full]="day.isToday"
                      [class.w-5]="day.isToday"
                      [class.h-5]="day.isToday"
                      class="text-xs font-bold inline-flex items-center justify-center">
                      {{ day.dayNumber }}
                    </span>

                    @if (day.events.length > 0) {
                      <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                    }
                  </div>

                  <!-- Event Badges Preview -->
                  <div class="space-y-1 my-1">
                    @for (ev of day.events.slice(0, 2); track ev.id) {
                      <div 
                        [class.bg-rose-100]="ev.type === 'exam'"
                        [class.text-rose-800]="ev.type === 'exam'"
                        [class.bg-purple-100]="ev.type === 'poll'"
                        [class.text-purple-800]="ev.type === 'poll'"
                        [class.bg-indigo-100]="ev.type === 'session'"
                        [class.text-indigo-800]="ev.type === 'session'"
                        class="text-[9px] font-extrabold px-1.5 py-0.5 rounded truncate leading-tight">
                        {{ ev.title }}
                      </div>
                    }
                    @if (day.events.length > 2) {
                      <span class="text-[8px] font-bold text-slate-400 block text-right">
                        +{{ day.events.length - 2 }} autre(s)
                      </span>
                    }
                  </div>

                </div>
              }
            </div>

          </div>

          <!-- Right Col: Selected Date Events & Details Sidebar -->
          <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h4 class="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {{ formatSelectedDate(selectedDate()) }}
                  </h4>
                  <p class="text-xs text-slate-400">Événements programmés</p>
                </div>
                <span class="text-xs font-bold px-2.5 py-1 rounded-xl bg-brand-50 text-brand-700">
                  {{ selectedDateEvents().length }} événement(s)
                </span>
              </div>

              <!-- Events List for Selected Day -->
              @if (selectedDateEvents().length === 0) {
                <div class="text-center py-12 text-slate-400 space-y-2">
                  <i class="fa-regular fa-calendar-xmark text-3xl text-slate-300"></i>
                  <p class="text-xs">Aucun examen ou session prévu pour cette journée.</p>
                </div>
              } @else {
                <div class="mt-4 space-y-3">
                  @for (ev of selectedDateEvents(); track ev.id) {
                    <div class="p-3.5 rounded-2xl border border-slate-200/80 hover:border-brand-300 transition space-y-2 bg-slate-50/50">
                      
                      <div class="flex items-start justify-between gap-2">
                        <span 
                          [class.bg-rose-100]="ev.type === 'exam'"
                          [class.text-rose-800]="ev.type === 'exam'"
                          [class.bg-purple-100]="ev.type === 'poll'"
                          [class.text-purple-800]="ev.type === 'poll'"
                          [class.bg-indigo-100]="ev.type === 'session'"
                          [class.text-indigo-800]="ev.type === 'session'"
                          class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {{ ev.type === 'exam' ? 'Examen Surveillé' : ev.type === 'poll' ? 'Sondage Actif' : 'Session' }}
                        </span>
                        <span class="text-[11px] font-semibold text-slate-400">{{ ev.time }}</span>
                      </div>

                      <div>
                        <h5 class="text-xs font-bold text-slate-800">{{ ev.title }}</h5>
                        <p class="text-[11px] text-slate-500">{{ ev.className }}</p>
                      </div>

                      <div class="pt-2 border-t border-slate-100 flex justify-end gap-2">
                        @if (ev.type === 'exam' && ev.examId) {
                          <a 
                            [routerLink]="['/exams', ev.examId, 'take']" 
                            class="px-3 py-1 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-[11px] transition shadow-xs">
                            Passer l'épreuve
                          </a>
                        }
                        <a 
                          [routerLink]="['/classes', ev.classId]" 
                          class="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition">
                          Voir la classe
                        </a>
                      </div>

                    </div>
                  }
                </div>
              }
            </div>

            <!-- Calendar Quick Info Card -->
            <div class="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 space-y-1">
              <p class="font-bold flex items-center gap-1.5">
                <i class="fa-solid fa-bell text-indigo-600"></i> Rappel de session
              </p>
              <p class="text-indigo-700/80 leading-relaxed text-[11px]">
                Les examens surveillés requièrent l'activation préalable de la webcam et l'absence totale de sortie d'écran.
              </p>
            </div>

          </div>

        </div>
      }

    </div>

    <!-- Create Class Modal -->
    @if (isCreateModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
              <i class="fa-solid fa-plus-circle text-brand-600"></i> Créer une Nouvelle Classe
            </h3>
            <button (click)="isCreateModalOpen.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form (ngSubmit)="createClass()" class="mt-4 space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nom de la classe *</label>
              <input type="text" [(ngModel)]="newClassName" name="name" required placeholder="Ex : Master Big Data & IA 2026" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Matière / Catégorie</label>
              <input type="text" [(ngModel)]="newClassSubject" name="subject" placeholder="Ex : Informatique, Gestion, Mathématiques" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea [(ngModel)]="newClassDescription" name="description" rows="3" placeholder="Objectifs pédagogiques, consignes..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-2">Bannière thématique</label>
              <div class="grid grid-cols-3 gap-2">
                @for (b of sampleBanners; track b) {
                  <div 
                    (click)="selectedBanner = b"
                    [class.ring-2]="selectedBanner === b"
                    [class.ring-brand-500]="selectedBanner === b"
                    class="h-16 rounded-xl overflow-hidden cursor-pointer border border-slate-200 relative">
                    <img [src]="b" alt="Banner option" class="w-full h-full object-cover" />
                  </div>
                }
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button type="button" (click)="isCreateModalOpen.set(false)" class="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
                Annuler
              </button>
              <button type="submit" [disabled]="!newClassName" class="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md disabled:opacity-50">
                Créer l’espace
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Join Class Modal -->
    @if (isJoinModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
              <i class="fa-solid fa-key text-brand-600"></i> Rejoindre une Classe
            </h3>
            <button (click)="isJoinModalOpen.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form (ngSubmit)="joinClass()" class="mt-4 space-y-4">
            @if (joinError()) {
              <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {{ joinError() }}
              </div>
            }

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Code Alphanumérique</label>
              <input 
                type="text" 
                [(ngModel)]="joinCode" 
                name="code" 
                required 
                placeholder="Ex : CLS-89A4" 
                class="w-full uppercase font-mono tracking-widest text-center px-4 py-3 rounded-xl border border-slate-200 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <p class="text-[11px] text-slate-400 mt-1">Le code est fourni par votre enseignant ou animateur.</p>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button type="button" (click)="isJoinModalOpen.set(false)" class="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
                Annuler
              </button>
              <button type="submit" [disabled]="!joinCode" class="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md disabled:opacity-50">
                Rejoindre
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class DashboardComponent implements OnInit {
  classes = signal<ClassItem[]>([]);
  loading = signal(true);

  // Filters & Search
  searchQuery = signal('');
  roleFilter = signal<'all' | 'admin' | 'member'>('all');
  viewMode = signal<'grid' | 'calendar'>('grid');

  // Copy Code Feedback
  copiedCodeId = signal<number | null>(null);

  // Modals
  isCreateModalOpen = signal(false);
  isJoinModalOpen = signal(false);
  joinCode = '';
  joinError = signal('');

  newClassName = '';
  newClassSubject = '';
  newClassDescription = '';
  selectedBanner = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80';

  sampleBanners = [
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&auto=format&fit=crop&q=80'
  ];

  // Distinct Card Color Palettes
  cardPalettes = [
    { gradient: 'from-blue-600 via-indigo-600 to-indigo-800' },
    { gradient: 'from-emerald-600 via-teal-600 to-teal-800' },
    { gradient: 'from-purple-600 via-fuchsia-600 to-purple-800' },
    { gradient: 'from-amber-500 via-orange-600 to-red-600' },
    { gradient: 'from-cyan-600 via-sky-600 to-blue-800' }
  ];

  // Calendar State
  currentMonth = signal<Date>(new Date());
  selectedDate = signal<Date>(new Date());
  calendarEvents = signal<CalendarEvent[]>([]);

  // Computed counts
  teacherClassesCount = computed(() => {
    return this.classes().filter(c => c.currentUserRole === 'admin').length;
  });

  studentClassesCount = computed(() => {
    return this.classes().filter(c => c.currentUserRole === 'member').length;
  });

  // Filtered Classes computed signal
  filteredClasses = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const role = this.roleFilter();

    return this.classes().filter(cls => {
      // Role filter
      if (role === 'admin' && cls.currentUserRole !== 'admin') return false;
      if (role === 'member' && cls.currentUserRole !== 'member') return false;

      // Search query filter
      if (query) {
        const matchName = cls.name?.toLowerCase().includes(query);
        const matchSubject = cls.subject?.toLowerCase().includes(query);
        const matchCode = cls.code?.toLowerCase().includes(query);
        return matchName || matchSubject || matchCode;
      }

      return true;
    });
  });

  // Calendar Days computed signal
  calendarDays = computed<CalendarDay[]>(() => {
    const curr = this.currentMonth();
    const year = curr.getFullYear();
    const month = curr.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // 0 is Mon

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];
    const allEvents = this.calendarEvents();
    const todayStr = this.formatDateStr(new Date());
    const selectedStr = this.formatDateStr(this.selectedDate());

    // Prev month trailing days
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const date = new Date(year, month - 1, d);
      const dateStr = this.formatDateStr(date);
      days.push({
        date,
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedStr,
        events: allEvents.filter(e => e.dateStr === dateStr)
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = this.formatDateStr(date);
      days.push({
        date,
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedStr,
        events: allEvents.filter(e => e.dateStr === dateStr)
      });
    }

    // Next month leading days to complete 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      const dateStr = this.formatDateStr(date);
      days.push({
        date,
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedStr,
        events: allEvents.filter(e => e.dateStr === dateStr)
      });
    }

    return days;
  });

  // Selected Date Events computed signal
  selectedDateEvents = computed(() => {
    const selectedStr = this.formatDateStr(this.selectedDate());
    return this.calendarEvents().filter(e => e.dateStr === selectedStr);
  });

  constructor(
    public authService: AuthService,
    private classService: ClassService,
    private examService: ExamService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadClasses();
  }

  getPalette(index: number) {
    return this.cardPalettes[index % this.cardPalettes.length];
  }

  getPaletteBarStyle(index: number): string {
    const gradients = [
      'linear-gradient(to right, #2563eb, #4f46e5, #3730a3)',
      'linear-gradient(to right, #059669, #0d9488, #0f766e)',
      'linear-gradient(to right, #9333ea, #c026d3, #7e22ce)',
      'linear-gradient(to right, #f59e0b, #ea580c, #dc2626)',
      'linear-gradient(to right, #0891b2, #0284c7, #1d4ed8)'
    ];
    return `background: ${gradients[index % gradients.length]}`;
  }

  loadClasses() {
    this.loading.set(true);
    this.classService.getMyClasses().subscribe({
      next: (res) => {
        this.classes.set(res.classes);
        this.loading.set(false);
        this.generateCalendarSchedule(res.classes);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  generateCalendarSchedule(classesList: ClassItem[]) {
    const events: CalendarEvent[] = [];
    const today = new Date();

    classesList.forEach((cls, idx) => {
      // 1. Course Session event for today
      const sessionDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      events.push({
        id: `sess_${cls.id}`,
        title: `Session : ${cls.subject}`,
        className: cls.name,
        classId: cls.id,
        type: 'session',
        time: '10:00 - 12:00',
        dateStr: this.formatDateStr(sessionDate)
      });

      // 2. Fetch or schedule Exams for each class
      this.examService.getClassExams(cls.id).subscribe({
        next: (examRes) => {
          if (examRes.exams && examRes.exams.length > 0) {
            examRes.exams.forEach((ex, exIdx) => {
              // Position exams on today or upcoming days
              const examDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (exIdx * 2));
              events.push({
                id: `exam_${ex.id}`,
                title: `Examen : ${ex.title}`,
                className: cls.name,
                classId: cls.id,
                type: 'exam',
                time: '14:30 - 15:30',
                dateStr: this.formatDateStr(examDate),
                examId: ex.id
              });
            });
            this.calendarEvents.set([...events]);
          }
        }
      });

      // 3. Poll Event
      const pollDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      events.push({
        id: `poll_${cls.id}`,
        title: `Sondage en direct`,
        className: cls.name,
        classId: cls.id,
        type: 'poll',
        time: 'Toute la journée',
        dateStr: this.formatDateStr(pollDate)
      });
    });

    this.calendarEvents.set(events);
  }

  goToClass(classId: number) {
    this.router.navigate(['/classes', classId]);
  }

  copyCode(cls: ClassItem, event: MouseEvent) {
    event.stopPropagation();
    navigator.clipboard.writeText(cls.code);
    this.copiedCodeId.set(cls.id);
    setTimeout(() => {
      if (this.copiedCodeId() === cls.id) {
        this.copiedCodeId.set(null);
      }
    }, 2000);
  }

  // Calendar Navigation
  prevMonth() {
    const curr = this.currentMonth();
    this.currentMonth.set(new Date(curr.getFullYear(), curr.getMonth() - 1, 1));
  }

  nextMonth() {
    const curr = this.currentMonth();
    this.currentMonth.set(new Date(curr.getFullYear(), curr.getMonth() + 1, 1));
  }

  goToToday() {
    const today = new Date();
    this.currentMonth.set(new Date(today.getFullYear(), today.getMonth(), 1));
    this.selectedDate.set(today);
  }

  selectCalendarDate(day: CalendarDay) {
    this.selectedDate.set(day.date);
  }

  formatMonthYear(date: Date): string {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  formatSelectedDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  createClass() {
    this.classService.createClass({
      name: this.newClassName,
      subject: this.newClassSubject,
      description: this.newClassDescription,
      bannerUrl: this.selectedBanner
    }).subscribe({
      next: () => {
        this.isCreateModalOpen.set(false);
        this.newClassName = '';
        this.newClassDescription = '';
        this.loadClasses();
      }
    });
  }

  joinClass() {
    this.joinError.set('');
    this.classService.joinByCode(this.joinCode).subscribe({
      next: () => {
        this.isJoinModalOpen.set(false);
        this.joinCode = '';
        this.loadClasses();
      },
      error: (err) => {
        this.joinError.set(err.error?.message || 'Code de classe invalide');
      }
    });
  }
}
