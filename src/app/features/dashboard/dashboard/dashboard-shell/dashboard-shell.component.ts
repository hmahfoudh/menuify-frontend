import {
  Component, signal, computed, HostListener, inject, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderNotificationService } from '../../orders/services/order-notification.service';
import { EmailVerificationBannerComponent } from '../../../../shared/components/email-verification-banner/email-verification-banner.component';
import { ImpersonationBannerComponent } from '../../../../shared/components/impersonation-banner/impersonation-banner.component';
import { LocalStorageService } from '../../../../core/services/local-storage.service';

export interface NavItem {
  label: string;
  route: string;
  icon: string;          // inline SVG path data
  exact?: boolean;
  badge?: () => number;    // unread count etc.
}

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, EmailVerificationBannerComponent, ImpersonationBannerComponent],
  templateUrl: './dashboard-shell.component.html',
  styleUrls: ['./dashboard-shell.component.scss']
})
export class DashboardShellComponent implements OnInit {

  private auth = inject(AuthService);
  private orderNotif = inject(OrderNotificationService);
  private localStorage = inject(LocalStorageService);

  // Exposed to template for sidebar badge
  pendingOrderCount = this.orderNotif.pendingCount;
  hasNewOrder = this.orderNotif.hasNewOrder;
  private router = inject(Router);

  // ── State ──────────────────────────────────────────────────────────────────
  sidebarOpen = signal(false);   // mobile drawer
  sidebarCollapsed = signal(false); // desktop collapse (icon-only mode)
  pageTitle = signal('Dashboard');

  // ── User / tenant ──────────────────────────────────────────────────────────
  user = this.auth.currentUser;
  tenant = this.auth.currentTenant;
  userInitials = computed(() => {
    const name = this.user()?.fullName ?? this.user()?.email ?? '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });
  planLabel = computed(() => {
    const p = this.tenant()?.plan;
    if (!p) return '';
    return p.charAt(0) + p.slice(1).toLowerCase(); // "STARTER" → "Starter"
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  readonly navItems: NavItem[] = [
    {
      label: 'POS',
      route: '/pos',
      icon: 'M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M9 7h6'
    },
    {
      label: 'Menu',
      route: '/dashboard/menu',
      icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2'
    },
    {
      label: 'Orders',
      route: '/dashboard/orders',
      icon: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0'
    },
    {
      label: 'Theme',
      route: '/dashboard/theme',
      icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h4M18 12h4M12 2v4M12 18v4'
    },
    {
      label: 'Analytics',
      route: '/dashboard/analytics',
      icon: 'M18 20V10M12 20V4M6 20v-6'
    },
    {
      label: 'QR Codes',
      route: '/dashboard/qr',
      icon: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2M19 15v2M15 19h2v2M19 21h2M21 17h-2'
    },
    {
      label: 'Staff',
      route: '/dashboard/staff',
      icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'
    },
    {
      label: 'Tables',
      route: '/dashboard/tables',
      icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'
    },
    {
      label: 'Settings',
      route: '/dashboard/settings',
      icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'
    }
  ];

  public isSuperAdmin = computed(() => {
    try {
      const token = this.localStorage.get('access_token');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const roles: string[] = Array.isArray(payload.roles) ? payload.roles : [];
      return roles.includes('ROLE_SUPER_ADMIN');
    } catch { return false; }
  });

  // ── Page title from route ───────────────────────────────────────────────────
  ngOnInit() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const active = this.navItems.find(n =>
          this.router.url.startsWith(n.route));
        this.pageTitle.set(active?.label ?? 'Dashboard');
      });

    // Set initial title
    const active = this.navItems.find(n =>
      this.router.url.startsWith(n.route));
    this.pageTitle.set(active?.label ?? 'Dashboard');

    // Start the background order poll — runs for the entire session
    // regardless of which dashboard page the owner is on
    this.orderNotif.startPolling();
  }

  // ── Notification permission ────────────────────────────────────────────────
  pushEnabled = this.orderNotif.pushEnabled;

  async enablePushNotifications(): Promise<void> {
    await this.orderNotif.requestPushPermission();
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  closeSidebar() { this.sidebarOpen.set(false); }
  toggleCollapsed() { this.sidebarCollapsed.update(v => !v); }

  logout() {
    this.orderNotif.stopPolling();
    this.auth.logout();
  }

  // ── Close sidebar on Escape ────────────────────────────────────────────────
  @HostListener('document:keydown.escape')
  onEscape() { this.closeSidebar(); }
}