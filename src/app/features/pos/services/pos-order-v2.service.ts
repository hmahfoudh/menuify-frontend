// pos-order.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  PosOrder,
  PosCreateOrderRequest,
  PosUpdateStatusRequest,
  OrderStatus,
  isActiveStatus,
} from '../models/pos-order.models';
import { ApiResponse } from '../../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class PosOrderService {

  private readonly http = inject(HttpClient);
  private readonly base = '/api/pos/orders';

  // ── Signal-based active orders state ─────────────────────────────────────

  /** All currently active orders for the POS view */
  activeOrders = signal<PosOrder[]>([]);

  /** Active orders grouped by table number */
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
          // Optimistically add to active orders
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
            // If the order is no longer active, remove it from the list
            if (!isActiveStatus(updated.status)) {
              return orders.filter(o => o.id !== updated.id);
            }
            // Otherwise update in place
            return orders.map(o => o.id === updated.id ? updated : o);
          });
        })
      );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Get the active order for a specific table, if any */
  getOrderForTable(tableNumber: string): PosOrder | undefined {
    return this.activeOrders().find(
      o => o.tableNumber === tableNumber && isActiveStatus(o.status)
    );
  }

  /** Refresh active orders from server (call on POS init and after reconnect) */
  refresh(): void {
    this.loadActiveOrders().subscribe();
  }
}