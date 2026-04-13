import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SubdomainService } from '../services/subdomain.service';

export const tenantRedirectGuard: CanActivateFn = () => {
  const subdomainService = inject(SubdomainService);
  const router = inject(Router);

  const isTenant = subdomainService.isTenantSubdomain();
  const currentUrl = router.url;

  // If user is on a tenant subdomain and NOT already on /menu → redirect
  if (isTenant && !currentUrl.startsWith('/menu')) {
    return router.createUrlTree(['/menu']);
  }

  return true;
};