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
  | 'IN_PROGRESS'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'PAID'
  | 'CANCELLED';

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

// ── Status display helpers ────────────────────────────────────────────────────

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW:         'New',
  PENDING:     'Pending',
  CONFIRMED:   'Confirmed',
  IN_PROGRESS: 'In progress',
  PREPARING:   'Preparing',
  READY:       'Ready',
  SERVED:      'Served',
  COMPLETED:   'Completed',
  PAID:        'Paid',
  CANCELLED:   'Cancelled',
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  NEW:         'blue',
  PENDING:     'blue',
  CONFIRMED:   'blue',
  IN_PROGRESS: 'orange',
  PREPARING:   'orange',
  READY:       'green',
  SERVED:      'teal',
  COMPLETED:   'gray',
  PAID:        'gray',
  CANCELLED:   'red',
};

/** Legal next statuses from a given status (mirrors backend transition map) */
export const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  NEW:         ['IN_PROGRESS', 'CANCELLED'],
  PENDING:     ['CONFIRMED',   'CANCELLED'],
  CONFIRMED:   ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY',       'CANCELLED'],
  PREPARING:   ['READY',       'CANCELLED'],
  READY:       ['SERVED',      'CANCELLED'],
  SERVED:      ['PAID',        'CANCELLED'],
};

export const isActiveStatus = (s: OrderStatus): boolean =>
  !['COMPLETED', 'PAID', 'CANCELLED'].includes(s);

export const isPosOrder = (o: PosOrder): boolean => o.source === 'POS';