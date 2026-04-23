// src/app/core/interceptors/tenant.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { LocalStorageService } from '../services/local-storage.service';
import { SubdomainService } from '../services/subdomain.service';

export const REQUEST = new InjectionToken<any>('REQUEST');

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId   = inject(PLATFORM_ID);
  const subdomainSvc = inject(SubdomainService);
  const auth         = inject(AuthService);
  const storage      = inject(LocalStorageService);

  // SSR: forward original Host header so the backend can resolve the tenant
  if (!isPlatformBrowser(platformId)) {
    const nodeReq = inject(REQUEST, { optional: true });
    const host = nodeReq?.headers?.['host'];
    if (host) {
      return next(req.clone({
        setHeaders: { 'X-Original-Host': host }
      }));
    }
    return next(req);
  }

  // Browser: existing logic unchanged ↓
  let subdomain: string | null = null;

  if (subdomainSvc.isDashboard()) {
    subdomain = auth.currentTenant()?.subdomain ?? null;
  } else {
    const cached = storage.getJson<{ subdomain: string }>('tenant');
    subdomain = cached?.subdomain ?? subdomainSvc.getSubdomain();
  }

  if (!subdomain) return next(req);

  return next(req.clone({
    setHeaders: { 'X-Tenant-Subdomain': subdomain }
  }));
};