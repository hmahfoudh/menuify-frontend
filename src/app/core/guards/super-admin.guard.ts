import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { LocalStorageService } from '../services/local-storage.service';

/**
 * Allows access only to users with ROLE_SUPER_ADMIN in their JWT.
 * Anyone else is redirected to /dashboard.
 */
export const superAdminGuard: CanActivateFn = () => {
    const localStorage = inject(LocalStorageService);
    const router = inject(Router);
    const token = localStorage.get('access_token');

    if (!token) return router.createUrlTree(['/auth/login']);

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        if (payload.exp * 1000 < Date.now()) {
            localStorage.remove('access_token');
            return router.createUrlTree(['/auth/login']);
        }

        const roles: string[] = Array.isArray(payload.roles) ? payload.roles : [];
        if (roles.includes('ROLE_SUPER_ADMIN')) return true;

        return router.createUrlTree(['/dashboard']);
    } catch {
        return router.createUrlTree(['/auth/login']);
    }
};