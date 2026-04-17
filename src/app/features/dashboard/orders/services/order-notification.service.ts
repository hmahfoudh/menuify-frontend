import { Injectable, signal, inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class OrderNotificationService implements OnDestroy {

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private auth      = inject(AuthService);

  readonly pendingCount = signal(0);
  readonly hasNewOrder  = signal(false);
  readonly pushEnabled  = signal(false);

  private eventSource:     EventSource | null = null;
  private reconnectTimer:  ReturnType<typeof setTimeout> | null = null;
  private alertTimeout:    ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (this.isBrowser && 'Notification' in window) {
      this.pushEnabled.set(Notification.permission === 'granted');
    }
  }

  ngOnDestroy(): void {
    this.stopStream();
    clearTimeout(this.alertTimeout ?? undefined);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Opens the SSE connection.
   * Call once from DashboardShellComponent.ngOnInit().
   * Safe to call multiple times — closes any existing connection first.
   */
  startPolling(): void {
    if (!this.isBrowser) return;
    this.stopStream();
    this.connect();
  }

  /**
   * Closes the SSE connection. Call on logout.
   */
  stopPolling(): void {
    this.stopStream();
    this.pendingCount.set(0);
  }

  async requestPushPermission(): Promise<boolean> {
    if (!this.isBrowser || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') { this.pushEnabled.set(true); return true; }
    if (Notification.permission === 'denied') return false;

    const result  = await Notification.requestPermission();
    const granted = result === 'granted';
    this.pushEnabled.set(granted);
    return granted;
  }

  // ── SSE ────────────────────────────────────────────────────────────────────

  private connect(): void {
    const tenantId = this.auth.currentTenant()?.id;

    if (!tenantId) return;

    const url = `${environment.apiUrl}/api/orders/stream`
              + `?tenantId=${encodeURIComponent(tenantId)}`;

    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_ORDER') {
          this.pendingCount.update(n => n + 1);
          this.triggerAlert();
        }
      } catch {
        console.warn('SSE parse error', event.data);
      }
    };

    this.eventSource.onerror = () => {
      this.stopStream();
      this.reconnectTimer = setTimeout(() => this.connect(), 5_000);
    };
  }

  private stopStream(): void {
    this.eventSource?.close();
    this.eventSource = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ── Alert ──────────────────────────────────────────────────────────────────

  private triggerAlert(): void {
    this.playSound();
    this.sendPushNotification();

    this.hasNewOrder.set(true);
    if (this.alertTimeout) clearTimeout(this.alertTimeout);
    this.alertTimeout = setTimeout(() => this.hasNewOrder.set(false), 4_000);
  }

  private playSound(): void {
    if (!this.isBrowser) return;
    try {
      const ctx  = new AudioContext();
      const play = (startAt: number) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, startAt);
        gain.gain.setValueAtTime(0.35, startAt);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.12);
        osc.start(startAt);
        osc.stop(startAt + 0.13);
      };
      const now = ctx.currentTime;
      play(now);
      play(now + 0.18);
      play(now + 0.36);
      setTimeout(() => ctx.close(), 800);
    } catch { /* autoplay blocked — fail silently */ }
  }

  private sendPushNotification(): void {
    if (!this.isBrowser) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const notif = new Notification('🔔 New order received', {
      body:              'A customer placed a new order. Tap to review it.',
      icon:              '/assets/brand/favicon.ico',
      badge:             '/assets/brand/favicon.ico',
      tag:               'menuify-new-order',
      requireInteraction: false,
    });

    notif.onclick = () => { window.focus(); notif.close(); };
  }
}