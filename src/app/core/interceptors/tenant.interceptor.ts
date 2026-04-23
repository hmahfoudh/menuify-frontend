import { HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken, PLATFORM_ID } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LocalStorageService } from '../services/local-storage.service';
import { SubdomainService } from '../services/subdomain.service';


export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const subdomainSvc = inject(SubdomainService);
  const auth         = inject(AuthService);
  const storage      = inject(LocalStorageService);
  const host = subdomainSvc.getHost();
  

  // Browser: existing logic unchanged ↓
  let subdomain: string | null = null;

  if (subdomainSvc.isDashboard()) {
    subdomain = auth.currentTenant()?.subdomain ?? null;
  } else {
    const cached = storage.getJson<{ subdomain: string }>('tenant');
    subdomain = cached?.subdomain ?? subdomainSvc.getSubdomain();
  }

  if (!subdomain) return next(req);
    console.log('[SSR Tenant] host:', host); 
    if (host) {
      console.log("inside host");
      return next(req.clone({
        setHeaders: { 'X-Original-Host': host, 'X-Tenant-Subdomain': subdomain }
      }));
    }
    console.log("outside")
  return next(req.clone({
    setHeaders: { 'X-Tenant-Subdomain': subdomain }
  }));
};