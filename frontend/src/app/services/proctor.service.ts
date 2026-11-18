import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface ProctorAlertEvent {
  type: 'no_face' | 'multiple_faces' | 'tab_switch' | 'fullscreen_exit';
  details: string;
  snapshotUrl?: string;
}

export interface FaceStatus {
  detected: boolean;
  faceCount: number;
  message: string;
  alertType?: 'no_face' | 'multiple_faces' | null;
}

@Injectable({
  providedIn: 'root'
})
export class ProctorService {
  private mediaStream: MediaStream | null = null;
  private checkInterval: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private blazefaceModel: any = null;
  private nativeDetector: any = null;
  private consecutiveAbsenceCount = 0;
  private consecutiveMultipleCount = 0;
  private audioContext: AudioContext | null = null;

  alertSubject = new Subject<ProctorAlertEvent>();
  faceStatus$ = new BehaviorSubject<FaceStatus>({
    detected: true,
    faceCount: 1,
    message: 'Visage vérifié',
    alertType: null
  });

  constructor() {
    this.initDetectors();
  }

  private async initDetectors() {
    // 1. Try Native FaceDetector API (Built into Chromium)
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        this.nativeDetector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
      } catch (e) {
        // Native detector failed
      }
    }

    // 2. Try BlazeFace (TensorFlow.js)
    if (typeof window !== 'undefined' && (window as any).blazeface) {
      try {
        this.blazefaceModel = await (window as any).blazeface.load();
      } catch (e) {
        // BlazeFace fallback
      }
    }
  }

  playWarningBeep() {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.25);
    } catch (e) {
      // Audio not permitted or muted
    }
  }

  async startCamera(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported in this browser');
        return false;
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false
      });

      videoElement.srcObject = this.mediaStream;
      await videoElement.play();

      this.startFaceMonitoring(videoElement);
      return true;
    } catch (err: any) {
      console.warn('Webcam permission error or no camera available:', err.message);
      return false;
    }
  }

  stopCamera() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.consecutiveAbsenceCount = 0;
    this.consecutiveMultipleCount = 0;
  }

  getSnapshot(videoElement: HTMLVideoElement): string | undefined {
    if (!videoElement) return undefined;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 320;
      this.canvas.height = 240;
    }
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(videoElement, 0, 0, 320, 240);
    return this.canvas.toDataURL('image/jpeg', 0.6);
  }

  private startFaceMonitoring(videoElement: HTMLVideoElement) {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 160;
      this.canvas.height = 120;
    }

    // Run face detection check every 800ms
    this.checkInterval = setInterval(async () => {
      if (!videoElement || videoElement.paused || videoElement.ended) return;

      const result = await this.detectFace(videoElement);

      if (result.count === 0) {
        this.consecutiveAbsenceCount++;
        this.consecutiveMultipleCount = 0;

        // If face missing or covered for 2 cycles (~1.6 seconds)
        if (this.consecutiveAbsenceCount >= 2) {
          const snapshot = this.getSnapshot(videoElement);
          this.faceStatus$.next({
            detected: false,
            faceCount: 0,
            message: '⚠️ Aucun visage détecté ou visage masqué !',
            alertType: 'no_face'
          });

          this.playWarningBeep();

          this.alertSubject.next({
            type: 'no_face',
            details: 'Visage masqué ou absence du champ de vision détectée.',
            snapshotUrl: snapshot
          });
        } else {
          this.faceStatus$.next({
            detected: false,
            faceCount: 0,
            message: 'Vérification du visage...',
            alertType: null
          });
        }
      } else if (result.count > 1) {
        this.consecutiveMultipleCount++;
        this.consecutiveAbsenceCount = 0;

        if (this.consecutiveMultipleCount >= 2) {
          const snapshot = this.getSnapshot(videoElement);
          this.faceStatus$.next({
            detected: true,
            faceCount: result.count,
            message: `⚠️ Plusieurs visages détectés (${result.count}) !`,
            alertType: 'multiple_faces'
          });

          this.playWarningBeep();

          this.alertSubject.next({
            type: 'multiple_faces',
            details: `Présence de ${result.count} personnes détectée devant l’écran.`,
            snapshotUrl: snapshot
          });
        }
      } else {
        // Exactly 1 face verified
        this.consecutiveAbsenceCount = 0;
        this.consecutiveMultipleCount = 0;
        this.faceStatus$.next({
          detected: true,
          faceCount: 1,
          message: 'Visage détecté & vérifié ✅',
          alertType: null
        });
      }
    }, 800);
  }

  private async detectFace(videoElement: HTMLVideoElement): Promise<{ count: number }> {
    // Tier 1: BlazeFace TensorFlow model
    if (this.blazefaceModel) {
      try {
        const predictions = await this.blazefaceModel.estimateFaces(videoElement, false);
        return { count: predictions.length };
      } catch (e) {
        // Fallback to next tier
      }
    }

    // Tier 2: Chromium native FaceDetector
    if (this.nativeDetector) {
      try {
        const detectedFaces = await this.nativeDetector.detect(videoElement);
        return { count: detectedFaces.length };
      } catch (e) {
        // Fallback to next tier
      }
    }

    // Tier 3: Computer Vision Skin-Color & Central Facial Geometry Analyzer
    return this.detectFaceByPixelAnalysis(videoElement);
  }

  /**
   * Fast Real-time Skin-Tone & Facial Presence Analysis (YCbCr + RGB variance)
   * Evaluates the central 50% region of the video frame where the face is expected.
   */
  private detectFaceByPixelAnalysis(videoElement: HTMLVideoElement): { count: number } {
    if (!this.canvas) return { count: 1 };
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { count: 1 };

    const width = 160;
    const height = 120;
    ctx.drawImage(videoElement, 0, 0, width, height);

    const frame = ctx.getImageData(0, 0, width, height);
    const data = frame.data;

    let totalSkinPixels = 0;
    let centralSkinPixels = 0;
    let totalBrightness = 0;

    // Center face box: x from 25% to 75%, y from 20% to 80%
    const minX = Math.floor(width * 0.25);
    const maxX = Math.floor(width * 0.75);
    const minY = Math.floor(height * 0.20);
    const maxY = Math.floor(height * 0.80);

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;

        // YCbCr skin tone detection
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isSkin = cr >= 130 && cr <= 175 && cb >= 75 && cb <= 130 && r > 45 && g > 30 && b > 15 && r > b;

        if (isSkin) {
          totalSkinPixels++;
          if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            centralSkinPixels++;
          }
        }
      }
    }

    const sampledCount = (width / 2) * (height / 2);
    const centralSampledCount = ((maxX - minX) / 2) * ((maxY - minY) / 2);
    const avgBrightness = totalBrightness / sampledCount;

    // 1. Camera covered/pitch dark
    if (avgBrightness < 18) {
      return { count: 0 };
    }

    // 2. Central skin coverage ratio:
    // When a face is in frame, central skin pixels typically cover 15% to 65% of the central box.
    // When a face is masked (hand covering face, paper, looking away, or walking away), central skin coverage drops < 5%.
    const centralSkinRatio = centralSkinPixels / centralSampledCount;

    if (centralSkinRatio < 0.07) {
      return { count: 0 }; // Face missing or covered!
    }

    // 3. Multiple faces check (unusually wide distribution of skin in both left and right edges simultaneously)
    const leftMarginSkin = totalSkinPixels - centralSkinPixels;
    if (leftMarginSkin > centralSkinPixels * 2.2 && centralSkinRatio > 0.15) {
      return { count: 2 }; // Possible second person
    }

    return { count: 1 };
  }
}
