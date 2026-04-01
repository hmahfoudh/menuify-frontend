import { inject }        from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router }        from '@angular/router';
import { LocalStorageService } from '../services/local-storage.service';

/**
 * Basic authentication guard — ensures a valid, non-expired accessToken exists.
 *
 * Does NOT check roles — use ownerGuard or posGuard for role-specific access.
 * Staff tokens (tokenType === "STAFF") are considered authenticated here;
 * ownerGuard handles the redirection of staff away from /dashboard.
 */
export const authGuard: CanActivateFn = () => {
  const localStorage = inject(LocalStorageService);
  const router = inject(Router);
  const token  = localStorage.get('access_token');

  if (!token) return router.createUrlTree(['/auth/login']);

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.remove('access_token');
      return router.createUrlTree(['/auth/login']);
    }
    return true;
  } catch {
    return router.createUrlTree(['/auth/login']);
  }
};