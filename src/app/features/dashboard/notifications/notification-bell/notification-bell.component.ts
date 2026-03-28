import {
  Component, OnInit, OnDestroy, signal,
  computed, inject, HostListener, ElementRef
} from '@angular/core';
import { CommonModule }         from '@angular/common';
import { Router }               from '@angular/router';
import {
  NotificationResponse, NotificationType, NOTIF_META
} from '../models/notification.models';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap }   from 'rxjs/operators';
import { NotificationService } from '../services/notification.service';

@Component({
  selector:    'app-notification-bell',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrls:   ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit, OnDestroy {

  private svc     = inject(NotificationService);
  private router  = inject(Router);
  private elRef   = inject(ElementRef);

  // ── State ───────────────────────────────────────────────────────────────────
  notifications = signal<NotificationResponse[]>([]);
  open          = signal(false);
  loading       = signal(false);
  markingAll    = signal(false);

  unreadCount  = computed(() => this.notifications().filter(n => !n.isRead).length);
  hasUnread    = computed(() => this.unreadCount() > 0);

  private poll?: Subscription;

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit() { this.startPolling(); }

  ngOnDestroy() { this.poll?.unsubscribe(); }

  private startPolling() {
    // Poll every 60 seconds — notifications are less urgent than orders
    this.poll = interval(60_000)
      .pipe(startWith(0), switchMap(() => this.svc.getUnread()))
      .subscribe({ next: ns => this.notifications.set(ns) });
  }

  // ── Toggle dropdown ──────────────────────────────────────────────────────────
  toggle() {
    const wasOpen = this.open();
    this.open.update(v => !v);

    // Mark all as read when closing
    if (wasOpen && this.hasUnread()) {
      this.markAll();
    }
  }

  close() { this.open.set(false); }

  // Close when clicking outside
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (this.open() && !this.elRef.nativeElement.contains(e.target)) {
      this.close();
    }
  }

  // Close on Escape
  @HostListener('document:keydown.escape')
  onEscape() { this.close(); }

  // ── Actions ───────────────────────────────────────────────────────────────────
  markAll() {
    if (!this.hasUnread()) return;
    this.markingAll.set(true);
    this.svc.markAllRead().subscribe({
      next: () => {
        this.notifications.update(ns =>
          ns.map(n => ({ ...n, isRead: true })));
        this.markingAll.set(false);
      },
      error: () => this.markingAll.set(false)
    });
  }

  clickNotification(n: NotificationResponse) {
    // Mark individual as read
    if (!n.isRead) {
      this.svc.markRead(n.id).subscribe();
      this.notifications.update(ns =>
        ns.map(x => x.id === n.id ? { ...x, isRead: true } : x));
    }

    // Navigate to action URL if present
    if (n.actionUrl) {
      this.close();
      this.router.navigateByUrl(n.actionUrl);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  getMeta(type: NotificationType) {
    return NOTIF_META[type] ?? NOTIF_META['new_order'];
  }

  formatTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);

    if (mins  < 1)   return 'just now';
    if (mins  < 60)  return `${mins}m ago`;
    if (hours < 24)  return `${hours}h ago`;
    if (days  < 7)   return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en', {
      day: 'numeric', month: 'short'
    });
  }
}