// src/app/core/interceptors/tenant.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }   from '@angular/common';
import { AuthService }         from '../services/auth.service';
import { LocalStorageService } from '../services/local-storage.service';
import { SubdomainService }    from '../services/subdomain.service';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId   = inject(PLATFORM_ID);
  const subdomainSvc = inject(SubdomainService);
  const auth         = inject(AuthService);
  const storage      = inject(LocalStorageService);

  // Skip on server
  if (!isPlatformBrowser(platformId)) return next(req);

  // Skip public tracking endpoints — they already carry the subdomain header
  // set manually in PublicMenuService
  // if (req.url.includes('/api/menu') || req.url.includes('/api/orders')) {
  //   return next(req);
  // }

  let subdomain: string | null = null;

  if (subdomainSvc.isDashboard()) {
    // Dashboard: read subdomain from the logged-in tenant
    subdomain = auth.currentTenant()?.subdomain ?? null;
  } else {
    // Public menu: read subdomain from the cached public tenant info
    const cached = storage.getJson<{ subdomain: string }>('tenant');
    subdomain = cached?.subdomain ?? subdomainSvc.getSubdomain();
  }

  if (!subdomain) return next(req);

  return next(req.clone({
    setHeaders: { 'X-Tenant-Subdomain': subdomain }
  }));
};