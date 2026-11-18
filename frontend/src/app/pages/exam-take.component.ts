import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ExamService } from '../services/exam.service';
import { ProctorService } from '../services/proctor.service';
import { AuthService } from '../services/auth.service';

declare const confetti: any;

@Component({
  selector: 'app-exam-take',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white flex flex-col justify-between select-none relative overflow-hidden">
      
      <!-- Top Examination Bar -->
      <header class="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center font-black text-sm">
            CP
          </div>
          <div>
            <h1 class="text-sm sm:text-base font-extrabold text-white truncate max-w-xs sm:max-w-md">
              {{ exam?.title }}
            </h1>
            <p class="text-[11px] text-slate-400">Évaluation Sécurisée & Chronométrée</p>
          </div>
        </div>

        <!-- Center: Circular Countdown Timer -->
        @if (examStarted() && !examEnded()) {
          <div class="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700">
            <div class="relative w-8 h-8 flex items-center justify-center">
              <svg class="w-full h-full transform -rotate-90">
                <circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="3" class="text-slate-700 fill-none" />
                <circle 
                  cx="16" 
                  cy="16" 
                  r="13" 
                  stroke="currentColor" 
                  stroke-width="3" 
                  [class.text-rose-500]="timeLeft <= 5"
                  [class.text-amber-500]="timeLeft > 5 && timeLeft <= 10"
                  [class.text-brand-500]="timeLeft > 10"
                  class="fill-none transition-all duration-1000 ease-linear stroke-dasharray-100" 
                  [style.strokeDashoffset]="getTimerOffset()" />
              </svg>
              <span class="absolute text-[11px] font-black" [class.text-rose-400]="timeLeft <= 5">
                {{ timeLeft }}
              </span>
            </div>
            <div class="text-left hidden sm:block">
              <p class="text-[10px] uppercase font-bold text-slate-400">Temps restant</p>
              <p class="text-xs font-black" [class.text-rose-400]="timeLeft <= 5">{{ timeLeft }} secondes</p>
            </div>
          </div>
        }

        <!-- Right: Anti-Cheat Warning Badge & Status -->
        <div class="flex items-center gap-2">
          @if (examStarted() && !examEnded()) {
            <span 
              [class.bg-emerald-950]="currentFaceStatus().detected"
              [class.text-emerald-400]="currentFaceStatus().detected"
              [class.border-emerald-800]="currentFaceStatus().detected"
              [class.bg-rose-950]="!currentFaceStatus().detected"
              [class.text-rose-400]="!currentFaceStatus().detected"
              [class.border-rose-800]="!currentFaceStatus().detected"
              class="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition">
              <i class="fa-solid" [class.fa-video]="currentFaceStatus().detected" [class.fa-video-slash]="!currentFaceStatus().detected"></i>
              <span>{{ currentFaceStatus().message }}</span>
            </span>

            <span 
              [class.bg-emerald-950]="tabSwitches === 0"
              [class.text-emerald-400]="tabSwitches === 0"
              [class.border-emerald-800]="tabSwitches === 0"
              [class.bg-rose-950]="tabSwitches > 0"
              [class.text-rose-400]="tabSwitches > 0"
              [class.border-rose-800]="tabSwitches > 0"
              class="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5">
              <i class="fa-solid fa-shield-halved"></i>
              <span>Onglets : {{ tabSwitches }}/{{ exam?.maxTabSwitchWarnings || 3 }}</span>
            </span>
          }
        </div>
      </header>

      <!-- Main Stage -->
      <main class="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center relative z-10">

        <!-- Prominent Face Alert Banner if face is missing or masked -->
        @if (examStarted() && !examEnded() && !currentFaceStatus().detected) {
          <div class="mb-4 p-4 rounded-2xl bg-rose-600 border-2 border-rose-300 text-white shadow-2xl flex items-center justify-between animate-pulse">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center text-xl">
                <i class="fa-solid fa-user-slash"></i>
              </div>
              <div>
                <p class="font-black text-sm">AVERTISSEMENT : AUCUN VISAGE DÉTECTÉ OU VISAGE MASQUÉ !</p>
                <p class="text-xs text-rose-100">Votre visage doit rester entièrement visible dans le champ de la caméra sous peine d'invalidation.</p>
              </div>
            </div>
            <span class="hidden sm:inline-block px-3 py-1 bg-black/40 rounded-xl text-xs font-extrabold uppercase tracking-wider">
              Infraction Enregistrée
            </span>
          </div>
        }

        <!-- ================= PHASE 1: PRE-EXAM WEBCAM & PERMISSIONS CHECK ================= -->
        @if (!examStarted() && !examEnded()) {
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-xl mx-auto shadow-2xl text-center">
            
            <div class="w-16 h-16 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-4 text-2xl">
              <i class="fa-solid fa-camera-web"></i>
            </div>

            <h2 class="text-2xl font-black text-white">Protocole de Surveillance Obligatoire</h2>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed">
              Cet examen utilise une surveillance en temps réel par webcam et un détecteur de perte de focus (changement d'onglets).
            </p>

            <!-- Proctoring Rules Summary -->
            <div class="my-6 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-left space-y-2.5 text-xs text-slate-300">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-400"></i>
                <span>Chaque question est <strong>éphémère</strong> avec un compte à rebours de <strong>{{ exam?.timePerQuestionSeconds }}s</strong> sans retour possible.</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-circle-exclamation text-amber-400"></i>
                <span>Quitter l'onglet ou réduire la fenêtre déclenchera un avertissement anti-triche (max {{ exam?.maxTabSwitchWarnings || 3 }}).</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-video text-brand-400"></i>
                <span>Votre webcam restera active pour vérifier la présence continue du candidat.</span>
              </div>
            </div>

            <!-- Webcam Live Preview -->
            <div class="w-64 h-48 mx-auto rounded-2xl overflow-hidden bg-black border-2 border-slate-700 mb-6 relative">
              <video #webcamVideo autoplay playsinline muted class="w-full h-full object-cover"></video>
              @if (!cameraActive()) {
                <div class="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-xs text-slate-400 p-2">
                  <i class="fa-solid fa-camera mr-2"></i> Initialisation caméra...
                </div>
              }
            </div>

            <button 
              (click)="startExamSession()"
              [disabled]="loading()"
              class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-brand-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2">
              <i class="fa-solid fa-play"></i> Démarrer l'examen en mode plein écran
            </button>

          </div>
        }

        <!-- ================= PHASE 2: LIVE EPHEMERAL QUESTION ================= -->
        @if (examStarted() && !examEnded()) {
          <div class="space-y-6 animate-in fade-in duration-300">
            
            <!-- Progress indicator -->
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span class="font-extrabold uppercase tracking-wider text-brand-400">
                Question {{ currentQuestionIndex + 1 }} sur {{ exam?.questions?.length }}
              </span>
              <span class="font-bold">
                Valeur : {{ getCurrentQuestion()?.points || 100 }} points
              </span>
            </div>

            <!-- Question Card -->
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
              
              <!-- Subtle Urgent Timer Pulse Bar -->
              <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-6">
                <div 
                  class="h-full transition-all duration-1000 ease-linear"
                  [class.bg-rose-500]="timeLeft <= 5"
                  [class.bg-amber-500]="timeLeft > 5 && timeLeft <= 10"
                  [class.bg-brand-500]="timeLeft > 10"
                  [style.width.%]="(timeLeft / (exam?.timePerQuestionSeconds || 30)) * 100"></div>
              </div>

              <h2 class="text-lg sm:text-2xl font-bold text-white leading-relaxed mb-6">
                {{ getCurrentQuestion()?.questionText }}
              </h2>

              <!-- Options Selection -->
              <div class="space-y-3">
                @for (opt of getCurrentQuestion()?.options; track opt.id; let idx = $index) {
                  <div 
                    (click)="selectOption(opt.id)"
                    [class.border-brand-500]="selectedOptionId === opt.id"
                    [class.bg-brand-950]="selectedOptionId === opt.id"
                    [class.border-slate-800]="selectedOptionId !== opt.id"
                    [class.bg-slate-800]="selectedOptionId !== opt.id"
                    class="p-4 rounded-2xl border hover:border-slate-700 cursor-pointer transition flex items-center justify-between group">
                    
                    <div class="flex items-center gap-3">
                      <div 
                        [class.bg-brand-600]="selectedOptionId === opt.id"
                        [class.border-brand-500]="selectedOptionId === opt.id"
                        [class.border-slate-600]="selectedOptionId !== opt.id"
                        class="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold">
                        @if (selectedOptionId === opt.id) {
                          <i class="fa-solid fa-check text-[10px] text-white"></i>
                        } @else {
                          <span class="text-[10px] text-slate-400">{{ getLetter(idx) }}</span>
                        }
                      </div>
                      <span class="text-sm font-semibold text-slate-200 group-hover:text-white transition">
                        {{ opt.optionText }}
                      </span>
                    </div>

                  </div>
                }
              </div>

              <!-- Footer with Next Button -->
              <div class="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span class="text-xs text-slate-400 italic">
                  <i class="fa-solid fa-lock text-[10px] mr-1"></i> Question éphémère (aucun retour en arrière)
                </span>

                <button 
                  (click)="submitAndNextQuestion()"
                  class="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition flex items-center gap-2">
                  <span>{{ currentQuestionIndex + 1 === exam?.questions?.length ? 'Clôturer l’épreuve' : 'Question suivante' }}</span>
                  <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>

            </div>

          </div>
        }

        <!-- ================= PHASE 3: POST-EXAM RESULTS & AI FEEDBACK ================= -->
        @if (examEnded()) {
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-xl mx-auto shadow-2xl text-center animate-in zoom-in-95 duration-300">
            
            <div class="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 text-3xl shadow-xl shadow-brand-500/30">
              <i class="fa-solid fa-trophy"></i>
            </div>

            <h2 class="text-2xl font-black text-white">Épreuve Terminée !</h2>
            <p class="text-xs text-slate-400 mt-1">Vos réponses ont été enregistrées et analysées avec succès.</p>

            <!-- Score Display -->
            <div class="my-6 p-6 rounded-2xl bg-slate-800/80 border border-slate-700">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Score & Points Obtenus</p>
              <div class="text-4xl font-black text-brand-400 my-1">
                {{ finalResult?.score || 0 }} <span class="text-lg font-bold text-slate-400">pts</span>
              </div>
              <p class="text-xs font-semibold text-slate-300">
                {{ finalResult?.correctAnswersCount || 0 }} / {{ finalResult?.totalQuestions || exam?.questions?.length }} réponses correctes
              </p>
            </div>

            <!-- Personalized AI Feedback -->
            @if (finalResult?.feedback) {
              <div class="p-4 rounded-2xl bg-brand-950/40 border border-brand-800 text-left mb-6">
                <h4 class="text-xs font-bold text-brand-300 flex items-center gap-1.5 mb-1.5">
                  <i class="fa-solid fa-robot"></i> Feedback Personnalisé par Intelligence Artificielle :
                </h4>
                <p class="text-xs text-slate-300 leading-relaxed">
                  {{ finalResult.feedback }}
                </p>
              </div>
            }

            <!-- Navigation Links -->
            <div class="flex flex-col sm:flex-row gap-3">
              <a 
                [routerLink]="['/classes', exam?.classId]"
                class="flex-1 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition">
                Retour à la classe
              </a>
            </div>

          </div>
        }

      </main>

      <!-- Bottom Status Bar -->
      <footer class="bg-slate-900/60 border-t border-slate-800 px-6 py-3 text-center text-[11px] text-slate-500">
        ClassPulse Secure Proctoring Engine &copy; 2026 - Conforme aux exigences d'intégrité académique
      </footer>

      <!-- Floating Picture-in-Picture Live Webcam Widget with Real-time Face Status -->
      @if (examStarted() && !examEnded()) {
        <div 
          [class.border-emerald-500]="currentFaceStatus().detected"
          [class.border-rose-500]="!currentFaceStatus().detected"
          [class.ring-4]="!currentFaceStatus().detected"
          [class.ring-rose-500]="!currentFaceStatus().detected"
          [class.animate-pulse]="!currentFaceStatus().detected"
          class="fixed bottom-6 right-6 z-40 w-48 h-36 rounded-2xl overflow-hidden bg-black border-2 shadow-2xl transition hover:scale-105 group">
          
          <video #liveCameraPip autoplay playsinline muted class="w-full h-full object-cover"></video>
          
          <div class="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-[9px] font-bold text-white border border-white/20">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> REC
          </div>

          <!-- Bottom Live Face Detection Indicator Pill -->
          <div class="absolute bottom-2 inset-x-2 text-center">
            @if (currentFaceStatus().detected) {
              <span class="inline-block px-2 py-0.5 rounded-full bg-emerald-500/90 backdrop-blur-md text-[9px] font-extrabold text-white shadow-sm">
                <i class="fa-solid fa-check mr-0.5"></i> Visage détecté
              </span>
            } @else {
              <span class="inline-block px-2 py-0.5 rounded-full bg-rose-600 backdrop-blur-md text-[9px] font-black text-white shadow-md animate-bounce">
                <i class="fa-solid fa-triangle-exclamation mr-0.5"></i> Visage masqué !
              </span>
            }
          </div>
        </div>
      }

      <!-- Anti-Tab Switch Alert Modal -->
      @if (showTabSwitchModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/80 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div class="bg-slate-900 border-2 border-rose-500 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl shadow-rose-950">
            <div class="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4 text-3xl animate-bounce">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 class="text-xl font-black text-white">Avertissement Anti-Triche !</h3>
            <p class="text-xs text-rose-300 mt-2">
              Une perte de focus ou un changement d’onglet a été détecté.
            </p>
            <div class="my-4 p-3 rounded-xl bg-slate-800 text-sm font-bold text-white">
              Avertissements : {{ tabSwitches }} sur {{ exam?.maxTabSwitchWarnings || 3 }}
            </div>
            <p class="text-[11px] text-slate-400 mb-6">
              Au 3ème avertissement, votre examen sera immédiatement clôturé et disqualifié.
            </p>
            <button 
              (click)="dismissTabSwitchModal()"
              class="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition">
              Je comprends et poursuis l'examen
            </button>
          </div>
        </div>
      }

      <!-- Face Absence / Masking Alert Modal -->
      @if (showFaceAlertModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/85 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div class="bg-slate-900 border-2 border-rose-500 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl shadow-rose-950">
            <div class="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4 text-3xl animate-pulse">
              <i class="fa-solid fa-user-slash"></i>
            </div>
            <h3 class="text-xl font-black text-white">Visage Masqué ou Absent !</h3>
            <p class="text-xs text-rose-300 mt-2">
              Le système de surveillance a détecté que votre visage a disparu du champ ou a été masqué.
            </p>
            <div class="my-4 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs font-medium text-slate-300 text-left space-y-1.5">
              <p class="flex items-center gap-2"><i class="fa-solid fa-circle-check text-emerald-400"></i> Placez-vous bien au centre face à l'objectif.</p>
              <p class="flex items-center gap-2"><i class="fa-solid fa-circle-xmark text-rose-400"></i> Ne couvrez pas votre visage avec vos mains ou un objet.</p>
              <p class="flex items-center gap-2"><i class="fa-solid fa-lightbulb text-amber-400"></i> Assurez-vous d'avoir un éclairage suffisant.</p>
            </div>
            <div class="text-[11px] text-slate-400 mb-5">
              Alertes enregistrées au tableau de bord enseignant : <strong>{{ proctorAlertCount }}</strong>
            </div>
            <button 
              (click)="dismissFaceAlertModal()"
              class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs transition shadow-lg shadow-rose-600/30">
              Je suis replacé face à la caméra
            </button>
          </div>
        </div>
      }

    </div>
  `
})
export class ExamTakeComponent implements OnInit, OnDestroy {
  @ViewChild('webcamVideo') webcamVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('liveCameraPip') liveCameraPip!: ElementRef<HTMLVideoElement>;

  examId = 0;
  exam: any = null;
  attempt: any = null;

  cameraActive = signal(false);
  examStarted = signal(false);
  examEnded = signal(false);
  loading = signal(false);

  currentQuestionIndex = 0;
  selectedOptionId: number | null = null;
  timeLeft = 30;
  questionTimer: any = null;
  questionStartTime = 0;

  tabSwitches = 0;
  showTabSwitchModal = signal(false);

  // Real-time Face Proctoring
  currentFaceStatus = signal<{ detected: boolean; faceCount: number; message: string; alertType?: any }>({
    detected: true,
    faceCount: 1,
    message: 'Visage vérifié'
  });
  showFaceAlertModal = signal(false);
  proctorAlertCount = 0;

  finalResult: any = null;
  private alertSub?: Subscription;
  private faceStatusSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examService: ExamService,
    private proctorService: ProctorService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.examId = parseInt(params['id'], 10);
      if (this.examId) {
        this.loadExamData();
      }
    });

    // Real-time Face Status stream
    this.faceStatusSub = this.proctorService.faceStatus$.subscribe(status => {
      this.currentFaceStatus.set(status);
      if (status.detected && this.showFaceAlertModal()) {
        // If student replacer face, automatically close after 1s
        setTimeout(() => {
          if (this.currentFaceStatus().detected) {
            this.showFaceAlertModal.set(false);
          }
        }, 1200);
      }
    });

    // Proctoring alert stream (triggered when face missing/masked or multiple faces)
    this.alertSub = this.proctorService.alertSubject.subscribe(alert => {
      if (this.attempt && this.examStarted() && !this.examEnded()) {
        this.proctorAlertCount++;
        this.showFaceAlertModal.set(true);

        this.examService.recordSecurityEvent(this.attempt.id, {
          type: alert.type,
          details: alert.details,
          snapshotUrl: alert.snapshotUrl
        }).subscribe();
      }
    });
  }

  dismissFaceAlertModal() {
    this.showFaceAlertModal.set(false);
  }

  ngOnDestroy() {
    this.stopTimer();
    this.proctorService.stopCamera();
    this.alertSub?.unsubscribe();
    this.faceStatusSub?.unsubscribe();
  }

  // Anti-Tab Switch Listeners
  @HostListener('document:visibilitychange', ['$event'])
  onVisibilityChange() {
    if (document.hidden && this.examStarted() && !this.examEnded()) {
      this.triggerAntiCheatEvent('tab_switch', 'Sortie d’onglet détectée via Visibility API.');
    }
  }

  @HostListener('window:blur', ['$event'])
  onWindowBlur() {
    if (this.examStarted() && !this.examEnded()) {
      this.triggerAntiCheatEvent('tab_switch', 'Perte de focus de la fenêtre de test.');
    }
  }

  triggerAntiCheatEvent(type: string, details: string) {
    if (!this.attempt) return;

    this.tabSwitches++;
    this.showTabSwitchModal.set(true);

    this.examService.recordSecurityEvent(this.attempt.id, {
      type,
      details
    }).subscribe(res => {
      if (res.autoDisqualified) {
        alert('Disqualification automatique : vous avez dépassé le nombre maximal de sorties d’écran autorisées.');
        this.finishExamSession();
      }
    });
  }

  dismissTabSwitchModal() {
    this.showTabSwitchModal.set(false);
  }

  loadExamData() {
    this.examService.getExamForTaking(this.examId).subscribe({
      next: (res) => {
        this.exam = res.exam;
        this.attempt = res.attempt;
        this.tabSwitches = res.attempt.tabSwitchCount || 0;
        this.initWebcamCheck();
      },
      error: (err) => {
        if (err.error?.alreadyCompleted) {
          alert('Vous avez déjà complété cet examen.');
          this.router.navigate(['/classes']);
        }
      }
    });
  }

  async initWebcamCheck() {
    setTimeout(async () => {
      if (this.webcamVideo?.nativeElement) {
        const ok = await this.proctorService.startCamera(this.webcamVideo.nativeElement);
        this.cameraActive.set(ok);
      }
    }, 400);
  }

  async startExamSession() {
    // Attempt fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      // Fullscreen permitted
    }

    this.examStarted.set(true);
    this.startQuestionTimer();

    // Hook live camera to PIP widget
    setTimeout(() => {
      if (this.liveCameraPip?.nativeElement && this.webcamVideo?.nativeElement?.srcObject) {
        this.liveCameraPip.nativeElement.srcObject = this.webcamVideo.nativeElement.srcObject;
      }
    }, 300);
  }

  getCurrentQuestion() {
    return this.exam?.questions?.[this.currentQuestionIndex];
  }

  getLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  selectOption(optionId: number) {
    this.selectedOptionId = optionId;
  }

  startQuestionTimer() {
    this.stopTimer();
    this.timeLeft = this.exam?.timePerQuestionSeconds || 30;
    this.questionStartTime = Date.now();

    this.questionTimer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.stopTimer();
        // Time ran out: auto-submit and move next!
        this.submitAndNextQuestion();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.questionTimer) {
      clearInterval(this.questionTimer);
      this.questionTimer = null;
    }
  }

  getTimerOffset(): number {
    const total = this.exam?.timePerQuestionSeconds || 30;
    const progress = (total - this.timeLeft) / total;
    return progress * 81.68; // 2 * PI * r (13) = ~81.68
  }

  submitAndNextQuestion() {
    this.stopTimer();

    const currentQ = this.getCurrentQuestion();
    const timeSpent = Math.round((Date.now() - this.questionStartTime) / 1000);

    if (this.attempt && currentQ) {
      this.examService.submitQuestionAnswer(this.attempt.id, {
        questionId: currentQ.id,
        selectedOptionId: this.selectedOptionId,
        timeSpentSeconds: timeSpent
      }).subscribe();
    }

    this.selectedOptionId = null;

    if (this.currentQuestionIndex + 1 < (this.exam?.questions?.length || 0)) {
      this.currentQuestionIndex++;
      this.startQuestionTimer();
    } else {
      this.finishExamSession();
    }
  }

  finishExamSession() {
    this.stopTimer();
    this.proctorService.stopCamera();

    if (this.attempt) {
      this.examService.finishExam(this.attempt.id).subscribe(res => {
        this.finalResult = res.attempt;
        this.examEnded.set(true);

        // Confetti celebration if score > 50%
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      });
    }
  }
}
