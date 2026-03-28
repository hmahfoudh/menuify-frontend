// ── Public API responses ───────────────────────────────────────────────────────

export interface PublicMenuResponse {
  tenantName:     string;
  logoUrl:        string | null;
  tagline:        string | null;
  whatsappNumber: string | null;
  currencySymbol: string;
  address:        string | null;
  openingHours:   string | null;
  categories:     PublicCategoryResponse[];
}

export interface PublicCategoryResponse {
  id:       string;
  name:     string;
  nameAr:   string | null;
  nameFr:   string | null;
  icon:     string | null;
  imageUrl: string | null;
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
}

export interface ThemeResponse {
  templateSlug:   string;
  resolvedTokens: string;
  customCss:      string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data:    T;
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
  orderType:       'dine_in' | 'takeaway' | 'delivery';
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