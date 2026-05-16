import {
  Component, signal, computed, HostListener, inject, OnInit
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslatePipe } from '@ngx-translate/core';
import { LangSwitcherComponent } from '../../../shared/components/lang-switcher/lang-switcher.component';
import { AuthService } from '../../../core/services/auth.service';
import { LocalStorageService } from '../../../core/services/local-storage.service';

export interface AdminNavItem {
  label: string;
  route: string;
  icon:  string;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    RouterLink, RouterLinkActive, RouterOutlet,
    LangSwitcherComponent, TranslatePipe
  ],
  templateUrl: './admin-shell.component.html',
  styleUrl:    './admin-shell.component.scss'
})
export class AdminShellComponent implements OnInit {

  private auth          = inject(AuthService);
  private router        = inject(Router);
  private localStorage  = inject(LocalStorageService);

  // ── Sidebar state ──────────────────────────────────────────────────────────
  sidebarOpen      = signal(false);
  sidebarCollapsed = signal(false);
  pageTitle        = signal('Admin');

  // ── User ───────────────────────────────────────────────────────────────────
  user = this.auth.currentUser;

  userInitials = computed(() => {
    const name = this.user()?.fullName ?? this.user()?.email ?? '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  // ── Does this super admin also own a tenant? ───────────────────────────────
  hasTenant = computed(() => !!this.auth.currentTenant());

  // ── Nav items ──────────────────────────────────────────────────────────────
  readonly navItems: AdminNavItem[] = [
    {
      label: 'Overview',
      route: '/admin/overview',
      icon:  'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'
    },
    {
      label: 'Tenants',
      route: '/admin/tenants',
      icon:  'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10'
    },
    {
      label: 'Blog',
      route: '/admin/blog',
      icon:  'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z'
    },
    {
      label: 'Settings',
      route: '/admin/settings',
      icon:  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'
    }
  ];

  // ── Page title from route ──────────────────────────────────────────────────
  ngOnInit(): void {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.updateTitle());
    this.updateTitle();
  }

  private updateTitle(): void {
    const match = this.navItems.find(n => this.router.url.startsWith(n.route));
    this.pageTitle.set(match?.label ?? 'Admin');
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  toggleSidebar()   { this.sidebarOpen.update(v => !v); }
  closeSidebar()    { this.sidebarOpen.set(false); }
  toggleCollapsed() { this.sidebarCollapsed.update(v => !v); }

  logout() { this.auth.logout(); }

  @HostListener('document:keydown.escape')
  onEscape() { this.closeSidebar(); }
}