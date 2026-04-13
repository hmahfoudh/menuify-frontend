export interface Refund {
  id:               string;
  orderId:          string;
  orderReference:   string;
  paymentId:        string;
  amount:           number;
  reason:           string;
  originalMethod:   string;
  performedByName:  string;
  createdAt:        string;
}
 
export interface OrderRefundSummary {
  orderId:        string;
  orderReference: string;
  totalPaid:      number;
  totalRefunded:  number;
  netRevenue:     number;
  fullyRefunded:  boolean;
  refunds:        Refund[];
}
 
export interface IssueRefundRequest {
  paymentId: string;
  amount:    number;
  reason:    string;
}
 
/** Max refundable for a given payment: amountPaid - refundedAmount */
export function maxRefundable(payment: {
  amountPaid: number;
  refundedAmount: number;
}): number {
  return Math.max(0,
    Math.round((payment.amountPaid - payment.refundedAmount) * 1000) / 1000
  );
}
 
export function isFullyRefundable(payment: {
  amountPaid: number;
  refundedAmount: number;
}): boolean {
  return maxRefundable(payment) <= 0;
}
