// ── Item Pairing Group ────────────────────────────────────────────────────────

export interface ItemPairingGroupResponse {
  id:         string;
  itemId:     string;
  name:       string;
  nameAr:     string | null;
  nameFr:     string | null;
  minSelect:  number;
  maxSelect:  number;
  required:   boolean;
  position:   number;
  pairings:   ItemPairingResponse[];
}

export interface ItemPairingGroupRequest {
  name:      string;
  nameAr?:   string;
  nameFr?:   string;
  minSelect: number;
  maxSelect: number;
  position:  number;
}

// ── Item Pairing ──────────────────────────────────────────────────────────────

export interface ItemPairingResponse {
  id:                  string;
  groupId:             string;
  pairedItemId:        string;
  pairedItemName:      string;
  pairedItemNameAr:    string | null;
  pairedItemNameFr:    string | null;
  pairedItemImageUrl:  string | null;
  priceDelta:          number;
  available:           boolean;
  effectivelyAvailable:boolean;
  position:            number;
}

export interface ItemPairingRequest {
  pairedItemId: string;
  priceDelta:   number;
  available:    boolean;
  position:     number;
}

// ── Item Search (used by the search modal) ────────────────────────────────────

export interface ItemSearchResult {
  id:           string;
  name:         string;
  nameAr:       string | null;
  nameFr:       string | null;
  imageUrl:     string | null;
  displayPrice: number | null;
  basePrice:    number | null;
  available:    boolean;
  categoryName: string | null;
}