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
 
export interface ItemResponse {
  id:           string;
  categoryId:   string;
  name:         string;
  nameAr:       string | null;
  nameFr:       string | null;
  description:  string | null;
  basePrice:    number | null;
  displayPrice: number | null;
  imageUrl:     string | null;
  featured:     boolean;
  available:    boolean;
  hasVariants:  boolean;
  vegetarian:   boolean;
  vegan:        boolean;
  glutenFree:   boolean;
  spicy:        boolean;
  tags:         string | null;
  position:     number;
  createdAt:    string;
}
 
export interface ItemRequest {
  categoryId:    string;
  name:          string;
  nameAr?:       string;
  nameFr?:       string;
  description?:  string;
  basePrice?:    number | null;
  featured:      boolean;
  available:     boolean;
  vegetarian:    boolean;
  vegan:         boolean;
  glutenFree:    boolean;
  spicy:         boolean;
  tags?:         string;
}
 
export interface ReorderRequest {
  id:       string;
  position: number;
}
 
// Dietary flags for the item form chips
export const DIETARY_FLAGS = [
  { key: 'vegetarian', label: 'Vegetarian', emoji: '🌿' },
  { key: 'vegan',      label: 'Vegan',      emoji: '🌱' },
  { key: 'glutenFree', label: 'Gluten free', emoji: '🌾' },
  { key: 'spicy',      label: 'Spicy',      emoji: '🌶️'  },
] as const;