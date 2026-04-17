import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { TableStatusResponse, PosOrderPayload, StaffResponse, AddOrderLinesRequest } from '../models/pos.models';

// Reuse existing public menu models for the menu data
import {
  PublicMenuResponse,
} from '../../public/models/public-menu.models';
import { OrderResponse } from '../../dashboard/orders/models/order.models';
import { LocalStorageService } from '../../../core/services/local-storage.service';
import { ApiResponse } from '../../../core/models/api.models';
import { PosOrder } from '../models/pos-order.models';

// Reuse existing order response shape

@Injectable({ providedIn: 'root' })
export class PosService {

  private localStorage = inject(LocalStorageService);
  private http = inject(HttpClient);
  private base = environment.apiUrl;



  /**
   * The tenant's subdomain — read from the currentTenant stored in localStorage
   * after login. The POS runs on app.menuify.tn (dashboard subdomain), so
   * window.location.hostname gives 'app', not the tenant's actual subdomain.
   * The backend needs the real subdomain to resolve which tenant's menu to return.
   */
  private get tenantSubdomain(): string {
    try {
      const raw = this.localStorage.get('tenant');
      if (!raw) return '';
      const tenant = JSON.parse(raw);
      return tenant?.subdomain ?? '';
    } catch {
      return '';
    }
  }

  /**
   * Headers for the public menu endpoint — needs X-Tenant-Subdomain
   * so the backend resolves the correct tenant, plus auth so the POS
   * can reach it (the /api/menu endpoint may require tenant context).
   */


  // ── Tables ──────────────────────────────────────────────────────────────────

  getTableStatus(): Observable<TableStatusResponse[]> {
    return this.http
      .get<ApiResponse<TableStatusResponse[]>>(
        `${this.base}/api/pos/tables/status`,
      )
      .pipe(map(r => r.data));
  }

  // ── Menu ────────────────────────────────────────────────────────────────────
  // Reuses the public menu endpoint — needs X-Tenant-Subdomain header so the
  // backend knows which tenant's menu to return, since the POS is on app.menuify.tn

  getMenu(): Observable<PublicMenuResponse> {
    return this.http
      .get<ApiResponse<PublicMenuResponse>>(
        `${this.base}/api/menu`,
      )
      .pipe(map(r => r.data));
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  placeOrder(payload: PosOrderPayload): Observable<OrderResponse> {
    return this.http
      .post<ApiResponse<OrderResponse>>(
        `${this.base}/api/orders`,
        payload,
      )
      .pipe(map(r => r.data));
  }

  //

  addLines(orderId: any, payload: AddOrderLinesRequest){
    return this.http
      .post<ApiResponse<PosOrder>>(
        `${this.base}/api/pos/orders/${orderId}/lines`,
        payload,
      )
      .pipe(map(r => r.data));
  }

  // ── Staff ───────────────────────────────────────────────────────────────────

  getStaffList(): Observable<StaffResponse[]> {
    return this.http
      .get<ApiResponse<StaffResponse[]>>(
        `${this.base}/api/dashboard/staff`,
      )
      .pipe(map(r => r.data));
  }
}