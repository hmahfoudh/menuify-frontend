import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }               from '@angular/common';
import { DOCUMENT }                        from '@angular/common';

export type AppContext = 'dashboard' | 'public-menu';

@Injectable({ providedIn: 'root' })
export class SubdomainService {

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * DOCUMENT is available in both browser and SSR contexts.
   * In SSR (Angular 17/18), Angular sets document.location.href
   * from the incoming request URL — so we can read the hostname
   * server-side without needing the REQUEST token (Angular 19+).
   */
  private document = inject(DOCUMENT);

  getSubdomain(): string {
    const host  = this.getHost();
    const parts = host.split('.');
    return parts.length >= 3 ? parts[0] : '';
  }

  getContext(): AppContext {
    // Local dev override — browser only
    if (this.isBrowser) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('context') === 'public')    return 'public-menu';
      if (params.get('context') === 'dashboard') return 'dashboard';
    }

    const sub = this.getSubdomain();
    const dashboardSubdomains = ['app', 'dashboard', 'admin', 'localhost', ''];
    return dashboardSubdomains.includes(sub) ? 'dashboard' : 'public-menu';
  }

  isPublicMenu():      boolean { return this.getContext() === 'public-menu'; }
  isDashboard():       boolean { return this.getContext() === 'dashboard'; }
  isTenantSubdomain(): boolean { return this.getContext() === 'public-menu'; }

  private getHost(): string {
    // Works in both browser and SSR — Angular injects DOCUMENT with the
    // correct location in both contexts. In SSR, Angular 17/18 populates
    // document.location from the incoming request URL automatically.
    return this.document.location?.hostname ?? '';
  }
}