// ── Public API responses ───────────────────────────────────────────────────────

import { Feature } from "../../dashboard/settings/models/settings.models";

export interface PublicTenantResponse {
  name:           string;
  subdomain:      string;
  logoUrl:        string;
  tagline:        string;
  address:        string | null;
  city:           string | null;
  country:        string | null;
  whatsappNumber: string | null;
  googleMapsUrl: string | null;
  openingHours:   string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  tiktokUrl: string | null;
  linkedInUrl: string | null;
  youtubeUrl: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  currencySymbol: string;
  features: Feature[];
}
export interface PublicMenuResponse {
  tenant:         PublicTenantResponse;
  categories:     PublicCategoryResponse[];
}

export interface PublicCategoryResponse {
  id:             string;
  name:           string;
  nameAr:         string | null;
  nameFr:         string | null;
  icon:           string | null;
  imageUrl:       string | null;
  position:       number;
  items:          PublicItemResponse[];
  subcategories:  PublicSubcategoryResponse[];
}

export interface PublicSubcategoryResponse {
  id:       string;
  name:     string;
  nameAr:   string | null;
  nameFr:   string | null;
  icon:     string | null;
  position: number;
  items:    PublicItemResponse[];
}

export interface PublicItemResponse {
  id:             string;
  name:           string;
  nameAr:         string | null;
  nameFr:         string | null;
  description:    string | null;
  basePrice:      number | null;
  displayPrice:   number | null;
  imageUrl:       string | null;
  featured:       boolean;
  hasVariants:    boolean;
  vegetarian:     boolean;
  vegan:          boolean;
  glutenFree:     boolean;
  spicy:          boolean;
  tags:           string | null;
  position:       number;
  variantGroups:  PublicVariantGroupResponse[];
  modifierGroups: PublicModifierGroupResponse[];
  likeCount:      number;
}

export interface PublicVariantGroupResponse {
  id:       string;
  name:     string;
  required: boolean;
  uiType:   'pills' | 'dropdown' | 'cards';
  position: number;
  variants: PublicVariantResponse[];
}

export interface PublicVariantResponse {
  id:        string;
  name:      string;
  price:     number;
  imageUrl:  string | null;
  isDefault: boolean;
  position:  number;
}

export interface PublicModifierGroupResponse {
  id:          string;
  name:        string;
  description: string | null;
  required:    boolean;
  minSelect:   number;
  maxSelect:   number;
  uiType:      'checkbox' | 'radio' | 'stepper';
  position:    number;
  modifiers:   PublicModifierResponse[];
}

export interface PublicModifierResponse {
  id:         string;
  name:       string;
  priceDelta: number;
  isDefault:  boolean;
  imageUrl:   string | null;
}

export interface ThemeResponse {
  templateSlug:   string;
  resolvedTokens: string;
  customCss:      string | null;
}

// ── Cart types ────────────────────────────────────────────────────────────────

export interface CartItem {
  cartId:      string;
  item:        PublicItemResponse;
  variant:     PublicVariantResponse | null;
  modifiers:   PublicModifierResponse[];
  quantity:    number;
  unitPrice:   number;
  lineTotal:   number;
  specialNote: string;
}

// ── Order submit ──────────────────────────────────────────────────────────────

export interface CreateOrderRequest {
  customerName:    string | null;
  customerPhone:   string | null;
  orderType:       'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableNumber:     string | null;
  customerAddress: string | null;
  notes:           string | null;
  lines:           OrderLineRequest[];
}

export interface OrderLineRequest {
  itemId:              string;
  variantId:           string | null;
  quantity:            number;
  modifierIds:         string[];
  specialInstructions: string | null;
}

export interface SubmittedOrder {
  id:              string;
  reference:       string;
  total:           number;
  whatsappMessage: string;
}


// ── Order tracking (public) ───────────────────────────────────────────────────

export type TrackingStatus =
  'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface TrackedOrderModifier {
  id:                   string;
  modifierNameSnapshot: string;
  priceDeltaSnapshot:   number;
}

export interface TrackedOrderLine {
  id:                   string;
  itemNameSnapshot:     string;
  variantNameSnapshot:  string | null;
  quantity:             number;
  unitPrice:            number;
  lineTotal:            number;
  specialInstructions:  string | null;
  selectedModifiers:    TrackedOrderModifier[];
}

export interface TrackedOrder {
  id:               string;
  reference:        string;
  status:           TrackingStatus;
  orderType:        'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableNumber:      string | null;
  customerName:     string | null;
  subtotal:         number;
  total:            number;
  notes:            string | null;
  createdAt:        string;
  confirmedAt:      string | null;
  estimatedMinutes: number | null;     // set by restaurant staff
  restaurantMessage:string | null;     // message shown on tracking screen
  minutesRemaining: number | null;     // computed by backend: ETA - elapsed
  lines:            TrackedOrderLine[];
}

export interface TrackingStatusMeta {
  label:    string;
  desc:     string;
  step:     number;   // 0-4 for progress bar
  color:    string;
  terminal: boolean;  // true = no more updates expected
}

export const TRACKING_STATUS_META: Record<TrackingStatus, TrackingStatusMeta> = {
  PENDING:   { label: 'Order received',  desc: 'Your order is waiting to be confirmed by the restaurant.', step: 0, color: 'amber',  terminal: false },
  CONFIRMED: { label: 'Confirmed',       desc: 'The restaurant has confirmed your order.',                 step: 1, color: 'blue',   terminal: false },
  PREPARING: { label: 'Being prepared',  desc: 'The kitchen is working on your order.',                   step: 2, color: 'purple', terminal: false },
  READY:     { label: 'Ready!',          desc: 'Your order is ready. Please collect it.',                 step: 3, color: 'green',  terminal: false },
  COMPLETED: { label: 'Completed',       desc: 'Your order has been completed. Enjoy!',                  step: 4, color: 'green',  terminal: true  },
  CANCELLED: { label: 'Cancelled',       desc: 'This order has been cancelled.',                         step: -1, color: 'red',   terminal: true  },
};

export const TRACKING_STEPS: TrackingStatus[] = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'
];