import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { SubdomainService } from './core/services/subdomain.service';
import { authGuard } from './core/guards/auth.guard';
import { ownerGuard } from './core/guards/owner.guard';

export const routes: Routes = [

  // ── Public menu page ──────────────────────────────────────────────────────
  // Catches ALL routes when on a tenant subdomain (e.g. blackrabbit.menuify.tn).
  // The public menu page is a single-page app — it handles its own internal
  // state (selected category, modals, cart) without routing.
  {
    path: 'menu',
    canActivate: [() => inject(SubdomainService).isDashboard() ? true : inject(SubdomainService).isPublicMenu()],
    loadComponent: () => import('./features/public/menu-page/menu-page.component').then(m => m.MenuPageComponent),
    // Only activate this route on public-menu subdomains
    canMatch: [() => inject(SubdomainService).isPublicMenu()],
  },

  // ── Auth pages ─────────────────────────────────────────────────────────────
  {
    path: 'auth',
    canMatch: [() => inject(SubdomainService).isDashboard()],
    loadChildren: () =>
      import('./features/auth/auth.routes')
        .then(m => m.AUTH_ROUTES),
  },
  {
    path: 'admin',
    canMatch: [() => inject(SubdomainService).isDashboard()],
    loadChildren: () =>
      import('./features/admin/admin.routes')
        .then(m => m.ADMIN_ROUTES),
  },

  // ── Dashboard (owner interface) ────────────────────────────────────────────
  {
    path: 'dashboard',
    canMatch: [() => inject(SubdomainService).isDashboard()],
    canActivate: [authGuard, ownerGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard/dashboard-shell/dashboard-shell.component')
        .then(m => m.DashboardShellComponent),
    children: [
      { path: '', redirectTo: 'menu', pathMatch: 'full' },
      {
        path: 'menu',
        loadChildren: () =>
          import('./features/dashboard/menu/menu.routes')
            .then(m => m.MENU_ROUTES),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/dashboard/orders/orders/orders.component')
            .then(m => m.OrdersComponent),
      },
      {
        path: 'theme',
        loadComponent: () =>
          import('./features/dashboard/theme/theme-editor/theme-editor.component')
            .then(m => m.ThemeEditorComponent),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/dashboard/analytics/analytics/analytics.component')
            .then(m => m.AnalyticsComponent),
      },
      {
        path: 'qr',
        loadComponent: () =>
          import('./features/dashboard/qr-codes/qr-codes/qr-codes.component')
            .then(m => m.QrCodesComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/dashboard/settings/settings/settings.component')
            .then(m => m.SettingsComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/dashboard/notifications/notification-bell/notification-bell.component')
            .then(m => m.NotificationBellComponent),
      },
      {
        path: 'staff',
        loadComponent: () =>
          import('./features/pos/pages/staff/staff.component')
            .then(m => m.StaffComponent),
      },
      {
        path: 'tables',
        loadComponent: () =>
          import('./features/pos/pages/tables/tables.component')
            .then(m => m.TablesComponent),
      },
    ],
  },

  // ── POS (Point of Sale) ────────────────────────────────────────────────────
  // Accessible by both OWNER (via main JWT) and STAFF (via PIN JWT).
  // The posGuard handles authentication. Staff login screen is at /pos/login.
  {
    path: 'pos',
    canMatch: [() => inject(SubdomainService).isTenantSubdomain()],
    loadChildren: () =>
      import('./features/pos/pos.routes')
        .then(m => m.POS_ROUTES),
  },

  // ── POS — dashboard subdomain (owner quick access) ──────────────────────────
  // app.menuify.tn/pos  → owner uses their existing JWT, skips staff login
  {
    path: 'pos',
    canMatch: [() => inject(SubdomainService).isDashboard()],
    loadChildren: () =>
      import('./features/pos/pos.routes')
        .then(m => m.POS_ROUTES),
  },


  // ── Default redirects ──────────────────────────────────────────────────────
  // Dashboard subdomain: redirect unknown paths → /dashboard
  // (root '' is handled by the dashboard route's own child redirect)
  {
    path:      '**',
    pathMatch: 'full',
    redirectTo:'dashboard',
    canMatch:  [() => inject(SubdomainService).isDashboard()],
  },

  // Default for everything else (tenant subdomains, unknown hosts):
  // redirect to '' which matches the public menu route.
  // This also prevents the SSR flash — on slow connections the server
  // renders '' which matches the public menu canMatch, not the login page.
  {
    path:      '**',
    redirectTo:'menu',
  },
];