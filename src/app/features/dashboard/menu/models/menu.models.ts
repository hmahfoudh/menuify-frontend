// ── Category ──────────────────────────────────────────────────────────────────

export interface CategoryResponse {
  id:        string;
  name:      string;
  nameAr:    string | null;
  nameFr:    string | null;
  icon:      string | null;
  imageUrl:  string | null;
  position:  number;
  visible:   boolean;
  itemCount: number;
  createdAt: string;
}

export interface CategoryRequest {
  name:    string;
  nameAr?: string;
  nameFr?: string;
  icon?:   string;
  visible: boolean;
}

export interface ReorderRequest {
  id:       string;
  position: number;
}

// ── Item ──────────────────────────────────────────────────────────────────────

export interface ItemResponse {
  id:             string;
  categoryId:     string;
  name:           string;
  nameAr:         string | null;
  nameFr:         string | null;
  description:    string | null;
  descriptionAr:  string | null;
  descriptionFr:  string | null;
  basePrice:      number | null;
  displayPrice:   number | null;
  imageUrl:       string | null;
  featured:       boolean;
  available:      boolean;
  vegetarian:     boolean;
  vegan:          boolean;
  glutenFree:     boolean;
  spicy:          boolean;
  tags:           string | null;
  position:       number;
  variantGroups:  VariantGroupResponse[];
  modifierGroups: ModifierGroupResponse[];
  createdAt:      string;
}

export interface ItemRequest {
  categoryId:   string;
  name:         string;
  nameAr?:      string;
  nameFr?:      string;
  description?: string;
  basePrice?:   number;
  featured:     boolean;
  available:    boolean;
  vegetarian:   boolean;
  vegan:        boolean;
  glutenFree:   boolean;
  spicy:        boolean;
  tags?:        string;
}

// ── Variant Group ─────────────────────────────────────────────────────────────

export interface VariantGroupResponse {
  id:       string;
  name:     string;
  nameAr:   string | null;
  nameFr:   string | null;
  required: boolean;
  uiType:   'pills' | 'dropdown' | 'cards';
  position: number;
  variants: VariantResponse[];
}

export interface VariantGroupRequest {
  name:      string;
  nameAr?:   string;
  required:  boolean;
  uiType:    'pills' | 'dropdown' | 'cards';
  variants?: VariantRequest[];
}

export interface VariantResponse {
  id:          string;
  name:        string;
  nameAr:      string | null;
  description: string | null;
  price:       number;
  imageUrl:    string | null;
  available:   boolean;
  isDefault:   boolean;
  position:    number;
}

export interface VariantRequest {
  name:         string;
  nameAr?:      string;
  description?: string;
  price:        number;
  available:    boolean;
  isDefault:    boolean;
}

// ── Modifier Group ────────────────────────────────────────────────────────────

export interface ModifierGroupResponse {
  id:          string;
  name:        string;
  nameAr:      string | null;
  description: string | null;
  required:    boolean;
  minSelect:   number;
  maxSelect:   number;
  uiType:      'checkbox' | 'radio' | 'stepper';
  position:    number;
  modifiers:   ModifierResponse[];
}

export interface ModifierGroupRequest {
  name:        string;
  nameAr?:     string;
  description?:string;
  required:    boolean;
  minSelect:   number;
  maxSelect:   number;
  uiType:      'checkbox' | 'radio' | 'stepper';
  modifiers?:  ModifierRequest[];
}

export interface ModifierResponse {
  id:         string;
  name:       string;
  nameAr:     string | null;
  priceDelta: number;
  available:  boolean;
  isDefault:  boolean;
  position:   number;
}

export interface ModifierRequest {
  name:        string;
  nameAr?:     string;
  priceDelta:  number;
  available:   boolean;
  isDefault:   boolean;
}

// ── UI state helpers ──────────────────────────────────────────────────────────

export type PanelMode = 'create' | 'edit';

export const UI_TYPE_LABELS = {
  pills:    'Pills',
  dropdown: 'Dropdown',
  cards:    'Cards',
  checkbox: 'Checkbox',
  radio:    'Radio',
  stepper:  'Stepper',
};

export const COMMON_ICONS = [
  '☕', '🍵', '🥤', '🧃', '🥛', '🍺', '🍷', '🍹',
  '🍕', '🍔', '🌮', '🌯', '🥗', '🍜', '🍱', '🍣',
  '🥩', '🍗', '🥚', '🧆', '🥙', '🫕', '🥘', '🍲',
  '🍰', '🎂', '🧁', '🍩', '🍪', '🍫', '🍦', '🍮',
];