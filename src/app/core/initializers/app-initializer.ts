// src/app/core/initializers/app-initializer.ts
import { inject, PLATFORM_ID }   from '@angular/core';
import { isPlatformBrowser }      from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SubdomainService }        from '../services/subdomain.service';
import { LocalStorageService }     from '../services/local-storage.service';
import { environment }             from '../../../environments/environment';

export interface PublicTenantInfo {
  subdomain:      string;
  name:           string;
  logoUrl:        string | null;
  tagline:        string | null;
  whatsappNumber: string | null;
  currencySymbol: string;
  address:        string | null;
}

export function initApp(): () => Promise<void> {
  const subdomainSvc = inject(SubdomainService);
  const storage      = inject(LocalStorageService);
  const http         = inject(HttpClient);
  const platformId   = inject(PLATFORM_ID);

  return (): Promise<void> => new Promise<void>((resolve) => {

    // SSR — nothing to do server-side
    if (!isPlatformBrowser(platformId)) {
      resolve();
      return;
    }

    // ── Dashboard context ──────────────────────────────────────────────────
    // Tenant is already in localStorage from the login response.
    // The tenantInterceptor reads it from AuthService which reads localStorage.
    if (subdomainSvc.isDashboard()) {
      resolve();
      return;
    }

    // ── Public menu context ────────────────────────────────────────────────
    // On a tenant subdomain (e.g. blackrabbit.edsolutions.tn):
    //   1. Read subdomain from window.location.hostname
    //   2. Fetch the public menu — backend resolves tenant via X-Tenant-Subdomain
    //   3. Extract tenant info and store in localStorage
    //   4. The tenantInterceptor reads the subdomain from SubdomainService
    //      and injects X-Tenant-Subdomain on every subsequent request

    const sub = subdomainSvc.getSubdomain();

    if (!sub) {
      resolve();
      return;
    }

    // Check if we already have this tenant cached for this subdomain
    const cached = storage.getJson<PublicTenantInfo>('tenant');
    if (cached && cached.subdomain === sub) {
      resolve();
      return;
    }

    // Fetch the public menu — the X-Tenant-Subdomain header tells the backend
    // which tenant to load. No auth required.
    const headers = new HttpHeaders({ 'X-Tenant-Subdomain': sub });

    http.get<any>(`${environment.apiUrl}/api/menu`, { headers }).subscribe({
      next: (res) => {
        const menu = res.data ?? res;

        const tenantInfo: PublicTenantInfo = {
          subdomain:      sub,
          name:           menu.tenantName,
          logoUrl:        menu.logoUrl        ?? null,
          tagline:        menu.tagline        ?? null,
          whatsappNumber: menu.whatsappNumber ?? null,
          currencySymbol: menu.currencySymbol ?? 'DT',
          address:        menu.address        ?? null,
        };

        // Store so the tenantInterceptor and menu page can read it
        storage.setJson('tenant', tenantInfo);
        resolve();
      },
      error: () => {
        // Never block the app — the menu page handles its own error state
        resolve();
      },
    });
  });
}