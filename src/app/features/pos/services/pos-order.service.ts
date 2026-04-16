// pos-order-v2.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  PosOrder,
  PosCreateOrderRequest,
  PosOrderLineRequest,
  PosUpdateStatusRequest,
  OrderStatus,
  isActiveStatus,
} from '../models/pos-order.models';
import { ApiResponse } from '../../../core/models/api.models';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PosOrderService {

  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/api/pos/orders';

  // ── Signal-based active orders state ─────────────────────────────────────

  activeOrders = signal<PosOrder[]>([]);

  ordersByTable = computed(() => {
    const map = new Map<string, PosOrder[]>();
    for (const order of this.activeOrders()) {
      if (!order.tableNumber) continue;
      const existing = map.get(order.tableNumber) ?? [];
      map.set(order.tableNumber, [...existing, order]);
    }
    return map;
  });

  // ── HTTP calls ────────────────────────────────────────────────────────────

  createOrder(req: PosCreateOrderRequest): Observable<ApiResponse<PosOrder>> {
    return this.http.post<ApiResponse<PosOrder>>(this.base, req).pipe(
      tap(res => {
        if (res.success) {
          this.activeOrders.update(orders => [res.data, ...orders]);
        }
      })
    );
  }

  loadActiveOrders(): Observable<ApiResponse<PosOrder[]>> {
    return this.http.get<ApiResponse<PosOrder[]>>(`${this.base}/active`).pipe(
      tap(res => {
        if (res.success) this.activeOrders.set(res.data);
      })
    );
  }

  getOrder(id: string): Observable<ApiResponse<PosOrder>> {
    return this.http.get<ApiResponse<PosOrder>>(`${this.base}/${id}`);
  }

  /**
   * Appends new lines to an existing active order.
   * Hits: PATCH /api/pos/orders/{id}/lines
   * Returns the full updated order with all lines and recalculated totals.
   */
  addLines(
    orderId: string,
    lines: PosOrderLineRequest[]
  ): Observable<ApiResponse<PosOrder>> {
    return this.http
      .patch<ApiResponse<PosOrder>>(`${this.base}/${orderId}/lines`, { lines })
      .pipe(
        tap(res => {
          if (!res.success) return;
          // Update the order in the active orders list if present
          const updated = res.data;
          this.activeOrders.update(orders => {
            const idx = orders.findIndex(o => o.id === updated.id);
            if (idx === -1) return orders;
            return orders.map(o => o.id === updated.id ? updated : o);
          });
        })
      );
  }

  updateStatus(
    id: string,
    req: PosUpdateStatusRequest
  ): Observable<ApiResponse<PosOrder>> {
    return this.http
      .patch<ApiResponse<PosOrder>>(`${this.base}/${id}/status`, req)
      .pipe(
        tap(res => {
          if (!res.success) return;
          const updated = res.data;
          this.activeOrders.update(orders => {
            if (!isActiveStatus(updated.status)) {
              return orders.filter(o => o.id !== updated.id);
            }
            return orders.map(o => o.id === updated.id ? updated : o);
          });
        })
      );
  }

  getOrderForTable(tableNumber: string): PosOrder | undefined {
    return this.activeOrders().find(
      o => o.tableNumber === tableNumber && isActiveStatus(o.status)
    );
  }

  refresh(): void {
    this.loadActiveOrders().subscribe();
  }
}