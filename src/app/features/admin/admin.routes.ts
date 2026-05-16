import { Routes } from '@angular/router';
import { superAdminGuard } from '../../core/guards/super-admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [superAdminGuard],
    loadComponent: () => import('./admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
    //   {
    //     path: 'overview',
    //     loadComponent: () => import('./pages/stats/stats.component')
    //       .then(m => m.StatsComponent)
    //   },
      {
        path: 'tenants',
        loadComponent: () => import('./pages/tenants/tenants.component')
          .then(m => m.TenantsComponent)
      },
      {
        path: 'tenants/new',
        loadComponent: () => import('./pages/create-tenant/create-tenant.component')
          .then(m => m.CreateTenantComponent)
      },
      {
        path: 'blog',
        loadChildren: () => import('./pages/blog/blog-admin.routes')
          .then(m => m.BLOG_ADMIN_ROUTES)
      },
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full'
      }
    ]
  }
];