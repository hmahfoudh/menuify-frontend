import { Injectable, signal, computed } from '@angular/core';
import { PosCartItem, PosCartModifier, PosCartVariant } from '../models/pos.models';

/**
 * Manages the in-progress order on the POS order panel.
 *
 * Per-table cart: selecting a different table switches the cart context.
 * Each table's items are persisted in memory during the session.
 *
 * REACTIVITY FIX:
 * The original version stored carts in a plain Map<string, PosCartItem[]> and
 * tried to trigger re-renders by calling activeTableKey.set(sameValue). Angular
 * signals skip the notification when the new value === the old value (same string),
 * so adding items to the CURRENT table never updated the view.
 *
 * Solution: keep the off-screen carts in a plain Map (no reactivity needed there),
 * but store the ACTIVE table's items in their own signal. Every mutation to the
 * active cart goes through this signal directly, so Angular always detects the change.
 */
@Injectable({ providedIn: 'root' })
export class PosCartService {

  // Off-screen carts — plain Map, no reactivity needed
  // (written when switching away from a table, read when switching back)
  private savedCarts = new Map<string, PosCartItem[]>();

  // Currently active table key
  activeTableKey = signal<string>('no-table');

  // Active cart items as a signal — ALL mutations go through this
  // so Angular always detects changes and re-renders the order panel
  private activeItems = signal<PosCartItem[]>([]);

  // ── Public computed signals ──────────────────────────────────────────────────

  items = computed(() => this.activeItems());

  count = computed(() =>
    this.activeItems().reduce((sum, i) => sum + i.quantity, 0)
  );

  subtotal = computed(() =>
    this.activeItems().reduce((sum, i) => sum + i.lineTotal, 0)
  );

  isEmpty = computed(() => this.activeItems().length === 0);

  // ── Table switching ─────────────────────────────────────────────────────────

  setTable(tableKey: string): void {
    // Save current cart before switching
    this.savedCarts.set(this.activeTableKey(), [...this.activeItems()]);

    // Switch to new table
    this.activeTableKey.set(tableKey);

    // Restore saved cart for this table (empty array if first visit)
    const saved = this.savedCarts.get(tableKey) ?? [];
    this.activeItems.set([...saved]);
  }

  // ── Item management ─────────────────────────────────────────────────────────

  addItem(
    itemId:    string,
    itemName:  string,
    variant:   PosCartVariant | null,
    modifiers: PosCartModifier[],
    quantity:  number,
    unitPrice: number,
    note:      string = ''
  ): void {
    const current = this.activeItems();

    // Try to merge with an existing line that has the same
    // item + variant + modifiers combination
    const matchIdx = current.findIndex(c =>
      c.itemId === itemId &&
      c.variant?.id === variant?.id &&
      JSON.stringify(c.modifiers.map(m => m.id).sort()) ===
      JSON.stringify(modifiers.map(m => m.id).sort()) &&
      c.note === note
    );

    if (matchIdx >= 0) {
      const existing = current[matchIdx];
      const newQty   = existing.quantity + quantity;
      this.activeItems.set(current.map((c, i) =>
        i === matchIdx
          ? { ...c, quantity: newQty, lineTotal: +(unitPrice * newQty).toFixed(3) }
          : c
      ));
    } else {
      this.activeItems.set([
        ...current,
        {
          cartId:    crypto.randomUUID(),
          itemId,
          itemName,
          variant,
          modifiers,
          quantity,
          unitPrice,
          lineTotal: +(unitPrice * quantity).toFixed(3),
          note,
        },
      ]);
    }
  }

  updateQuantity(cartId: string, newQty: number): void {
    const current = this.activeItems();
    if (newQty <= 0) {
      this.activeItems.set(current.filter(i => i.cartId !== cartId));
    } else {
      this.activeItems.set(
        current.map(i =>
          i.cartId === cartId
            ? { ...i, quantity: newQty, lineTotal: +(i.unitPrice * newQty).toFixed(3) }
            : i
        )
      );
    }
  }

  removeItem(cartId: string): void {
    this.updateQuantity(cartId, 0);
  }

  clearTable(tableKey: string): void {
    this.savedCarts.set(tableKey, []);
    if (this.activeTableKey() === tableKey) {
      this.activeItems.set([]);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  fmt(n: number): string {
    return n.toFixed(3);
  }

  calcUnitPrice(
    basePrice:  number,
    variant:    PosCartVariant | null,
    modifiers:  PosCartModifier[]
  ): number {
    const variantPrice = variant?.price ?? basePrice;
    const modTotal     = modifiers.reduce((s, m) => s + m.priceDelta, 0);
    return +(variantPrice + modTotal).toFixed(3);
  }
}