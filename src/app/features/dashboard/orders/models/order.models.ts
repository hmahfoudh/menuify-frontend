export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
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
}

export interface PageResponse<T> {
  content:       T[];
  page:          number;
  size:          number;
  totalElements: number;
  totalPages:    number;
  last:          boolean;
}

export interface ApiResponse<T> {
  success:   boolean;
  message:   string;
  data:      T;
  timestamp: string;
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
  CONFIRMED: { label: 'Confirmed',  color: 'blue',   next: 'PREPARING',  nextLabel: 'Start prep' },
  PREPARING: { label: 'Preparing',  color: 'purple', next: 'READY',      nextLabel: 'Mark ready' },
  READY:     { label: 'Ready',      color: 'green',  next: 'COMPLETED',  nextLabel: 'Complete'   },
  COMPLETED: { label: 'Completed',  color: 'muted',  next: null,         nextLabel: null         },
  CANCELLED: { label: 'Cancelled',  color: 'red',    next: null,         nextLabel: null         },
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