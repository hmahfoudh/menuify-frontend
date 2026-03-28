import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders }         from '@angular/common/http';
import { isPlatformBrowser }               from '@angular/common';
import { Observable }                      from 'rxjs';
import { map }                             from 'rxjs/operators';
import { environment }                     from '../../../../environments/environment';
import { SubdomainService }                from '../../../core/services/subdomain.service';
import {
  PublicMenuResponse, ThemeResponse,
  CreateOrderRequest, SubmittedOrder, ApiResponse
} from '../models/public-menu.models';

@Injectable({ providedIn: 'root' })
export class PublicMenuService {

  private http      = inject(HttpClient);
  private subdomain = inject(SubdomainService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'X-Tenant-Subdomain': this.subdomain.getSubdomain()
    });
  }

  private get api(): string {
    return environment.apiUrl;
  }

  // ── Menu & theme ──────────────────────────────────────────────────────────

  getMenu(): Observable<PublicMenuResponse> {
    return this.http
      .get<ApiResponse<PublicMenuResponse>>(
        `${this.api}/api/menu`,
        { headers: this.headers }
      ).pipe(map(r => r.data));
  }

  getTheme(): Observable<ThemeResponse> {
    return this.http
      .get<ApiResponse<ThemeResponse>>(
        `${this.api}/api/menu/theme`,
        { headers: this.headers }
      ).pipe(map(r => r.data));
  }

  // ── Order submit ──────────────────────────────────────────────────────────

  submitOrder(req: CreateOrderRequest): Observable<SubmittedOrder> {
    return this.http
      .post<ApiResponse<SubmittedOrder>>(
        `${this.api}/api/orders`,
        req,
        { headers: this.headers }
      ).pipe(map(r => r.data));
  }

  // ── Analytics tracking (fire-and-forget) ─────────────────────────────────

  trackMenuView(sessionId: string, qrCode: string | null,
                tableNumber: string | null): void {
    if (!this.isBrowser) return;
    this.http.post(
      `${this.api}/api/dashboard/analytics/menu/track/view`,
      {
        sessionId,
        qrCode,
        tableNumber,
        deviceType: this.detectDevice(),
      },
      { headers: this.headers }
    ).subscribe({ error: () => {} });
  }

  trackItemView(itemId: string, categoryId: string,
                sessionId: string): void {
    if (!this.isBrowser) return;
    this.http.post(
      `${this.api}/api/menu/track/item-view`,
      { itemId, categoryId, sessionId },
      { headers: this.headers }
    ).subscribe({ error: () => {} });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private detectDevice(): string {
    if (!this.isBrowser) return 'desktop';
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua))  return 'mobile';
    if (/Tablet|iPad/i.test(ua))   return 'tablet';
    return 'desktop';
  }
}