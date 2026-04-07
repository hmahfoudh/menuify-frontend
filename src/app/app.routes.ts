import { Routes } from '@angular/router';
import { inject }  from '@angular/core';
import { Router }  from '@angular/router';
import { SubdomainService } from './core/services/subdomain.service';
import { authGuard }  from './core/guards/auth.guard';
import { ownerGuard } from './core/guards/owner.guard';

export const routes: Routes = [

  // ── Landing page — bare domain (menuify.tn) ──────────────────────────────────
  {
    path:          '',
    canMatch:      [() => inject(SubdomainService).isLanding()],
    loadComponent: () =>
      import('./features/landing/landing/landing.component')
        .then(m => m.LandingComponent),
  },

  // ── Public menu — tenant subdomains (blackrabbit.menuify.tn) ─────────────────
  {
    path:          '',
    canMatch:      [() => inject(SubdomainService).isPublicMenu()],
    loadComponent: () =>
      import('./features/public/menu-page/menu-page.component')
        .then(m => m.MenuPageComponent),
  },

  // ── POS — tenant subdomain ───────────────────────────────────────────────────
  {
    path:     'pos',
    canMatch: [() => inject(SubdomainService).isTenantSubdomain()],
    loadChildren: () =>
      import('./features/pos/pos.routes')
        .then(m => m.POS_ROUTES),
  },

  // ── Auth pages ───────────────────────────────────────────────────────────────
  {
    path:         'auth',
    canMatch:     [() => inject(SubdomainService).isDashboard()],
    loadChildren: () =>
      import('./features/auth/auth.routes')
        .then(m => m.AUTH_ROUTES),
  },

  // ── Admin panel ──────────────────────────────────────────────────────────────
  {
    path:     'admin',
    canMatch: [() => inject(SubdomainService).isDashboard()],
    canActivate: [() => {
      const router = inject(Router);
      const token  = localStorage.getItem('accessToken');
      if (!token) return router.createUrlTree(['/auth/login']);
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('accessToken');
          return router.createUrlTree(['/auth/login']);
        }
        const roles: string[] = Array.isArray(payload.roles) ? payload.roles : [];
        if (roles.includes('ROLE_SUPER_ADMIN')) return true;
        return router.createUrlTree(['/dashboard']);
      } catch {
        return router.createUrlTree(['/auth/login']);
      }
    }],
    loadChildren: () =>
      import('./features/admin/admin.routes')
        .then(m => m.ADMIN_ROUTES),
  },

  // ── Dashboard ────────────────────────────────────────────────────────────────
  {
    path:          'dashboard',
    canMatch:      [() => inject(SubdomainService).isDashboard()],
    canActivate:   [authGuard, ownerGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard/dashboard-shell/dashboard-shell.component')
        .then(m => m.DashboardShellComponent),
    children: [
      { path: '', redirectTo: 'menu', pathMatch: 'full' },
      { path: 'menu',          loadChildren:  () => import('./features/dashboard/menu/menu.routes').then(m => m.MENU_ROUTES) },
      { path: 'orders',        loadComponent: () => import('./features/dashboard/orders/orders/orders.component').then(m => m.OrdersComponent) },
      { path: 'theme',         loadComponent: () => import('./features/dashboard/theme/theme-editor/theme-editor.component').then(m => m.ThemeEditorComponent) },
      { path: 'analytics',     loadComponent: () => import('./features/dashboard/analytics/analytics/analytics.component').then(m => m.AnalyticsComponent) },
      { path: 'qr',            loadComponent: () => import('./features/dashboard/qr-codes/qr-codes/qr-codes.component').then(m => m.QrCodesComponent) },
      { path: 'settings',      loadComponent: () => import('./features/dashboard/settings/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'notifications', loadComponent: () => import('./features/dashboard/notifications/notification-bell/notification-bell.component').then(m => m.NotificationBellComponent) },
      { path: 'staff',         loadComponent: () => import('./features/pos/pages/staff/staff.component').then(m => m.StaffComponent) },
      { path: 'tables',        loadComponent: () => import('./features/pos/pages/tables/tables.component').then(m => m.TablesComponent) },
    ],
  },

  // ── POS — dashboard subdomain (owner quick access) ───────────────────────────
  {
    path:     'pos',
    canMatch: [() => inject(SubdomainService).isDashboard()],
    loadChildren: () =>
      import('./features/pos/pos.routes')
        .then(m => m.POS_ROUTES),
  },

  // ── Default redirects ─────────────────────────────────────────────────────────
  // Dashboard unknown paths → /dashboard
  {
    path:      '**',
    redirectTo:'dashboard',
    canMatch:  [() => inject(SubdomainService).isDashboard()],
  },

  // Everything else (tenant subdomains, unknown) → public menu root
  {
    path:      '**',
    redirectTo:'',
  },
];