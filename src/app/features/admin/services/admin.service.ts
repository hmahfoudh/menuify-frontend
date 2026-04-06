import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams }         from '@angular/common/http';
import { Observable }         from 'rxjs';
import { map }                from 'rxjs/operators';
import { environment }        from '../../../../environments/environment';
import {
  AdminTenantResponse, AdminStatsResponse,
  AdminCreateTenantRequest, Plan
} from '../models/admin.models';

interface ApiResponse<T> { success: boolean; data: T; message: string; }

@Injectable({ providedIn: 'root' })
export class AdminService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/super-admin`;

  // ── Stats ───────────────────────────────────────────────────────────────────

  getStats(): Observable<AdminStatsResponse> {
    return this.http.get<ApiResponse<AdminStatsResponse>>(`${this.base}/stats`)
      .pipe(map(r => r.data));
  }

  // ── Tenants ─────────────────────────────────────────────────────────────────

  getTenants(search?: string): Observable<AdminTenantResponse[]> {
    let params = new HttpParams();
    if(search){
      params = params.set('search', search ?? '');
    }
    
    return this.http.get<ApiResponse<AdminTenantResponse[]>>(
      `${this.base}/tenants`, { params })
      .pipe(map(r => r.data));
  }

  createTenant(req: AdminCreateTenantRequest): Observable<AdminTenantResponse> {
    return this.http.post<ApiResponse<AdminTenantResponse>>(
      `${this.base}/tenants`, req)
      .pipe(map(r => r.data));
  }

  activate(id: string): Observable<AdminTenantResponse> {
    return this.http.patch<ApiResponse<AdminTenantResponse>>(
      `${this.base}/tenants/${id}/activate`, {})
      .pipe(map(r => r.data));
  }

  deactivate(id: string): Observable<AdminTenantResponse> {
    return this.http.patch<ApiResponse<AdminTenantResponse>>(
      `${this.base}/tenants/${id}/deactivate`, {})
      .pipe(map(r => r.data));
  }

  extendTrial(id: string, days: number): Observable<AdminTenantResponse> {
    return this.http.patch<ApiResponse<AdminTenantResponse>>(
      `${this.base}/tenants/${id}/trial`, { days })
      .pipe(map(r => r.data));
  }

  changePlan(id: string, plan: Plan): Observable<AdminTenantResponse> {
    return this.http.patch<ApiResponse<AdminTenantResponse>>(
      `${this.base}/tenants/${id}/plan`, { plan })
      .pipe(map(r => r.data));
  }

  // ── Impersonation ───────────────────────────────────────────────────────────

  impersonate(id: string): Observable<string> {
    return this.http.post<ApiResponse<string>>(
      `${this.base}/tenants/${id}/impersonate`, {})
      .pipe(map(r => r.data));
  }
}