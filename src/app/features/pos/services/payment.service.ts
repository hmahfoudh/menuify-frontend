import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Payment,
  OrderPaymentSummary,
  RecordPaymentRequest,
} from '../models/payment.models';
import { ApiResponse } from '../../../core/models/api.models';
import { environment } from '../../../../environments/environment';
 
 
@Injectable({ providedIn: 'root' })
export class PaymentService {
 
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl +'/api/pos/payments';
 
  /**
   * Record a payment against an order.
   *
   * For CASH: include amountTendered. The response includes changeGiven.
   * For split payments: call twice with different methods.
   * The second call will auto-close the order when fully paid.
   */
  recordPayment(req: RecordPaymentRequest): Observable<ApiResponse<Payment>> {
    return this.http.post<ApiResponse<Payment>>(this.base, req);
  }
 
  /**
   * Get all payments + summary for an order.
   * Use this to populate the payment panel before charging.
   */
  getOrderPayments(orderId: string): Observable<ApiResponse<OrderPaymentSummary>> {
    return this.http.get<ApiResponse<OrderPaymentSummary>>(
      `${this.base}/order/${orderId}`
    );
  }
 
  getPayment(paymentId: string): Observable<ApiResponse<Payment>> {
    return this.http.get<ApiResponse<Payment>>(`${this.base}/${paymentId}`);
  }
}
