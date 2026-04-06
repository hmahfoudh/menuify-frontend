import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('../admin/admin/admin.component').then(m => m.AdminComponent),
    },
    {
        path: '**',
        redirectTo: '',
    }
];