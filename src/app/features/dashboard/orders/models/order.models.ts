export type OrderStatus =
  | 'PENDING'
  | 'NEW'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'PAID'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CANCELLED';

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export interface OrderLineModifierResponse {
  id:                   string;
  modifierNameSnapshot: string;
  priceDeltaSnapshot:   number;
}

export interface OrderLineResponse {
  id:                   string;
  itemNameSnapshot:     string;
  variantNameSnapshot:  string | null;
  unitPrice:            number;
  quantity:             number;
  lineTotal:            number;
  specialInstructions:  string | null;
  selectedModifiers:    OrderLineModifierResponse[];
}

export interface OrderResponse {
  id:               string;
  reference:        string;
  customerName:     string | null;
  customerPhone:    string | null;
  orderType:        OrderType;
  tableNumber:      string | null;
  subtotal:         number;
  total:            number;
  status:           OrderStatus;
  notes:            string | null;
  createdAt:        string;
  confirmedAt:      string | null;
  estimatedMinutes: number | null;
  restaurantMessage:string | null;
  minutesRemaining: number | null;
  lines:            OrderLineResponse[];
  amountDue:         number; // for POS orders, this is the amount still due after any payments recorded in the system (e.g. if a card payment was processed but not yet recorded, amountDue will still show the full total until the staff member marks that payment as completed in the dashboard)
}

// ── Status metadata ───────────────────────────────────────────────────────────
export interface StatusMeta {
  label:       string;
  color:       string;   // CSS variable suffix
  next:        OrderStatus | null;
  nextLabel:   string | null;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
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

export const STATUS_FILTERS: { label: string; value: OrderStatus | null }[] = [
  { label: 'All',       value: null        },
  { label: 'Pending',   value: 'PENDING'   },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Ready',     value: 'READY'     },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];