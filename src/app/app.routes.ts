import { Routes }          from '@angular/router';
import { inject }           from '@angular/core';
import { SubdomainService } from './core/services/subdomain.service';
import { authGuard }        from './core/guards/auth.guard';

export const routes: Routes = [

  // ── Public menu page ──────────────────────────────────────────────────────
  // Catches ALL routes when on a tenant subdomain (e.g. blackrabbit.menuify.tn).
  // The public menu page is a single-page app — it handles its own internal
  // state (selected category, modals, cart) without routing.
  {
    path:          '',
    canActivate:   [() => inject(SubdomainService).isDashboard()? true : inject(SubdomainService).isPublicMenu()],
    loadComponent: () => import('./features/public/menu-page/menu-page.component').then(m => m.MenuPageComponent),
    // Only activate this route on public-menu subdomains
    canMatch:      [() => inject(SubdomainService).isPublicMenu()],
  },

  // ── Auth pages ─────────────────────────────────────────────────────────────
  {
    path:         'auth',
    canMatch:     [() => inject(SubdomainService).isDashboard()],
    loadChildren: () =>
      import('./features/auth/auth.routes')
        .then(m => m.AUTH_ROUTES),
  },

  // ── Dashboard (owner interface) ────────────────────────────────────────────
  {
    path:          'dashboard',
    canMatch:      [() => inject(SubdomainService).isDashboard()],
    canActivate:   [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard/dashboard-shell/dashboard-shell.component')
        .then(m => m.DashboardShellComponent),
    children: [
      { path: '', redirectTo: 'menu', pathMatch: 'full' },
      {
        path:          'menu',
        loadChildren:  () =>
          import('./features/dashboard/menu/menu.routes')
            .then(m => m.MENU_ROUTES),
      },
      {
        path:          'orders',
        loadComponent: () =>
          import('./features/dashboard/orders/orders/orders.component')
            .then(m => m.OrdersComponent),
      },
      {
        path:          'theme',
        loadComponent: () =>
          import('./features/dashboard/theme/theme-editor/theme-editor.component')
            .then(m => m.ThemeEditorComponent),
      },
      {
        path:          'analytics',
        loadComponent: () =>
          import('./features/dashboard/analytics/analytics/analytics.component')
            .then(m => m.AnalyticsComponent),
      },
      {
        path:          'qr',
        loadComponent: () =>
          import('./features/dashboard/qr-codes/qr-codes/qr-codes.component')
            .then(m => m.QrCodesComponent),
      },
      {
        path:          'settings',
        loadComponent: () =>
          import('./features/dashboard/settings/settings/settings.component')
            .then(m => m.SettingsComponent),
      },
      {
        path:          'notifications',
        loadComponent: () =>
          import('./features/dashboard/notifications/notification-bell/notification-bell.component')
            .then(m => m.NotificationBellComponent),
      },
    ],
  },

  // ── Default redirects ──────────────────────────────────────────────────────
  // Dashboard subdomain: redirect root to /dashboard
  {
    path:      '',
    redirectTo:'dashboard',
    pathMatch: 'full',
    canMatch:  [() => inject(SubdomainService).isDashboard()],
  },

  // Catch-all on dashboard: redirect unknown paths to /dashboard
  {
    path:      '**',
    redirectTo:'dashboard',
    canMatch:  [() => inject(SubdomainService).isDashboard()],
  },

  // Catch-all on public menu: redirect everything to root
  // (the menu page handles its own internal navigation via signals)
  {
    path:      '**',
    redirectTo:'',
  },
];