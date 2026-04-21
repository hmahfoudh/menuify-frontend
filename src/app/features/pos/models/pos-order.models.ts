// ─────────────────────────────────────────────────────────────────────────────
// pos-order.models.ts
//
// Add / merge these types into your existing pos.models.ts or models file.
// ─────────────────────────────────────────────────────────────────────────────

export type OrderType   = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type OrderSource = 'QR' | 'POS';

export type OrderStatus =
  | 'NEW'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'PAID'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface PosOrderLine {
  id:            string;
  itemId:        string;
  itemName:      string;
  categoryName:  string | null;
  variantName:   string | null;
  quantity:      number;
  unitPrice:     number;
  lineTotal:     number;
  notes:         string | null;
  modifierNames: string[];
}

export interface PosOrder {
  id:             string;
  reference:      string;
  orderType:      OrderType;
  status:         OrderStatus;
  source:         OrderSource;
  tableNumber:    string | null;
  guestCount:     number | null;
  customerName:   string | null;
  customerPhone:  string | null;
  staffName:      string | null;
  subtotal:       number;
  discountAmount: number | null;
  total:          number;
  amountDue:      number | null;
  paidAmount:     number | null;
  notes:          string | null;
  createdAt:      string;
  updatedAt:      string;
  lines:          PosOrderLine[];
}

export interface PosCreateOrderRequest {
  orderType:       OrderType;
  tableNumber?:    string;
  guestCount?:     number;
  customerName?:   string;
  customerPhone?:  string;
  customerAddress?: string;
  notes?:          string;
  lines:           PosOrderLineRequest[];
}

export interface PosOrderLineRequest {
  itemId:      string;
  variantId?:  string;
  quantity:    number;
  notes?:      string;
  modifierIds?: string[];
}

export interface PosUpdateStatusRequest {
  status: OrderStatus;
  reason?: string;
}

export interface StatusMeta {
  label:       string;
  color:       string;   // CSS variable suffix
  next:        OrderStatus | null;
  nextLabel:   string | null;
}



/** Legal next statuses from a given status (mirrors backend transition map) */
export const POS_ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  PENDING:   { label: 'Pending',    color: 'amber',  next: 'CONFIRMED',  nextLabel: 'Confirm'    },
  NEW:       { label: 'New',        color: 'blue',   next: 'CONFIRMED',  nextLabel: 'Confirm'    },
  CONFIRMED: { label: 'Confirmed',  color: 'blue',   next: 'PREPARING',  nextLabel: 'Start prep' },
  PREPARING: { label: 'Preparing',  color: 'purple', next: 'READY',      nextLabel: 'Mark ready' },
  READY:     { label: 'Ready',      color: 'green',  next: 'COMPLETED',  nextLabel: 'Complete'   },
  SERVED:    { label: 'Served',     color: 'green',  next: 'COMPLETED',  nextLabel: 'Complete'   },
  COMPLETED: { label: 'Completed',  color: 'muted',  next: null,         nextLabel: null         },
  CANCELLED: { label: 'Cancelled',  color: 'red',    next: null,         nextLabel: null         },
  PAID:      { label: 'Paid',  color: 'green',    next: null,         nextLabel: null         },
  REFUNDED:  { label: 'Refunded',  color: 'muted',  next: null,         nextLabel: null         },
  PARTIALLY_REFUNDED: { label: 'Partially Refunded', color: 'muted', next: null, nextLabel: null },
};

export const isActiveStatus = (s: OrderStatus): boolean =>
  !['COMPLETED', 'PAID', 'CANCELLED'].includes(s);

export const isPosOrder = (o: PosOrder): boolean => o.source === 'POS';