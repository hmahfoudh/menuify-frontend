import { Injectable, signal, computed } from '@angular/core';
import {
  CartItem,
  PublicItemResponse,
  PublicVariantResponse,
  PublicModifierResponse
} from '../models/public-menu.models';

@Injectable({ providedIn: 'root' })
export class CartService {

  // ── State ───────────────────────────────────────────────────────────────────
  readonly items  = signal<CartItem[]>([]);
  readonly isOpen = signal(false);

  // ── Computed ─────────────────────────────────────────────────────────────────
  readonly count = computed(() =>
    this.items().reduce((s, i) => s + i.quantity, 0));

  readonly subtotal = computed(() =>
    this.items().reduce((s, i) => s + i.lineTotal, 0));

  readonly isEmpty = computed(() => this.items().length === 0);

  // ── Drawer ────────────────────────────────────────────────────────────────────
  open()   { this.isOpen.set(true);  }
  close()  { this.isOpen.set(false); }
  toggle() { this.isOpen.update(v => !v); }

  // ── Mutations ─────────────────────────────────────────────────────────────────

  addItem(
    item:        PublicItemResponse,
    variant:     PublicVariantResponse | null,
    modifiers:   PublicModifierResponse[],
    quantity:    number,
    specialNote: string
  ): void {
    const unitPrice = this.calcUnitPrice(item, variant, modifiers);
    const lineTotal = +(unitPrice * quantity).toFixed(3);

    // Merge into existing line if identical configuration
    const match = this.items().find(c =>
      c.item.id         === item.id &&
      c.variant?.id     === variant?.id &&
      this.sameModifiers(c.modifiers, modifiers) &&
      c.specialNote     === specialNote
    );

    if (match) {
      this.updateQuantity(match.cartId, match.quantity + quantity);
    } else {
      this.items.update(list => [
        ...list,
        { cartId: crypto.randomUUID(), item, variant, modifiers,
          quantity, unitPrice, lineTotal, specialNote }
      ]);
    }
  }

  updateQuantity(cartId: string, qty: number): void {
    if (qty <= 0) { this.removeItem(cartId); return; }
    this.items.update(list =>
      list.map(i => i.cartId === cartId
        ? { ...i, quantity: qty,
            lineTotal: +(i.unitPrice * qty).toFixed(3) }
        : i
      )
    );
  }

  removeItem(cartId: string): void {
    this.items.update(list => list.filter(i => i.cartId !== cartId));
  }

  clear(): void { this.items.set([]); }

  // ── Price calculation ─────────────────────────────────────────────────────────

  calcUnitPrice(
    item:      PublicItemResponse,
    variant:   PublicVariantResponse | null,
    modifiers: PublicModifierResponse[]
  ): number {
    let price = variant
      ? variant.price
      : (item.basePrice ?? 0);

    for (const mod of modifiers) {
      price += mod.priceDelta;
    }

    return Math.max(0, +price.toFixed(3));
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private sameModifiers(
    a: PublicModifierResponse[],
    b: PublicModifierResponse[]
  ): boolean {
    const sort = (arr: PublicModifierResponse[]) =>
      [...arr.map(m => m.id)].sort().join(',');
    return sort(a) === sort(b);
  }
}