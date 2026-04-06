import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { LocalStorageService } from '../services/local-storage.service';

/**
 * Blocks staff sessions from accessing /dashboard/* routes.
 *
 * Token shape (post-fix):
 *   roles:     string[]   e.g. ["ROLE_OWNER"] or ["ROLE_STAFF"]
 *   tokenType: string     "STAFF" on staff tokens only (explicit discriminator)
 *
 * A token is a staff token if EITHER:
 *   - tokenType === "STAFF", OR
 *   - roles contains "ROLE_STAFF" but not any owner/admin role
 *
 * Staff are redirected to /pos. Expired tokens redirect to /auth/login.
 */
export const ownerGuard: CanActivateFn = () => {
  const localStorage = inject(LocalStorageService);
  const router = inject(Router);
  const token = localStorage.get('access_token');

  if (!token) return router.createUrlTree(['/auth/login']);

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Check expiry first
    if (payload.exp * 1000 < Date.now()) {
      localStorage.remove('access_token');
      return router.createUrlTree(['/auth/login']);
    }

    const roles: string[] = Array.isArray(payload.roles) ? payload.roles : [];

    // Super admins belong in /admin, not /dashboard
    if (roles.includes('ROLE_SUPER_ADMIN')) {
      return router.createUrlTree(['/admin']);
    }

    // Staff tokens belong in /pos, not /dashboard
    const isStaff = payload.tokenType === 'STAFF'
      || (roles.includes('ROLE_STAFF') && !roles.includes('ROLE_OWNER'));

    if (isStaff) {
      return router.createUrlTree(['/pos']);
    }

    return true;
  } catch {
    return router.createUrlTree(['/auth/login']);
  }
};