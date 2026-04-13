export type PaymentMethod = 'CASH' | 'CARD' | 'MIXED';
export type PaymentStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';
 
export interface Payment {
  id:              string;
  orderId:         string;
  orderReference:  string;
  method:          PaymentMethod;
  status:          PaymentStatus;
  amountPaid:      number;
  tip:             number;
  amountTendered:  number | null;
  changeGiven:     number | null;
  refundedAmount:  number;
  staffName:       string | null;
  notes:           string | null;
  createdAt:       string;
}
 
export interface OrderPaymentSummary {
  orderId:        string;
  orderReference: string;
  orderTotal:     number;
  amountDue:      number;
  totalPaid:      number;
  remainingDue:   number;
  totalTips:      number;
  fullPaid:       boolean;
  payments:       Payment[];
}
 
export interface RecordPaymentRequest {
  orderId:          string;
  method:           PaymentMethod;
  amountPaid:       number;
  amountTendered?:  number;   // required for CASH
  tip?:             number;
  notes?:           string;
}
 
/** Computed change for display before submitting */
export function computeChange(
  amountTendered: number,
  amountPaid: number,
  tip: number
): number {
  const change = amountTendered - amountPaid - (tip ?? 0);
  return Math.max(0, Math.round(change * 1000) / 1000);
}
 
/** Whether the tendered amount is sufficient */
export function isTenderedSufficient(
  amountTendered: number,
  amountPaid: number,
  tip: number
): boolean {
  return amountTendered >= amountPaid + (tip ?? 0);
}
 
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH:  'Cash',
  CARD:  'Card',
  MIXED: 'Mixed',
};
