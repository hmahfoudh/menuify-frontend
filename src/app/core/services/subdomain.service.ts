import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT }          from '@angular/common';

export type AppContext = 'dashboard' | 'public-menu' | 'landing';

@Injectable({ providedIn: 'root' })
export class SubdomainService {

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private document  = inject(DOCUMENT);

  getSubdomain(): string {
    const host  = this.getHost();
    const parts = host.split('.');
    return parts.length >= 3 ? parts[0] : '';
  }

  getContext(): AppContext {
    if (this.isBrowser) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('context') === 'public')    return 'public-menu';
      if (params.get('context') === 'dashboard') return 'dashboard';
      if (params.get('context') === 'landing')   return 'landing';
    }

    const sub  = this.getSubdomain();
    const host = this.getHost();

    // Bare domain (menuify.tn) or www.menuify.tn → landing page
    if (sub === '' || sub === 'www') return 'landing';

    // Dashboard subdomains
    const dashboardSubdomains = ['app', 'dashboard', 'admin', 'localhost'];
    if (dashboardSubdomains.includes(sub)) return 'dashboard';

    // Everything else is a tenant subdomain → public menu
    return 'public-menu';
  }

  isLanding():        boolean { return this.getContext() === 'landing'; }
  isPublicMenu():     boolean { return this.getContext() === 'public-menu'; }
  isDashboard():      boolean { return this.getContext() === 'dashboard'; }
  isTenantSubdomain():boolean { return this.getContext() === 'public-menu'; }

  private getHost(): string {
    if (this.isBrowser) return window.location.hostname;
    return this.document.location?.hostname ?? '';
  }
}