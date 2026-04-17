import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject }  from 'rxjs';
import { map }         from 'rxjs/operators';
import {
  OrderResponse, OrderStatus,
} from '../models/order.models';
import { environment } from '../../../../../environments/environment';
import { ApiResponse, PageResponse } from '../../../../core/models/api.models';
import { AuthService } from '../../../../core/services/auth.service';

export interface OrderSseEvent {
  type: 'NEW_ORDER';
  orderId: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService implements OnDestroy{

  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/dashboard/orders`;
  private eventSource: EventSource | null = null;
  private orderEvents$ = new Subject<OrderSseEvent>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  getAll(status: OrderStatus | null, page = 0, size = 20)
      : Observable<PageResponse<OrderResponse>> {

    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (status) params = params.set('status', status);

    return this.http
      .get<ApiResponse<PageResponse<OrderResponse>>>(this.base, { params })
      .pipe(map(r => r.data));
  }

  getById(id: string): Observable<OrderResponse> {
    return this.http
      .get<ApiResponse<OrderResponse>>(`${this.base}/${id}`)
      .pipe(map(r => r.data));
  }

  updateStatus(
    id: string,
    status: OrderStatus,
    estimatedMinutes: number | null,
    restaurantMessage: string | null
  ): Observable<OrderResponse> {
    return this.http
      .patch<ApiResponse<OrderResponse>>(
        `${this.base}/${id}/status`,
        { status, estimatedMinutes, restaurantMessage }
      ).pipe(map(r => r.data));
  }

  // ── SSE ────────────────────────────────────────────────────────────────────

  get newOrderEvents$(): Observable<OrderSseEvent> {
    return this.orderEvents$.asObservable();
  }

  connectStream(): void {
    if (this.eventSource) return; // already connected

    const tenantId = this.authService.currentTenant()?.id;

    const url = `${environment.apiUrl}/api/orders/stream`+ `?tenantId=${encodeURIComponent(tenantId!)}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const data: OrderSseEvent = JSON.parse(event.data);
        this.orderEvents$.next(data);
      } catch {
        console.warn('SSE parse error', event.data);
      }
    };

    this.eventSource.onerror = () => {
      this.closeStream();
      this.reconnectTimer = setTimeout(() => this.connectStream(), 5_000);
    };
  }

  closeStream(): void {
    this.eventSource?.close();
    this.eventSource = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.closeStream();
    this.orderEvents$.complete();
  }
}