import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable }  from 'rxjs';
import { map }         from 'rxjs/operators';
import {
  OrderResponse, OrderStatus,
} from '../models/order.models';
import { environment } from '../../../../../environments/environment';
import { ApiResponse, PageResponse } from '../../../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class OrderService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/dashboard/orders`;

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
}