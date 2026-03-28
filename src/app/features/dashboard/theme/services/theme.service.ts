import { Injectable, inject } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { Observable }         from 'rxjs';
import { map }                from 'rxjs/operators';
import { environment }        from '../../../../../environments/environment';
import {
  TenantThemeResponse, TemplateResponse,
  PresetResponse, ThemeResponse, ApiResponse
} from '../models/theme.models';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/dashboard/theme`;

  // ── Queries ────────────────────────────────────────────────────────────────

  getCurrent(): Observable<TenantThemeResponse> {
    return this.http
      .get<ApiResponse<TenantThemeResponse>>(this.base)
      .pipe(map(r => r.data));
  }

  getTemplates(): Observable<TemplateResponse[]> {
    return this.http
      .get<ApiResponse<TemplateResponse[]>>(`${this.base}/templates`)
      .pipe(map(r => r.data));
  }

  getPresets(templateId?: string): Observable<PresetResponse[]> {
    const url = templateId
      ? `${this.base}/presets?templateId=${templateId}`
      : `${this.base}/presets`;
    return this.http
      .get<ApiResponse<PresetResponse[]>>(url)
      .pipe(map(r => r.data));
  }

  // Public: used by the menu page to get resolved tokens
  getPublicTheme(): Observable<ThemeResponse> {
    return this.http
      .get<ApiResponse<ThemeResponse>>(
        `${environment.apiUrl}/api/menu/theme`)
      .pipe(map(r => r.data));
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  switchTemplate(templateSlug: string): Observable<TenantThemeResponse> {
    return this.http
      .put<ApiResponse<TenantThemeResponse>>(
        `${this.base}/template`, { templateSlug })
      .pipe(map(r => r.data));
  }

  applyPreset(presetId: string): Observable<TenantThemeResponse> {
    return this.http
      .put<ApiResponse<TenantThemeResponse>>(
        `${this.base}/preset`, { presetId })
      .pipe(map(r => r.data));
  }

  updateTokens(tokens: string): Observable<TenantThemeResponse> {
    return this.http
      .patch<ApiResponse<TenantThemeResponse>>(
        `${this.base}/tokens`, { tokens })
      .pipe(map(r => r.data));
  }

  resetToPreset(): Observable<TenantThemeResponse> {
    return this.http
      .delete<ApiResponse<TenantThemeResponse>>(`${this.base}/tokens`)
      .pipe(map(r => r.data));
  }

  saveCustomCss(css: string): Observable<TenantThemeResponse> {
    return this.http
      .put<ApiResponse<TenantThemeResponse>>(
        `${this.base}/custom-css`, { css })
      .pipe(map(r => r.data));
  }

  removeCustomCss(): Observable<TenantThemeResponse> {
    return this.http
      .delete<ApiResponse<TenantThemeResponse>>(`${this.base}/custom-css`)
      .pipe(map(r => r.data));
  }
}