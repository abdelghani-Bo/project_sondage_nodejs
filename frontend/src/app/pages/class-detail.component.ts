import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ClassService, ClassItem } from '../services/class.service';
import { PollService, PollItem } from '../services/poll.service';
import { QAService, QAQuestionItem } from '../services/qa.service';
import { ChatService, ChatMessageItem } from '../services/chat.service';
import { ExamService, ExamItem, ExamQuestion } from '../services/exam.service';
import { SocketService } from '../services/socket.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-class-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 pb-16">
      
      <!-- Top Banner Header -->
      <div class="relative bg-slate-900 text-white">
        <div class="h-56 sm:h-64 w-full overflow-hidden relative">
          <img [src]="classData()?.bannerUrl" alt="Class Banner" class="w-full h-full object-cover opacity-40 blur-xs" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-28 relative z-10 pb-6">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
            
            <!-- Class Info -->
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-500/90 text-white backdrop-blur-md">
                  {{ classData()?.subject }}
                </span>
                @if (isAdmin()) {
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white flex items-center gap-1">
                    <i class="fa-solid fa-crown text-[10px]"></i> Administrateur (Enseignant)
                  </span>
                } @else {
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white flex items-center gap-1">
                    <i class="fa-solid fa-graduation-cap text-[10px]"></i> Participant
                  </span>
                }
              </div>
              <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                {{ classData()?.name }}
              </h1>
              <p class="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl line-clamp-2">
                {{ classData()?.description || 'Espace collaboratif en temps réel pour sondages, questions et évaluations sécurisées.' }}
              </p>
            </div>

            <!-- Code & Invitation Card -->
            <div class="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl">
              <div>
                <p class="text-[10px] uppercase font-bold text-slate-300">Code d’accès</p>
                <span class="font-mono text-base font-extrabold text-brand-300 tracking-wider">
                  {{ classData()?.code }}
                </span>
              </div>
              <button 
                (click)="copyCode()" 
                title="Copier le code"
                class="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition">
                <i class="fa-regular fa-copy mr-1"></i> Copier code
              </button>
              <button 
                (click)="copyInviteLink()" 
                title="Copier le lien d’invitation direct"
                class="px-2.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition">
                <i class="fa-solid fa-link mr-1"></i> Lien d'invitation
              </button>
            </div>

          </div>

          <!-- Admin Quick Bar -->
          @if (isAdmin()) {
            <div class="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-3 text-xs">
              <span class="font-bold text-amber-300 flex items-center gap-1">
                <i class="fa-solid fa-shield-halved"></i> Contrôles Enseignant :
              </span>

              <!-- Silent Mode Chat Toggle -->
              <button 
                (click)="toggleChatLock()"
                [class.bg-rose-600]="classData()?.chatLocked"
                [class.bg-slate-800]="!classData()?.chatLocked"
                class="px-3 py-1.5 rounded-xl text-white font-bold border border-white/20 hover:opacity-90 transition flex items-center gap-1.5">
                <i class="fa-solid" [class.fa-lock]="classData()?.chatLocked" [class.fa-lock-open]="!classData()?.chatLocked"></i>
                {{ classData()?.chatLocked ? 'Mode Silencieux ACTIF (Chat bloqué)' : 'Mode Silencieux (Verrouiller le chat)' }}
              </button>

              <!-- Lock Registrations Toggle -->
              <button 
                (click)="toggleRegistrationLock()"
                class="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 border border-white/20 hover:bg-slate-700 transition flex items-center gap-1.5">
                <i class="fa-solid fa-user-lock"></i>
                {{ classData()?.isLocked ? 'Ouvrir les inscriptions' : 'Verrouiller les inscriptions' }}
              </button>

              <!-- Reset Access Code -->
              <button 
                (click)="resetCode()"
                class="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 border border-white/20 hover:bg-slate-700 transition flex items-center gap-1.5">
                <i class="fa-solid fa-rotate"></i> Régénérer le code
              </button>
            </div>
          }

        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav class="flex space-x-2 sm:space-x-8 overflow-x-auto py-2">
            
            <button 
              (click)="activeTab.set('polls')"
              [class.text-brand-600]="activeTab() === 'polls'"
              [class.border-brand-600]="activeTab() === 'polls'"
              [class.border-transparent]="activeTab() !== 'polls'"
              class="py-2.5 px-3 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 hover:text-brand-600 transition">
              <i class="fa-solid fa-square-poll-vertical text-base"></i> Sondages & Votes
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">{{ polls().length }}</span>
            </button>

            <button 
              (click)="activeTab.set('qa')"
              [class.text-brand-600]="activeTab() === 'qa'"
              [class.border-brand-600]="activeTab() === 'qa'"
              [class.border-transparent]="activeTab() !== 'qa'"
              class="py-2.5 px-3 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 hover:text-brand-600 transition">
              <i class="fa-solid fa-comments-question-check text-base"></i> Boîte à Questions (Q&A)
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">{{ questions().length }}</span>
            </button>

            <button 
              (click)="activeTab.set('chat')"
              [class.text-brand-600]="activeTab() === 'chat'"
              [class.border-brand-600]="activeTab() === 'chat'"
              [class.border-transparent]="activeTab() !== 'chat'"
              class="py-2.5 px-3 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 hover:text-brand-600 transition">
              <i class="fa-solid fa-message-dots text-base"></i> Messagerie Instantanée
              @if (classData()?.chatLocked) {
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">Silencieux</span>
              }
            </button>

            <button 
              (click)="activeTab.set('exams')"
              [class.text-brand-600]="activeTab() === 'exams'"
              [class.border-brand-600]="activeTab() === 'exams'"
              [class.border-transparent]="activeTab() !== 'exams'"
              class="py-2.5 px-3 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 hover:text-brand-600 transition">
              <i class="fa-solid fa-clipboard-check text-base"></i> Examens Sécurisés & IA
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 font-extrabold">{{ exams().length }}</span>
            </button>

            <button 
              (click)="activeTab.set('members')"
              [class.text-brand-600]="activeTab() === 'members'"
              [class.border-brand-600]="activeTab() === 'members'"
              [class.border-transparent]="activeTab() !== 'members'"
              class="py-2.5 px-3 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 hover:text-brand-600 transition">
              <i class="fa-solid fa-users text-base"></i> Membres ({{ classData()?.memberships?.length || 1 }})
            </button>

          </nav>
        </div>
      </div>

      <!-- Main Body Container -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

        <!-- ================= TAB 1: SONDAGES & VOTES ================= -->
        @if (activeTab() === 'polls') {
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-black text-slate-900 tracking-tight">Sondages & Votes en Direct</h2>
                <p class="text-xs text-slate-500">Votes anonymes ou nominatifs avec mise à jour instantanée des graphiques</p>
              </div>

              @if (isAdmin()) {
                <button 
                  (click)="isCreatePollOpen.set(true)"
                  class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center gap-2 transition">
                  <i class="fa-solid fa-plus"></i> Créer un Sondage
                </button>
              }
            </div>

            <!-- Polls List -->
            @if (polls().length === 0) {
              <div class="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
                <i class="fa-solid fa-square-poll-vertical text-4xl text-slate-300 mb-3"></i>
                <h3 class="font-bold text-slate-700">Aucun sondage actif</h3>
                <p class="text-xs text-slate-400 mt-1">L’enseignant n’a pas encore lancé de vote dans cette classe.</p>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                @for (poll of polls(); track poll.id) {
                  <div class="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition">
                    
                    <div class="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div class="flex items-center gap-2 mb-1">
                          <span 
                            [class.bg-emerald-100]="poll.status === 'active'"
                            [class.text-emerald-800]="poll.status === 'active'"
                            [class.bg-slate-100]="poll.status === 'closed'"
                            [class.text-slate-600]="poll.status === 'closed'"
                            class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            {{ poll.status === 'active' ? 'En cours' : 'Clôturé' }}
                          </span>
                          <span class="text-[11px] font-semibold text-slate-400">
                            {{ poll.type === 'single' ? 'Choix unique (Vote)' : 'Choix multiples (Sondage)' }}
                          </span>
                          @if (poll.isAnonymous) {
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                              <i class="fa-solid fa-user-secret mr-1"></i> Anonyme
                            </span>
                          }
                        </div>
                        <h3 class="text-base font-extrabold text-slate-900">{{ poll.title }}</h3>
                        @if (poll.description) {
                          <p class="text-xs text-slate-500 mt-0.5">{{ poll.description }}</p>
                        }
                      </div>

                      @if (isAdmin()) {
                        <div class="flex items-center gap-1.5">
                          <button 
                            (click)="togglePollStatus(poll)"
                            title="{{ poll.status === 'active' ? 'Clôturer le sondage' : 'Réouvrir le sondage' }}"
                            class="w-7 h-7 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 flex items-center justify-center transition">
                            <i class="fa-solid" [class.fa-lock]="poll.status === 'active'" [class.fa-lock-open]="poll.status === 'closed'"></i>
                          </button>
                          <button 
                            (click)="deletePoll(poll.id)"
                            title="Supprimer"
                            class="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition">
                            <i class="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      }
                    </div>

                    <!-- Options / Results Rendering -->
                    <div class="space-y-2.5 my-4">
                      @for (opt of poll.options; track opt.id) {
                        <div 
                          (click)="selectVoteOption(poll, opt.id)"
                          [class.cursor-pointer]="poll.status === 'active' && !poll.hasVoted"
                          [class.ring-2]="isOptionSelected(poll, opt.id)"
                          [class.ring-brand-500]="isOptionSelected(poll, opt.id)"
                          [class.bg-brand-50]="isOptionSelected(poll, opt.id)"
                          class="relative overflow-hidden rounded-2xl border border-slate-200 p-3.5 transition group">
                          
                          <!-- Progress bar background -->
                          @if (canViewResults(poll)) {
                            <div 
                              class="absolute inset-y-0 left-0 bg-brand-100/60 transition-all duration-700 ease-out"
                              [style.width.%]="getPercentage(opt.votesCount, poll.totalVotes || 0)"></div>
                          }

                          <div class="relative z-10 flex items-center justify-between text-xs">
                            <div class="flex items-center gap-2.5 font-semibold text-slate-800">
                              @if (poll.type === 'single') {
                                <div class="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center" [class.border-brand-600]="isOptionSelected(poll, opt.id)">
                                  @if (isOptionSelected(poll, opt.id)) {
                                    <div class="w-2 h-2 rounded-full bg-brand-600"></div>
                                  }
                                </div>
                              } @else {
                                <div class="w-4 h-4 rounded-md border border-slate-300 flex items-center justify-center" [class.bg-brand-600]="isOptionSelected(poll, opt.id)" [class.border-brand-600]="isOptionSelected(poll, opt.id)">
                                  @if (isOptionSelected(poll, opt.id)) {
                                    <i class="fa-solid fa-check text-[10px] text-white"></i>
                                  }
                                </div>
                              }
                              <span>{{ opt.text }}</span>
                            </div>

                            @if (canViewResults(poll)) {
                              <div class="font-bold text-slate-700 flex items-center gap-2">
                                <span class="text-brand-700">{{ getPercentage(opt.votesCount, poll.totalVotes || 0) }}%</span>
                                <span class="text-slate-400 text-[10px]">({{ opt.votesCount }} votes)</span>
                              </div>
                            }
                          </div>

                        </div>
                      }
                    </div>

                    <!-- Footer Vote Actions -->
                    <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span class="text-slate-500 font-medium">
                        Total : <strong class="text-slate-800">{{ poll.totalVotes || 0 }}</strong> vote(s)
                      </span>

                      @if (poll.status === 'active' && !poll.hasVoted) {
                        <button 
                          (click)="submitVote(poll)"
                          [disabled]="!hasSelectionForPoll(poll.id)"
                          class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-40">
                          Valider mon vote
                        </button>
                      } @else if (poll.hasVoted) {
                        <span class="text-emerald-600 font-bold flex items-center gap-1">
                          <i class="fa-solid fa-circle-check"></i> Votre vote est enregistré
                        </span>
                      } @else {
                        <span class="text-slate-400 font-semibold italic">Ce vote est clôturé</span>
                      }
                    </div>

                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- ================= TAB 2: BOÎTE À QUESTIONS (Q&A) ================= -->
        @if (activeTab() === 'qa') {
          <div class="max-w-4xl mx-auto space-y-6">
            
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-black text-slate-900 tracking-tight">Boîte à Questions Interactive (Q&A)</h2>
                <p class="text-xs text-slate-500">Posez vos questions et votez pour remonter les interrogations clés à l'enseignant</p>
              </div>
            </div>

            <!-- Question Input Box -->
            <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <form (ngSubmit)="askQuestion()" class="flex flex-col sm:flex-row gap-3">
                <div class="relative flex-1">
                  <i class="fa-regular fa-comment-dots absolute left-3.5 top-3.5 text-slate-400"></i>
                  <input 
                    type="text" 
                    [(ngModel)]="newQuestionContent" 
                    name="content" 
                    required 
                    placeholder="Posez une question sur le cours ou l'examen..." 
                    class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <button 
                  type="submit" 
                  [disabled]="!newQuestionContent.trim()"
                  class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition disabled:opacity-40 flex items-center justify-center gap-2">
                  <i class="fa-solid fa-paper-plane"></i> Publier
                </button>
              </form>
            </div>

            <!-- Questions List -->
            @if (questions().length === 0) {
              <div class="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
                <i class="fa-regular fa-comments text-4xl text-slate-300 mb-3"></i>
                <h3 class="font-bold text-slate-700">Aucune question pour le moment</h3>
                <p class="text-xs text-slate-400 mt-1">Soyez le premier à poser une question pour animer la session !</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (q of questions(); track q.id) {
                  <div 
                    [class.bg-emerald-50]="q.isAnswered"
                    [class.border-emerald-200]="q.isAnswered"
                    class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-start gap-4 transition hover:border-brand-200">
                    
                    <!-- Upvote Button -->
                    <button 
                      (click)="toggleUpvote(q)"
                      [class.bg-brand-600]="q.hasUpvoted"
                      [class.text-white]="q.hasUpvoted"
                      [class.bg-slate-100]="!q.hasUpvoted"
                      [class.text-slate-600]="!q.hasUpvoted"
                      class="flex flex-col items-center justify-center w-12 py-2 rounded-xl transition hover:scale-105">
                      <i class="fa-solid fa-chevron-up text-xs"></i>
                      <span class="text-xs font-black mt-0.5">{{ q.upvotesCount }}</span>
                    </button>

                    <!-- Content -->
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-bold text-slate-800">
                          {{ q.author?.firstName }} {{ q.author?.lastName }}
                        </span>
                        <span class="text-[11px] text-slate-400">{{ q.createdAt | date:'shortTime' }}</span>
                        @if (q.isAnswered) {
                          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <i class="fa-solid fa-check-double text-[9px]"></i> Répondue
                          </span>
                        }
                      </div>
                      <p class="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        {{ q.content }}
                      </p>
                    </div>

                    <!-- Teacher Actions -->
                    @if (isAdmin()) {
                      <div class="flex items-center gap-1">
                        <button 
                          (click)="toggleAnswered(q)"
                          title="{{ q.isAnswered ? 'Marquer comme non répondue' : 'Marquer comme répondue' }}"
                          class="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition text-xs">
                          <i class="fa-solid fa-check"></i>
                        </button>
                        <button 
                          (click)="deleteQuestion(q.id)"
                          title="Supprimer"
                          class="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition text-xs">
                          <i class="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    }

                  </div>
                }
              </div>
            }

          </div>
        }

        <!-- ================= TAB 3: MESSAGERIE INSTANTANÉE (CHAT) ================= -->
        @if (activeTab() === 'chat') {
          <div class="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
            
            <!-- Chat Header -->
            <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs font-bold text-slate-800">Salon de discussion en direct</span>
              </div>

              @if (classData()?.chatLocked) {
                <span class="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1.5">
                  <i class="fa-solid fa-lock"></i> Mode Silencieux Actif (Messages bloqués)
                </span>
              }
            </div>

            <!-- Messages Stream -->
            <div class="flex-1 p-4 overflow-y-auto space-y-4" #chatScrollContainer>
              @for (msg of messages(); track msg.id) {
                <div class="flex items-start gap-3" [class.flex-row-reverse]="isMyMessage(msg)">
                  <img 
                    [src]="msg.sender?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + msg.senderId" 
                    alt="Avatar" 
                    class="w-8 h-8 rounded-full border border-slate-200 mt-1 object-cover" />

                  <div class="max-w-md" [class.items-end]="isMyMessage(msg)">
                    <div class="flex items-center gap-2 mb-1" [class.justify-end]="isMyMessage(msg)">
                      <span class="text-xs font-bold text-slate-800">{{ msg.sender?.firstName }} {{ msg.sender?.lastName }}</span>
                      <span class="text-[10px] text-slate-400">{{ msg.createdAt | date:'shortTime' }}</span>
                    </div>

                    <div 
                      [class.bg-brand-600]="isMyMessage(msg)"
                      [class.text-white]="isMyMessage(msg)"
                      [class.bg-slate-100]="!isMyMessage(msg)"
                      [class.text-slate-800]="!isMyMessage(msg)"
                      class="p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs break-words">
                      {{ msg.content }}
                    </div>

                    <!-- Reactions Bar -->
                    <div class="flex items-center gap-1 mt-1.5 flex-wrap" [class.justify-end]="isMyMessage(msg)">
                      @for (react of msg.reactions; track react.emoji) {
                        <button 
                          (click)="addReaction(msg.id, react.emoji)"
                          class="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 border border-slate-200 hover:bg-slate-200 transition">
                          {{ react.emoji }} {{ react.count }}
                        </button>
                      }

                      <!-- Quick Add Reaction Picker -->
                      <div class="relative group/picker">
                        <button class="px-1.5 py-0.5 rounded-full text-[11px] text-slate-400 hover:bg-slate-100 transition">
                          <i class="fa-regular fa-face-smile"></i>
                        </button>
                        <div class="hidden group-hover/picker:flex absolute bottom-full mb-1 bg-white border border-slate-200 shadow-lg rounded-xl p-1 gap-1 z-20">
                          <button (click)="addReaction(msg.id, '👍')" class="hover:scale-125 transition p-1">👍</button>
                          <button (click)="addReaction(msg.id, '❤️')" class="hover:scale-125 transition p-1">❤️</button>
                          <button (click)="addReaction(msg.id, '🔥')" class="hover:scale-125 transition p-1">🔥</button>
                          <button (click)="addReaction(msg.id, '👏')" class="hover:scale-125 transition p-1">👏</button>
                          <button (click)="addReaction(msg.id, '💡')" class="hover:scale-125 transition p-1">💡</button>
                        </div>
                      </div>

                      @if (isAdmin()) {
                        <button 
                          (click)="deleteMessage(msg.id)"
                          title="Modération : Supprimer"
                          class="text-slate-300 hover:text-rose-600 text-[10px] p-0.5 transition">
                          <i class="fa-regular fa-trash-can"></i>
                        </button>
                      }
                    </div>

                  </div>
                </div>
              }
            </div>

            <!-- Input Bar -->
            <div class="p-4 border-t border-slate-100 bg-white">
              @if (classData()?.chatLocked && !isAdmin()) {
                <div class="p-3 rounded-xl bg-slate-100 text-center text-xs text-slate-500 font-semibold">
                  <i class="fa-solid fa-lock mr-1.5"></i> Le chat est verrouillé par l'enseignant durant cette phase.
                </div>
              } @else {
                <form (ngSubmit)="sendChatMessage()" class="flex gap-2">
                  <input 
                    type="text" 
                    [(ngModel)]="newChatMessage" 
                    name="chatMessage" 
                    placeholder="Écrivez votre message..." 
                    class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  <button 
                    type="submit" 
                    [disabled]="!newChatMessage.trim()"
                    class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition disabled:opacity-40">
                    <i class="fa-solid fa-paper-plane mr-1"></i> Envoyer
                  </button>
                </form>
              }
            </div>

          </div>
        }

        <!-- ================= TAB 4: EXAMENS SÉCURISÉS & IA ================= -->
        @if (activeTab() === 'exams') {
          <div class="space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 class="text-xl font-black text-slate-900 tracking-tight">Examens Sécurisés & Évaluations par IA</h2>
                <p class="text-xs text-slate-500">QCM chronométrés éphémères, surveillance webcam (Proctoring) et détection anti-triche</p>
              </div>

              @if (isAdmin()) {
                <button 
                  (click)="openCreateExamModal()"
                  class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 flex items-center gap-2 transition hover:-translate-y-0.5">
                  <i class="fa-solid fa-wand-magic-sparkles"></i> Créer un Examen Assisté par IA
                </button>
              }
            </div>

            <!-- Exams List -->
            @if (exams().length === 0) {
              <div class="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
                <i class="fa-solid fa-clipboard-question text-4xl text-slate-300 mb-3"></i>
                <h3 class="font-bold text-slate-700">Aucun examen programmé</h3>
                <p class="text-xs text-slate-400 mt-1">L’enseignant n’a pas encore publié d’épreuve sécurisée.</p>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                @for (exam of exams(); track exam.id) {
                  <div class="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      
                      <!-- Header Badges -->
                      <div class="flex items-center justify-between mb-3">
                        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 uppercase">
                          {{ exam.difficulty || 'Intermédiaire' }}
                        </span>
                        <div class="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                          <span><i class="fa-solid fa-stopwatch text-brand-500 mr-1"></i> {{ exam.timePerQuestionSeconds }}s / question</span>
                          <span><i class="fa-solid fa-camera text-indigo-500 mr-1"></i> Proctoring WebCam</span>
                        </div>
                      </div>

                      <h3 class="text-lg font-extrabold text-slate-900">{{ exam.title }}</h3>
                      <p class="text-xs text-slate-500 mt-1 leading-relaxed">{{ exam.description }}</p>

                      <!-- Anti-Cheat Spec Badges -->
                      <div class="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-600">
                        <span class="px-2 py-1 bg-slate-100 rounded-lg">
                          <i class="fa-solid fa-shuffle mr-1 text-slate-400"></i> Ordre aléatoire
                        </span>
                        <span class="px-2 py-1 bg-slate-100 rounded-lg">
                          <i class="fa-solid fa-window-restore mr-1 text-slate-400"></i> Anti-Tab Switch (Max {{ exam.maxTabSwitchWarnings }})
                        </span>
                        <span class="px-2 py-1 bg-slate-100 rounded-lg">
                          <i class="fa-solid fa-list-ol mr-1 text-slate-400"></i> {{ exam.totalQuestions }} questions éphémères
                        </span>
                      </div>

                    </div>

                    <!-- Exam Action Button -->
                    <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      @if (isAdmin()) {
                        <button 
                          (click)="openTeacherResults(exam.id)"
                          class="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition flex items-center gap-2">
                          <i class="fa-solid fa-chart-line text-brand-400"></i> Proctoring & Résultats Enseignant
                        </button>
                      } @else {
                        @if (exam.myAttempt) {
                          <div class="flex items-center justify-between w-full">
                            <div>
                              <p class="text-[11px] text-slate-400 font-medium">Examen terminé</p>
                              <p class="text-sm font-extrabold text-brand-600">
                                Score : {{ exam.myAttempt.score }} pts ({{ exam.myAttempt.correctAnswersCount }}/{{ exam.myAttempt.totalQuestions }})
                              </p>
                            </div>
                            <button 
                              (click)="openReviewModal(exam.myAttempt.id)"
                              class="px-4 py-2 rounded-xl bg-brand-50 text-brand-700 font-bold text-xs hover:bg-brand-100 transition">
                              Revoir le corrigé & feedback IA
                            </button>
                          </div>
                        } @else {
                          <a 
                            [routerLink]="['/exams', exam.id, 'take']"
                            class="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition">
                            <i class="fa-solid fa-play mr-1.5"></i> Démarrer l’évaluation sécurisée
                          </a>
                        }
                      }
                    </div>

                  </div>
                }
              </div>
            }

          </div>
        }

        <!-- ================= TAB 5: MEMBRES ================= -->
        @if (activeTab() === 'members') {
          <div class="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 class="text-xl font-black text-slate-900 tracking-tight mb-4">Liste des Participants</h2>
            <div class="divide-y divide-slate-100">
              @for (m of classData()?.memberships; track m.id) {
                <div class="py-3.5 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <img 
                      [src]="m.user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + m.userId" 
                      alt="Avatar" 
                      class="w-10 h-10 rounded-full border border-slate-200 object-cover" />
                    <div>
                      <p class="text-sm font-bold text-slate-800">{{ m.user?.firstName }} {{ m.user?.lastName }}</p>
                      <p class="text-xs text-slate-400">{{ m.user?.email }}</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    @if (m.role === 'admin') {
                      <span class="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Enseignant
                      </span>
                    } @else {
                      <span class="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                        Étudiant
                      </span>
                    }

                    @if (isAdmin() && m.role !== 'admin') {
                      <button 
                        (click)="toggleMemberMute(m.userId)"
                        title="{{ m.isMuted ? 'Réactiver' : 'Mettre en sourdine' }}"
                        class="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition text-xs">
                        <i class="fa-solid" [class.fa-microphone-slash]="m.isMuted" [class.fa-microphone]="!m.isMuted"></i>
                      </button>
                      <button 
                        (click)="kickMember(m.userId)"
                        title="Exclure de la classe"
                        class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition text-xs">
                        <i class="fa-solid fa-user-xmark"></i>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

      </main>

    </div>

    <!-- ================= MODAL: CRÉER UN SONDAGE ================= -->
    @if (isCreatePollOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
              <i class="fa-solid fa-square-poll-vertical text-brand-600"></i> Créer un Nouveau Sondage / Vote
            </h3>
            <button (click)="isCreatePollOpen.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form (ngSubmit)="createPoll()" class="mt-4 space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Question / Titre du sondage *</label>
              <input type="text" [(ngModel)]="newPollTitle" name="title" required placeholder="Ex : Quel framework préférez-vous ?" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Description (optionnelle)</label>
              <input type="text" [(ngModel)]="newPollDescription" name="description" placeholder="Consigne ou contexte..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Type de choix</label>
                <select [(ngModel)]="newPollType" name="type" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="single">Choix Unique (Vote)</option>
                  <option value="multiple">Choix Multiples (Sondage)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Visibilité des résultats</label>
                <select [(ngModel)]="newPollVisibility" name="visibility" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="live">En direct (Instantané)</option>
                  <option value="after_close">Après la clôture uniquement</option>
                </select>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <input type="checkbox" id="anonCheck" [(ngModel)]="newPollAnonymous" name="anon" class="rounded text-brand-600 focus:ring-brand-500" />
              <label for="anonCheck" class="text-xs font-semibold text-slate-700 cursor-pointer">
                Rendre les votes anonymes (masquer l’identité des participants)
              </label>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-2">Options de vote (minimum 2)</label>
              <div class="space-y-2">
                @for (opt of pollOptionsInput; track $index) {
                  <div class="flex gap-2">
                    <input type="text" [(ngModel)]="pollOptionsInput[$index]" [name]="'opt' + $index" placeholder="Proposition..." class="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    @if (pollOptionsInput.length > 2) {
                      <button type="button" (click)="removePollOption($index)" class="p-2 text-slate-400 hover:text-rose-600 text-xs">
                        <i class="fa-regular fa-trash-can"></i>
                      </button>
                    }
                  </div>
                }
              </div>
              <button type="button" (click)="addPollOption()" class="mt-2 text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                <i class="fa-solid fa-plus"></i> Ajouter une option
              </button>
            </div>

            <div class="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button type="button" (click)="isCreatePollOpen.set(false)" class="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
                Annuler
              </button>
              <button type="submit" [disabled]="!newPollTitle" class="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md disabled:opacity-50">
                Publier le sondage
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- ================= MODAL: CRÉER UN EXAMEN ASSISTÉ PAR IA ================= -->
    @if (isCreateExamOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
                <i class="fa-solid fa-wand-magic-sparkles text-indigo-600"></i> Générateur d'Examens Sécurisés par IA
              </h3>
              <p class="text-xs text-slate-500">Générez automatiquement un QCM à partir d'un thème ou d'un support de cours</p>
            </div>
            <button (click)="isCreateExamOpen.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <!-- Step 1: AI Prompt & Parameters -->
          <div class="mt-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-indigo-950 mb-1">Thème ou sujet de l'évaluation</label>
                <input type="text" [(ngModel)]="aiTheme" placeholder="Ex : Requêtes SQL, Node.js, Intelligence Artificielle..." class="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-indigo-950 mb-1">Niveau de difficulté</label>
                <select [(ngModel)]="aiDifficulty" class="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-indigo-950 mb-1">Support de cours (Texte ou PDF)</label>
              <textarea [(ngModel)]="aiTextContent" rows="2" placeholder="Collez un extrait de cours ou laissez vide pour générer par thème..." class="w-full px-3.5 py-2 rounded-xl border border-indigo-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
            </div>

            <div class="flex items-center justify-between">
              <label class="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900">
                <i class="fa-solid fa-file-pdf"></i> Upload Support PDF
                <input type="file" (change)="onPdfSelected($event)" accept=".pdf" class="hidden" />
              </label>
              @if (selectedPdfName) {
                <span class="text-xs text-indigo-600 font-bold truncate max-w-[200px]">{{ selectedPdfName }}</span>
              }

              <button 
                type="button" 
                (click)="triggerAIGeneration()" 
                [disabled]="isGeneratingAI()"
                class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/25 flex items-center gap-1.5 transition disabled:opacity-50">
                @if (isGeneratingAI()) {
                  <i class="fa-solid fa-spinner fa-spin"></i> L'IA réfléchit...
                } @else {
                  <i class="fa-solid fa-sparkles"></i> Générer avec l’IA
                }
              </button>
            </div>
          </div>

          <!-- Step 2: Exam Settings & Questions Preview / Edition -->
          <div class="mt-6 space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Titre de l'épreuve *</label>
              <input type="text" [(ngModel)]="examTitle" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Temps / Question</label>
                <input type="number" [(ngModel)]="examTimePerQuestion" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-center" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Max Sorties Onglet</label>
                <input type="number" [(ngModel)]="examMaxWarnings" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-center" />
              </div>
              <div class="flex items-center gap-2 pt-5">
                <input type="checkbox" id="rndQ" [(ngModel)]="examRandomize" class="rounded text-brand-600" />
                <label for="rndQ" class="font-semibold text-slate-700 cursor-pointer">Mélanger questions</label>
              </div>
              <div class="flex items-center gap-2 pt-5">
                <input type="checkbox" id="camReq" [(ngModel)]="examRequireCam" class="rounded text-brand-600" />
                <label for="camReq" class="font-semibold text-slate-700 cursor-pointer">Webcam Requise</label>
              </div>
            </div>

            <!-- Questions Review List -->
            <div class="border-t border-slate-100 pt-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Questions générées ({{ generatedQuestions.length }}) - Relecture & Modification
                </h4>
                <button (click)="addManualQuestion()" class="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  <i class="fa-solid fa-plus"></i> Ajouter manuellement
                </button>
              </div>

              <div class="space-y-4">
                @for (q of generatedQuestions; track qIdx; let qIdx = $index) {
                  <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative">
                    <button (click)="removeGeneratedQuestion(qIdx)" class="absolute top-3 right-3 text-slate-400 hover:text-rose-600 text-xs">
                      <i class="fa-regular fa-trash-can"></i>
                    </button>

                    <div class="pr-8">
                      <label class="block text-[11px] font-bold text-slate-500 mb-1">Question {{ qIdx + 1 }}</label>
                      <input type="text" [(ngModel)]="q.questionText" class="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white" />
                    </div>

                    <!-- Options -->
                    <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      @for (opt of q.options; track optIdx; let optIdx = $index) {
                        <div class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                          <input 
                            type="radio" 
                            [name]="'correct_' + qIdx" 
                            [checked]="opt.isCorrect" 
                            (change)="setCorrectOption(q, optIdx)"
                            class="text-emerald-600 focus:ring-emerald-500" />
                          <input type="text" [(ngModel)]="opt.optionText" class="flex-1 text-xs border-none focus:outline-none" />
                        </div>
                      }
                    </div>

                    <!-- Pedagogic explanation -->
                    <div class="mt-2">
                      <label class="block text-[10px] font-bold text-slate-400 mb-0.5">Explication pédagogique post-examen</label>
                      <input type="text" [(ngModel)]="q.explanation" placeholder="Justification de la bonne réponse..." class="w-full px-3 py-1 rounded-lg border border-slate-200 text-[11px] bg-white text-slate-600" />
                    </div>

                  </div>
                }
              </div>
            </div>

            <!-- Footer Save -->
            <div class="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button type="button" (click)="isCreateExamOpen.set(false)" class="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
                Annuler
              </button>
              <button 
                type="button" 
                (click)="publishExam()" 
                [disabled]="generatedQuestions.length === 0"
                class="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md disabled:opacity-50">
                Publier l'examen pour la classe
              </button>
            </div>

          </div>

        </div>
      </div>
    }

    <!-- ================= MODAL: TEACHER RESULTS & PROCTORING DASHBOARD ================= -->
    @if (isTeacherResultsOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
                <i class="fa-solid fa-trophy text-amber-500"></i> Tableau de Bord Proctoring & Podium
              </h3>
              <p class="text-xs text-slate-500">Surveillance temps réel, classements de gamification et export des notes</p>
            </div>
            <div class="flex items-center gap-2">
              <button 
                (click)="downloadCSV()"
                class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition">
                <i class="fa-solid fa-file-csv"></i> Exporter CSV (Excel)
              </button>
              <button (click)="isTeacherResultsOpen.set(false)" class="text-slate-400 hover:text-slate-600">
                <i class="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
          </div>

          <!-- Live Proctoring Alerts Banner -->
          <div class="mt-4 p-4 rounded-2xl bg-slate-900 text-white">
            <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
              <i class="fa-solid fa-radar fa-spin text-sm"></i> Flux d'Alertes Anti-Triche en Direct (Socket.io)
            </h4>
            @if (liveProctorAlerts.length === 0) {
              <p class="text-xs text-slate-400">Aucune infraction anti-triche détectée pour le moment.</p>
            } @else {
              <div class="space-y-1.5 max-h-32 overflow-y-auto">
                @for (alt of liveProctorAlerts; track $index) {
                  <div class="text-xs p-2 rounded-xl bg-white/10 flex items-center justify-between">
                    <span class="font-bold text-rose-300">
                      <i class="fa-solid fa-triangle-exclamation mr-1"></i> {{ alt.student?.firstName }} {{ alt.student?.lastName }} :
                      {{ alt.alert?.details || alt.alert?.type }}
                    </span>
                    <span class="text-[10px] text-slate-400">{{ alt.alert?.createdAt | date:'mediumTime' }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Leaderboard Table -->
          <div class="mt-6">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Classement Général (Gamification : Vitesse & Précision)
            </h4>

            <div class="overflow-x-auto rounded-2xl border border-slate-200">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-600 uppercase font-extrabold text-[10px] border-b border-slate-200">
                  <tr>
                    <th class="p-3">Rang</th>
                    <th class="p-3">Étudiant</th>
                    <th class="p-3">Score & Points</th>
                    <th class="p-3">Exactitude</th>
                    <th class="p-3">Sorties d'onglet</th>
                    <th class="p-3">Statut</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (row of teacherLeaderboard; track row.attemptId) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-3 font-extrabold text-sm">
                        @if (row.rank === 1) { 🥇 1 }
                        @else if (row.rank === 2) { 🥈 2 }
                        @else if (row.rank === 3) { 🥉 3 }
                        @else { #{{ row.rank }} }
                      </td>
                      <td class="p-3 font-bold text-slate-800">
                        {{ row.student?.firstName }} {{ row.student?.lastName }}
                      </td>
                      <td class="p-3 font-extrabold text-brand-600">
                        {{ row.score }} pts
                      </td>
                      <td class="p-3 font-semibold text-slate-700">
                        {{ row.correctCount }}/{{ row.totalQuestions }} ({{ row.percentage }}%)
                      </td>
                      <td class="p-3">
                        @if (row.tabSwitches > 0) {
                          <span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                            {{ row.tabSwitches }} sortie(s)
                          </span>
                        } @else {
                          <span class="text-emerald-600 font-semibold">0 (Conforme)</span>
                        }
                      </td>
                      <td class="p-3">
                        <span 
                          [class.bg-emerald-100]="row.status === 'completed'"
                          [class.text-emerald-800]="row.status === 'completed'"
                          [class.bg-rose-100]="row.status === 'disqualified_anti_cheat'"
                          [class.text-rose-800]="row.status === 'disqualified_anti_cheat'"
                          class="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">
                          {{ row.status === 'completed' ? 'Validé' : 'Disqualifié' }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    }

    <!-- ================= MODAL: STUDENT REVIEW & AI EXPLANATIONS ================= -->
    @if (isReviewModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-black text-slate-900">Corrigé & Feedback Pédagogique IA</h3>
              <p class="text-xs text-slate-500">Explication détaillée de chaque question et analyse personnalisée</p>
            </div>
            <button (click)="isReviewModalOpen.set(false)" class="text-slate-400 hover:text-slate-600">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <!-- AI Feedback Card -->
          @if (reviewData?.feedback) {
            <div class="mt-4 p-4 rounded-2xl bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-100">
              <h4 class="text-xs font-bold text-brand-900 flex items-center gap-1.5 mb-1">
                <i class="fa-solid fa-robot text-brand-600"></i> Feedback Personnalisé de l’IA :
              </h4>
              <p class="text-xs text-slate-700 leading-relaxed font-medium">
                {{ reviewData.feedback }}
              </p>
            </div>
          }

          <!-- Questions with answers and explanations -->
          <div class="mt-6 space-y-4">
            @for (ans of reviewData?.answers; track ans.id; let idx = $index) {
              <div class="p-4 rounded-2xl border" [class.border-emerald-200]="ans.isCorrect" [class.bg-emerald-50]="ans.isCorrect" [class.border-rose-200]="!ans.isCorrect" [class.bg-rose-50]="!ans.isCorrect">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold text-slate-800">Question {{ idx + 1 }}</span>
                  <span class="text-xs font-extrabold" [class.text-emerald-700]="ans.isCorrect" [class.text-rose-700]="!ans.isCorrect">
                    {{ ans.isCorrect ? 'Correcte (+ points)' : 'Incorrecte' }}
                  </span>
                </div>

                <p class="text-xs sm:text-sm font-semibold text-slate-900 mb-2">{{ ans.question?.questionText }}</p>

                <div class="text-xs text-slate-600 mb-2">
                  Votre réponse : <strong [class.text-emerald-700]="ans.isCorrect" [class.text-rose-700]="!ans.isCorrect">{{ ans.selectedOption?.optionText || 'Aucune réponse (temps écoulé)' }}</strong>
                </div>

                <!-- Pedagogic Explanation -->
                @if (ans.question?.explanation) {
                  <div class="p-2.5 rounded-xl bg-white/80 border border-slate-200 text-xs text-slate-700">
                    <strong class="text-brand-800 flex items-center gap-1 mb-0.5">
                      <i class="fa-solid fa-lightbulb text-amber-500"></i> Explication Pédagogique :
                    </strong>
                    {{ ans.question.explanation }}
                  </div>
                }
              </div>
            }
          </div>

        </div>
      </div>
    }
  `
})
export class ClassDetailComponent implements OnInit, OnDestroy {
  classId = 0;
  classData = signal<ClassItem | null>(null);
  activeTab = signal<'polls' | 'qa' | 'chat' | 'exams' | 'members'>('polls');

  // Polls
  polls = signal<PollItem[]>([]);
  isCreatePollOpen = signal(false);
  newPollTitle = '';
  newPollDescription = '';
  newPollType: 'single' | 'multiple' = 'single';
  newPollVisibility: 'live' | 'after_close' = 'live';
  newPollAnonymous = false;
  pollOptionsInput = ['', ''];
  selectedPollOptions: { [pollId: number]: number[] } = {};

  // Q&A
  questions = signal<QAQuestionItem[]>([]);
  newQuestionContent = '';

  // Chat
  messages = signal<ChatMessageItem[]>([]);
  newChatMessage = '';

  // Exams
  exams = signal<ExamItem[]>([]);
  isCreateExamOpen = signal(false);
  aiTheme = 'Architecture Web & Bases de Données SQL';
  aiDifficulty = 'Intermédiaire';
  aiTextContent = '';
  selectedPdfFile: File | null = null;
  selectedPdfName = '';
  isGeneratingAI = signal(false);

  examTitle = 'Examen Sécurisé & QCM Chronométré';
  examTimePerQuestion = 30;
  examMaxWarnings = 3;
  examRandomize = true;
  examRequireCam = true;
  generatedQuestions: ExamQuestion[] = [];

  // Teacher results & proctoring
  isTeacherResultsOpen = signal(false);
  teacherLeaderboard: any[] = [];
  liveProctorAlerts: any[] = [];
  currentMonitoringExamId = 0;

  // Student review
  isReviewModalOpen = signal(false);
  reviewData: any = null;

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    public authService: AuthService,
    private classService: ClassService,
    private pollService: PollService,
    private qaService: QAService,
    private chatService: ChatService,
    private examService: ExamService,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.classId = parseInt(params['id'], 10);
      if (this.classId) {
        this.loadClassData();
        this.joinSocketRoom();
        this.setupSocketListeners();
      }
    });
  }

  ngOnDestroy() {
    const user = this.authService.currentUser();
    if (user && this.classId) {
      this.socketService.leaveClass(this.classId, user.id, `${user.firstName} ${user.lastName}`);
    }
    this.subs.forEach(s => s.unsubscribe());
  }

  isAdmin(): boolean {
    return this.classData()?.currentUserRole === 'admin';
  }

  isMyMessage(msg: ChatMessageItem): boolean {
    return msg.senderId === this.authService.currentUser()?.id;
  }

  loadClassData() {
    this.classService.getClassById(this.classId).subscribe(res => {
      this.classData.set(res.class);
    });

    this.pollService.getClassPolls(this.classId).subscribe(res => {
      this.polls.set(res.polls);
    });

    this.qaService.getQuestions(this.classId).subscribe(res => {
      this.questions.set(res.questions);
    });

    this.chatService.getClassMessages(this.classId).subscribe(res => {
      this.messages.set(res.messages);
    });

    this.examService.getClassExams(this.classId).subscribe(res => {
      this.exams.set(res.exams);
    });
  }

  joinSocketRoom() {
    const user = this.authService.currentUser();
    if (user && this.classId) {
      this.socketService.joinClass(this.classId, user.id, `${user.firstName} ${user.lastName}`);
    }
  }

  setupSocketListeners() {
    // Live Polls
    this.subs.push(
      this.socketService.onEvent<any>('poll_created').subscribe(data => {
        this.polls.update(current => [data.poll, ...current]);
      }),
      this.socketService.onEvent<any>('poll_updated').subscribe(data => {
        this.polls.update(current => current.map(p => p.id === data.poll.id ? { ...p, ...data.poll } : p));
      }),
      this.socketService.onEvent<any>('poll_status_toggled').subscribe(data => {
        this.polls.update(current => current.map(p => p.id === data.poll.id ? { ...p, status: data.poll.status } : p));
      }),
      this.socketService.onEvent<any>('poll_deleted').subscribe(data => {
        this.polls.update(current => current.filter(p => p.id !== data.pollId));
      })
    );

    // Live Q&A
    this.subs.push(
      this.socketService.onEvent<any>('qa_question_created').subscribe(data => {
        this.questions.update(current => [data.question, ...current]);
      }),
      this.socketService.onEvent<any>('qa_question_upvoted').subscribe(data => {
        this.questions.update(current => current.map(q => q.id === data.questionId ? { ...q, upvotesCount: data.upvotesCount } : q));
      }),
      this.socketService.onEvent<any>('qa_question_answered_toggled').subscribe(data => {
        this.questions.update(current => current.map(q => q.id === data.questionId ? { ...q, isAnswered: data.isAnswered } : q));
      }),
      this.socketService.onEvent<any>('qa_question_deleted').subscribe(data => {
        this.questions.update(current => current.filter(q => q.id !== data.questionId));
      })
    );

    // Live Chat & Silent Mode
    this.subs.push(
      this.socketService.onEvent<any>('chat_message_received').subscribe(data => {
        this.messages.update(current => [...current, data.chatMessage]);
      }),
      this.socketService.onEvent<any>('chat_reaction_updated').subscribe(data => {
        this.messages.update(current => current.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
      }),
      this.socketService.onEvent<any>('chat_message_deleted').subscribe(data => {
        this.messages.update(current => current.map(m => m.id === data.messageId ? { ...m, isDeleted: true, content: 'Ce message a été supprimé par la modération.' } : m));
      }),
      this.socketService.onEvent<any>('chat_lock_toggled').subscribe(data => {
        const cls = this.classData();
        if (cls) {
          this.classData.set({ ...cls, chatLocked: data.chatLocked });
        }
      })
    );

    // Live Proctoring Alerts
    this.subs.push(
      this.socketService.onEvent<any>('proctor_alert_received').subscribe(data => {
        this.liveProctorAlerts.unshift(data);
      })
    );
  }

  // Polls logic
  canViewResults(poll: PollItem): boolean {
    if (poll.resultsVisibility === 'live') return true;
    return poll.status === 'closed' || this.isAdmin();
  }

  getPercentage(count: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((count / total) * 100);
  }

  selectVoteOption(poll: PollItem, optionId: number) {
    if (poll.status === 'closed' || poll.hasVoted) return;

    if (poll.type === 'single') {
      this.selectedPollOptions[poll.id] = [optionId];
    } else {
      const current = this.selectedPollOptions[poll.id] || [];
      if (current.includes(optionId)) {
        this.selectedPollOptions[poll.id] = current.filter(id => id !== optionId);
      } else {
        this.selectedPollOptions[poll.id] = [...current, optionId];
      }
    }
  }

  isOptionSelected(poll: PollItem, optionId: number): boolean {
    if (poll.hasVoted && poll.mySelectedOptionIds) {
      return poll.mySelectedOptionIds.includes(optionId);
    }
    return (this.selectedPollOptions[poll.id] || []).includes(optionId);
  }

  hasSelectionForPoll(pollId: number): boolean {
    return (this.selectedPollOptions[pollId] || []).length > 0;
  }

  submitVote(poll: PollItem) {
    const selected = this.selectedPollOptions[poll.id];
    if (!selected || selected.length === 0) return;

    this.pollService.vote(poll.id, selected).subscribe(res => {
      this.polls.update(current => current.map(p => p.id === poll.id ? res.poll : p));
    });
  }

  togglePollStatus(poll: PollItem) {
    this.pollService.toggleStatus(poll.id).subscribe();
  }

  deletePoll(pollId: number) {
    if (confirm('Supprimer définitivement ce sondage ?')) {
      this.pollService.deletePoll(pollId).subscribe();
    }
  }

  addPollOption() {
    this.pollOptionsInput.push('');
  }

  removePollOption(index: number) {
    this.pollOptionsInput.splice(index, 1);
  }

  createPoll() {
    const validOptions = this.pollOptionsInput.filter(o => o.trim().length > 0);
    if (validOptions.length < 2) {
      alert('Veuillez renseigner au moins 2 options.');
      return;
    }

    this.pollService.createPoll(this.classId, {
      title: this.newPollTitle,
      description: this.newPollDescription,
      type: this.newPollType,
      resultsVisibility: this.newPollVisibility,
      isAnonymous: this.newPollAnonymous,
      options: validOptions
    }).subscribe({
      next: () => {
        this.isCreatePollOpen.set(false);
        this.newPollTitle = '';
        this.newPollDescription = '';
        this.pollOptionsInput = ['', ''];
      }
    });
  }

  // Q&A logic
  askQuestion() {
    if (!this.newQuestionContent.trim()) return;

    this.qaService.createQuestion(this.classId, this.newQuestionContent).subscribe({
      next: () => {
        this.newQuestionContent = '';
      }
    });
  }

  toggleUpvote(q: QAQuestionItem) {
    this.qaService.toggleUpvote(q.id).subscribe(res => {
      this.questions.update(current => current.map(item => item.id === q.id ? {
        ...item,
        upvotesCount: res.upvotesCount,
        hasUpvoted: res.hasUpvoted
      } : item));
    });
  }

  toggleAnswered(q: QAQuestionItem) {
    this.qaService.toggleAnswered(q.id).subscribe();
  }

  deleteQuestion(id: number) {
    this.qaService.deleteQuestion(id).subscribe();
  }

  // Chat logic
  sendChatMessage() {
    if (!this.newChatMessage.trim()) return;

    this.chatService.sendMessage(this.classId, this.newChatMessage).subscribe({
      next: () => {
        this.newChatMessage = '';
      }
    });
  }

  addReaction(messageId: number, emoji: string) {
    this.chatService.addReaction(messageId, emoji).subscribe();
  }

  deleteMessage(messageId: number) {
    this.chatService.deleteMessage(messageId).subscribe();
  }

  // Admin controls
  toggleChatLock() {
    this.classService.toggleChatLock(this.classId).subscribe(res => {
      const cls = this.classData();
      if (cls) this.classData.set({ ...cls, chatLocked: res.chatLocked });
    });
  }

  toggleRegistrationLock() {
    this.classService.toggleLock(this.classId).subscribe(res => {
      const cls = this.classData();
      if (cls) this.classData.set({ ...cls, isLocked: res.isLocked });
    });
  }

  resetCode() {
    if (confirm('Régénérer le code d’accès et le lien d’invitation ? L’ancien code ne fonctionnera plus.')) {
      this.classService.resetClassCode(this.classId).subscribe(res => {
        const cls = this.classData();
        if (cls) this.classData.set({ ...cls, code: res.code, inviteToken: res.inviteToken });
        alert(`Nouveau code généré : ${res.code}`);
      });
    }
  }

  toggleMemberMute(userId: number) {
    this.classService.toggleMemberMute(this.classId, userId).subscribe(res => {
      alert(res.message);
    });
  }

  kickMember(userId: number) {
    if (confirm('Exclure cet utilisateur de la classe ?')) {
      this.classService.kickMember(this.classId, userId).subscribe({
        next: () => {
          this.loadClassData();
        }
      });
    }
  }

  copyCode() {
    const code = this.classData()?.code;
    if (code) {
      navigator.clipboard.writeText(code);
      alert(`Code ${code} copié !`);
    }
  }

  copyInviteLink() {
    const token = this.classData()?.inviteToken;
    if (token) {
      const link = `${window.location.origin}/join/${token}`;
      navigator.clipboard.writeText(link);
      alert(`Lien d’invitation direct copié :\n${link}`);
    }
  }

  // Exams & AI Generation
  openCreateExamModal() {
    this.isCreateExamOpen.set(true);
    if (this.generatedQuestions.length === 0) {
      this.triggerAIGeneration();
    }
  }

  onPdfSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedPdfFile = file;
      this.selectedPdfName = file.name;
    }
  }

  triggerAIGeneration() {
    this.isGeneratingAI.set(true);
    this.examService.generateQuestionsAI({
      theme: this.aiTheme,
      difficulty: this.aiDifficulty,
      count: 5,
      textContent: this.aiTextContent,
      file: this.selectedPdfFile || undefined
    }).subscribe({
      next: (res) => {
        this.generatedQuestions = res.questions.map((q, idx) => ({
          questionText: q.questionText,
          explanation: q.explanation || '',
          points: 100,
          orderIndex: idx,
          options: q.options.map((opt, oIdx) => ({
            optionText: typeof opt === 'string' ? opt : (opt as any).text || (opt as any).optionText,
            isCorrect: (opt as any).isCorrect || false,
            orderIndex: oIdx
          }))
        }));
        this.isGeneratingAI.set(false);
      },
      error: () => {
        this.isGeneratingAI.set(false);
      }
    });
  }

  setCorrectOption(q: ExamQuestion, optionIndex: number) {
    q.options.forEach((opt, idx) => {
      opt.isCorrect = idx === optionIndex;
    });
  }

  addManualQuestion() {
    this.generatedQuestions.push({
      questionText: 'Nouvelle question rédigée manuellement',
      explanation: 'Explication pédagogique de la réponse',
      points: 100,
      orderIndex: this.generatedQuestions.length,
      options: [
        { optionText: 'Proposition A (Correcte)', isCorrect: true, orderIndex: 0 },
        { optionText: 'Proposition B', isCorrect: false, orderIndex: 1 },
        { optionText: 'Proposition C', isCorrect: false, orderIndex: 2 },
        { optionText: 'Proposition D', isCorrect: false, orderIndex: 3 }
      ]
    });
  }

  removeGeneratedQuestion(index: number) {
    this.generatedQuestions.splice(index, 1);
  }

  publishExam() {
    this.examService.createExam(this.classId, {
      title: this.examTitle,
      description: `Évaluation ${this.aiDifficulty} sur le thème ${this.aiTheme}`,
      timePerQuestionSeconds: this.examTimePerQuestion,
      randomizeQuestions: this.examRandomize,
      randomizeOptions: true,
      requireWebcam: this.examRequireCam,
      maxTabSwitchWarnings: this.examMaxWarnings,
      theme: this.aiTheme,
      difficulty: this.aiDifficulty,
      questions: this.generatedQuestions
    }).subscribe({
      next: () => {
        this.isCreateExamOpen.set(false);
        this.examService.getClassExams(this.classId).subscribe(res => {
          this.exams.set(res.exams);
        });
        alert('Examen créé et publié avec succès !');
      }
    });
  }

  openTeacherResults(examId: number) {
    this.currentMonitoringExamId = examId;
    this.socketService.joinExamMonitor(examId);

    this.examService.getTeacherResults(examId).subscribe(res => {
      this.teacherLeaderboard = res.leaderboard;
      this.isTeacherResultsOpen.set(true);
    });
  }

  downloadCSV() {
    if (this.currentMonitoringExamId) {
      window.open(this.examService.exportCSVUrl(this.currentMonitoringExamId), '_blank');
    }
  }

  openReviewModal(attemptId: number) {
    this.examService.getMyAttemptReview(attemptId).subscribe(res => {
      this.reviewData = res.attempt;
      this.isReviewModalOpen.set(true);
    });
  }
}
