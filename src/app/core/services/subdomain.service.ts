import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }               from '@angular/common';

export type AppContext = 'dashboard' | 'public-menu';

@Injectable({ providedIn: 'root' })
export class SubdomainService {

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Returns the raw subdomain from window.location.hostname.
   *
   * blackrabbit.menuify.tn  → 'blackrabbit'
   * app.menuify.tn          → 'app'
   * localhost               → 'localhost'
   */
  getSubdomain(): string {
    if (!this.isBrowser) return '';
    const host  = window.location.hostname;
    const parts = host.split('.');
    // Need at least 3 parts for a real subdomain (sub.domain.tld).
    // If only 2 parts (e.g. menuify.tn) there is no subdomain — treat as bare root.
    return parts.length >= 3 ? parts[0] : '';
  }

  /**
   * Determines which app to render based on the subdomain.
   *
   * 'app'        → dashboard (owner interface)
   * 'localhost'  → dashboard (local development default)
   * anything else → public menu page (tenant subdomain)
   *
   * Override with ?context=public in the URL for local
   * testing of the public menu page on localhost.
   */
  getContext(): AppContext {
    if (!this.isBrowser) return 'dashboard'; // SSR always renders dashboard

    // Local dev override: localhost?context=public
    const params = new URLSearchParams(window.location.search);
    if (params.get('context') === 'public') return 'public-menu';
    if (params.get('context') === 'dashboard') return 'dashboard';

    const sub = this.getSubdomain();

    // These subdomains (and the bare root domain) always serve the dashboard
    const dashboardSubdomains = ['app', 'dashboard', 'admin', 'localhost', ''];
    if (dashboardSubdomains.includes(sub)) return 'dashboard';

    // Everything else is a tenant subdomain → public menu
    return 'public-menu';
  }

  /**
   * Returns true if the current context is the public menu page.
   */
  isPublicMenu(): boolean {
    return this.getContext() === 'public-menu';
  }

  /**
   * Returns true if running on the dashboard subdomain.
   */
  isDashboard(): boolean {
    return this.getContext() === 'dashboard';
  }
}