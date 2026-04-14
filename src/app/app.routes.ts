import { Routes } from '@angular/router';
import { authGuard }  from './core/guards/auth.guard';
import { ownerGuard } from './core/guards/owner.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';
import { tenantRedirectGuard } from './core/guards/tenant-redirect.guards';

export const routes: Routes = [

  // ── Landing page — bare domain (menuify.tn) ──────────────────────────────────
  {
    path:          '',
    canActivate: [tenantRedirectGuard],
    loadComponent: () =>import('./features/landing/landing/landing.component').then(m => m.LandingComponent),
  },

  // ── Public menu — tenant subdomains (blackrabbit.menuify.tn) ─────────────────
  {
    path:          'menu',
    loadComponent: () =>import('./features/public/menu-page/menu-page.component').then(m => m.MenuPageComponent),
  },

  // ── POS — tenant subdomain ───────────────────────────────────────────────────
  {
    path:     'dashboard/pos',
    loadChildren: () =>import('./features/pos/pos.routes').then(m => m.POS_ROUTES),
  },

  // ── Auth pages ───────────────────────────────────────────────────────────────
  {
    path:         'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes')
        .then(m => m.AUTH_ROUTES),
  },

  // ── Admin panel ──────────────────────────────────────────────────────────────
  {
    path:     'admin',
    canActivate: [authGuard, superAdminGuard],
    loadChildren: () =>import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  // ── Dashboard ────────────────────────────────────────────────────────────────
  {
    path:          'dashboard',
    canActivate:   [authGuard, ownerGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard/dashboard-shell/dashboard-shell.component').then(m => m.DashboardShellComponent),
    children: [
      { path: '', redirectTo: 'menu', pathMatch: 'full' },
      { path: 'menu',          loadChildren:  () => import('./features/dashboard/menu/menu.routes').then(m => m.MENU_ROUTES) },
      { path: 'orders',        loadComponent: () => import('./features/dashboard/orders/pages/orders/orders.component').then(m => m.OrdersComponent) },
      { path: 'history',       loadComponent: () => import('./features/dashboard/orders/pages/order-history/order-history.component').then(m => m.OrderHistoryComponent) },
      { path: 'theme',         loadComponent: () => import('./features/dashboard/theme/theme-editor/theme-editor.component').then(m => m.ThemeEditorComponent) },
      { path: 'analytics',     loadComponent: () => import('./features/dashboard/analytics/analytics/analytics.component').then(m => m.AnalyticsComponent) },
      { path: 'tables',        loadComponent: () => import('./features/dashboard/tables/tables/tables.component').then(m => m.TablesComponent) },
      { path: 'settings',      loadComponent: () => import('./features/dashboard/settings/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'notifications', loadComponent: () => import('./features/dashboard/notifications/notification-bell/notification-bell.component').then(m => m.NotificationBellComponent) },
      { path: 'staff',         loadComponent: () => import('./features/pos/pages/staff/staff.component').then(m => m.StaffComponent) },
    ],
  },

  // ── POS — dashboard subdomain (owner quick access) ───────────────────────────
  {
    path:     'pos',
    loadChildren: () =>import('./features/pos/pos.routes').then(m => m.POS_ROUTES),
  },

  // ── Default redirects ─────────────────────────────────────────────────────────
  // Dashboard unknown paths → /dashboard
  {
    path:      '**',
    redirectTo:'',
  },

  // Everything else (tenant subdomains, unknown) → public menu root
  {
    path:      '**',
    redirectTo:'',
  },
];