import { Injectable, inject } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { Observable }         from 'rxjs';
import { map }                from 'rxjs/operators';
import { environment }        from '../../../../../environments/environment';
import {
  TenantResponse, TenantSettingsRequest, ApiResponse
} from '../models/settings.models';

@Injectable({ providedIn: 'root' })
export class SettingsService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/dashboard/settings`;

  get(): Observable<TenantResponse> {
    return this.http
      .get<ApiResponse<TenantResponse>>(this.base)
      .pipe(map(r => r.data));
  }

  update(req: TenantSettingsRequest): Observable<TenantResponse> {
    return this.http
      .put<ApiResponse<TenantResponse>>(this.base, req)
      .pipe(map(r => r.data));
  }

  uploadLogo(file: File): Observable<TenantResponse> {
    const fd = new FormData();
    fd.append('image', file);
    return this.http
      .post<ApiResponse<TenantResponse>>(`${this.base}/logo`, fd)
      .pipe(map(r => r.data));
  }

  removeLogo(): Observable<TenantResponse> {
    return this.http
      .delete<ApiResponse<TenantResponse>>(`${this.base}/logo`)
      .pipe(map(r => r.data));
  }

  requestCustomDomain(domain: string): Observable<TenantResponse> {
    return this.http
      .post<ApiResponse<TenantResponse>>(
        `${this.base}/custom-domain`, { domain })
      .pipe(map(r => r.data));
  }

  removeCustomDomain(): Observable<TenantResponse> {
    return this.http
      .delete<ApiResponse<TenantResponse>>(`${this.base}/custom-domain`)
      .pipe(map(r => r.data));
  }
}