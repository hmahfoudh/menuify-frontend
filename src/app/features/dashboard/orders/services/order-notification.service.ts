import { Injectable, signal, inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith, map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

/**
 * Shared singleton that bridges the Orders component (which knows about
 * new orders) and the Dashboard Shell (which owns the sidebar badge).
 *
 * Handles three notification channels:
 *   1. Sound      — Web Audio API beeps (no asset required)
 *   2. Badge      — sidebar pulse via hasNewOrder signal
 *   3. Push       — browser Notification API (works when tab is backgrounded)
 *
 * Push notifications use the browser's built-in Notification API directly —
 * no service worker or VAPID keys required for same-origin notifications.
 * The notification appears in the OS notification tray while the tab is open.
 */
@Injectable({ providedIn: 'root' })
export class OrderNotificationService implements OnDestroy {

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private http      = inject(HttpClient);

  // Live count of PENDING orders — read by Shell sidebar badge
  readonly pendingCount = signal(0);

  // True for 4 seconds after a new order arrives — drives the pulse animation
  readonly hasNewOrder = signal(false);

  // Whether push permission has been granted
  readonly pushEnabled = signal(false);

  private previousCount = -1;   // -1 = not yet initialised
  private poll?: Subscription;
  private alertTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    if (this.isBrowser && 'Notification' in window) {
      this.pushEnabled.set(Notification.permission === 'granted');
    }
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
    clearTimeout(this.alertTimeout);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Starts the background poll for pending order count.
   * Call once from DashboardShellComponent.ngOnInit() — runs for the
   * entire dashboard session regardless of which page the owner is on.
   * Safe to call multiple times — stops any previous poll first.
   */
  startPolling(): void {
    this.poll?.unsubscribe();
    this.previousCount = -1;  // reset so first result sets baseline cleanly

    this.poll = interval(30_000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.http.get<any>(
            `${environment.apiUrl}/api/dashboard/orders`,
            { params: new HttpParams()
                .set('status', 'PENDING')
                .set('page', 0)
                .set('size', 1) }
          ).pipe(map((r: any) => (r.data?.totalElements ?? 0) as number))
        )
      )
      .subscribe({
        next: count => this.handlePollResult(count),
        error: ()    => { /* silent — next tick will retry */ }
      });
  }

  /**
   * Stops the background poll. Call on logout.
   */
  stopPolling(): void {
    this.poll?.unsubscribe();
    this.previousCount = -1;
    this.pendingCount.set(0);
  }

  private handlePollResult(count: number): void {
    if (this.previousCount === -1) {
      // First result — establish baseline, no alert
      this.previousCount = count;
      this.pendingCount.set(count);
      return;
    }

    const newOrders = count - this.previousCount;
    this.previousCount = count;
    this.pendingCount.set(count);

    if (newOrders > 0) {
      this.triggerAlert(newOrders);
    }
  }

  /**
   * Requests push notification permission from the browser.
   * Call this on a user gesture (e.g. clicking an "Enable notifications" button).
   * Returns true if permission was granted.
   */
  async requestPushPermission(): Promise<boolean> {
    if (!this.isBrowser || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      this.pushEnabled.set(true);
      return true;
    }
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    const granted = result === 'granted';
    this.pushEnabled.set(granted);
    return granted;
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private triggerAlert(newOrderCount: number): void {
    this.playSound();
    this.sendPushNotification(newOrderCount);

    // Pulse the badge for 4 seconds
    this.hasNewOrder.set(true);
    clearTimeout(this.alertTimeout);
    this.alertTimeout = setTimeout(() => this.hasNewOrder.set(false), 4000);
  }

  /**
   * Three short beeps via Web Audio API — no audio file required.
   * Gracefully silent if the browser blocks autoplay.
   */
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
    } catch {
      // AudioContext blocked — fail silently
    }
  }

  /**
   * Fires a browser push notification visible in the OS tray.
   * Only sends if permission has been granted.
   * Clicking the notification focuses the dashboard tab.
   */
  private sendPushNotification(count: number): void {
    if (!this.isBrowser) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const title = count === 1
      ? '🔔 New order received'
      : `🔔 ${count} new orders received`;

    const body = count === 1
      ? 'A customer placed a new order. Tap to review it.'
      : `${count} new orders are waiting for your confirmation.`;

    const notif = new Notification(title, {
      body,
      icon:  '/assets/brand/favicon.ico',
      badge: '/assets/brand/favicon.ico',
      tag:   'menuify-new-order',   // replaces previous unread notification
      requireInteraction: false,
    });

    // Clicking the notification brings the dashboard tab to the foreground
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  }
}