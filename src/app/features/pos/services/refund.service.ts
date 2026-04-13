import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Refund,
  OrderRefundSummary,
  IssueRefundRequest,
} from '../models/refund.models';
import { ApiResponse } from '../../../core/models/api.models';
 
 
@Injectable({ providedIn: 'root' })
export class RefundService {
 
  private readonly http = inject(HttpClient);
  private readonly base = '/api/pos/refunds';
 
  /**
   * Issue a full or partial refund.
   * OWNER only — guard this call at the component level too.
   */
  issueRefund(req: IssueRefundRequest): Observable<ApiResponse<Refund>> {
    return this.http.post<ApiResponse<Refund>>(this.base, req);
  }
 
  /**
   * Get all refunds + summary for an order.
   * Use before showing the refund panel to know what's already been refunded.
   */
  getOrderRefunds(orderId: string): Observable<ApiResponse<OrderRefundSummary>> {
    return this.http.get<ApiResponse<OrderRefundSummary>>(
      `${this.base}/order/${orderId}`
    );
  }
 
  getRefund(refundId: string): Observable<ApiResponse<Refund>> {
    return this.http.get<ApiResponse<Refund>>(`${this.base}/${refundId}`);
  }
}
