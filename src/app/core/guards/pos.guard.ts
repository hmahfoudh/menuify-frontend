import { inject }        from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router }        from '@angular/router';
import { PosAuthService } from '../../features/pos/services/pos-auth.service';

/**
 * Allows access to /pos routes if:
 *   - Owner is logged in (valid accessToken with ROLE_OWNER), OR
 *   - Staff has a valid PIN session (posToken with ROLE_STAFF, not expired)
 *
 * Redirects to /pos/login if neither condition is met.
 */
export const posGuard: CanActivateFn = () => {
  const posAuth = inject(PosAuthService);
  const router  = inject(Router);

  if (posAuth.canAccessPOS()) return true;

  return router.createUrlTree(['/pos/login']);
};