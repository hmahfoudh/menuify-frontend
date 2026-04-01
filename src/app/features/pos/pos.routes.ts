import { Routes } from '@angular/router';
import { posGuard } from '../../core/guards/pos.guard';

export const POS_ROUTES: Routes = [
    {
        path: 'login',
        loadComponent: () =>import('./pages/staff-login/staff-login.component').then(m => m.StaffLoginComponent),
    },
    {
        path: '',
        canActivate: [posGuard],
        loadComponent: () =>import('./pages/pos/pos.component').then(m => m.PosComponent),
    },
    {
        path: '**',
        redirectTo: '',
    }
];