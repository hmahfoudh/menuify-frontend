import { inject }        from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router }        from '@angular/router';
import { PosAuthService } from '../../features/pos/services/pos-auth.service';
import { AuthService } from '../services/auth.service';

/**
 * Allows access to /pos routes if:
 *   - Owner is logged in (valid accessToken with ROLE_OWNER), OR
 *   - Staff has a valid PIN session (access_token with ROLE_STAFF, not expired)
 *
 * Redirects to /pos/login if neither condition is met.
 */
export const posGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router  = inject(Router);

  if (authService.canAccessPOS()) return true;

  return router.createUrlTree(['/pos/login']);
};