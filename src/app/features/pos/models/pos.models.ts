// ── Staff ──────────────────────────────────────────────────────────────────────

export interface StaffResponse {
  id:        string;
  name:      string;
  color:     string | null;
  active:    boolean;
  createdAt: string;
}

// ── Tables ─────────────────────────────────────────────────────────────────────

export type TableStatus = 'FREE' | 'PENDING' | 'PREPARING' | 'READY';

export interface TableStatusResponse {
  id:             string;
  number:         number;
  label:          string | null;
  displayName:    string;
  active:         boolean;
  status:         TableStatus;
  activeOrderId:  string | null;
  activeOrderRef: string | null;
}

export interface TableStatusMeta {
  label: string;
  color: string;       // CSS class suffix
  dot:   string;       // hex colour for dot
}

export const TABLE_STATUS_META: Record<TableStatus, TableStatusMeta> = {
  FREE:     { label: 'Free',     color: 'free',     dot: '#504c44' },
  PENDING:  { label: 'Pending',  color: 'pending',  dot: '#e8a838' },
  PREPARING:{ label: 'Preparing',color: 'preparing',dot: '#e8a838' },
  READY:    { label: 'Ready',    color: 'ready',    dot: '#64c882' },
};

// ── POS cart ───────────────────────────────────────────────────────────────────

export interface PosCartModifier {
  id:         string;
  name:       string;
  priceDelta: number;
}

export interface PosCartVariant {
  id:    string;
  name:  string;
  price: number;
}

export interface PosCartItem {
  cartId:    string;           // local UUID for tracking
  itemId:    string;
  itemName:  string;
  variant:   PosCartVariant | null;
  modifiers: PosCartModifier[];
  quantity:  number;
  unitPrice: number;
  lineTotal: number;
  note:      string;
}

// ── Order type & payment ───────────────────────────────────────────────────────

export type PosOrderType   = 'dine_in' | 'takeaway' | 'delivery';
export type PosPaymentType = 'cash' | 'card' | 'mixed';

export interface PosOrderPayload {
  orderType:       PosOrderType;
  tableNumber:     string | null;   // null for walk-in / takeaway
  customerName:    string | null;
  notes:           string | null;
  paymentType:     PosPaymentType;
  source:          'POS';
  lines: {
    itemId:              string;
    variantId:           string | null;
    quantity:            number;
    modifierIds:         string[];
    specialInstructions: string | null;
  }[];
}

// ── Category accent colours ────────────────────────────────────────────────────
// Used for the left border strip on item cards — cycling through a palette
// that ties each category to a colour across the whole session.

export const CATEGORY_ACCENT_PALETTE = [
  '#5a9cf5',   // blue
  '#64c882',   // green
  '#e8a838',   // amber
  '#c85050',   // red
  '#a064dc',   // purple
  '#3cbeb4',   // teal
  '#e67850',   // coral
  '#dc6496',   // pink
  '#c9a96e',   // gold
];