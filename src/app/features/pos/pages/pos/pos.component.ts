import {
  Component, OnInit, OnDestroy, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { interval, Subscription, forkJoin } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

import {
  TableStatusResponse, TableStatus, TABLE_STATUS_META,
  PosOrderType, PosPaymentType,
  PosCartItem, PosCartVariant, PosCartModifier,
  CATEGORY_ACCENT_PALETTE,
} from '../../models/pos.models';
import {
  PublicCategoryResponse, PublicItemResponse,
  PublicModifierGroupResponse, PublicVariantResponse
} from '../../../public/models/public-menu.models';
import { PosService } from '../../services/pos.service';
import { PosAuthService } from '../../services/pos-auth.service';
import { PosCartService } from '../../services/pos-cart.service';

type PosView = 'pos' | 'orderSent';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
})
export class PosComponent implements OnInit, OnDestroy {

  private posSvc = inject(PosService);
  private posAuth = inject(PosAuthService);
  private cart = inject(PosCartService);
  private router = inject(Router);

  // ── Data ────────────────────────────────────────────────────────────────────
  tables = signal<TableStatusResponse[]>([]);
  categories = signal<PublicCategoryResponse[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // ── Table selection ──────────────────────────────────────────────────────────
  // 'no-table' = walk-in / takeaway (explicit valid selection)
  // null = nothing selected yet (initial state on fresh load)
  selectedTableKey = signal<string | null>('no-table');

  selectedTable = computed(() => {
    const key = this.selectedTableKey();
    if (!key || key === 'no-table') return null;
    return this.tables().find(t => String(t.number) === key) ?? null;
  });

  // ── Category / menu navigation ───────────────────────────────────────────────
  activeCatId = signal<string | null>(null);  // null = "All"
  searchQuery = signal('');
  qtyPreset = signal(1);

  categoryAccents = computed(() => {
    const map = new Map<string, string>();
    this.categories().forEach((c, i) =>
      map.set(c.id, CATEGORY_ACCENT_PALETTE[i % CATEGORY_ACCENT_PALETTE.length])
    );
    return map;
  });

  filteredItems = computed(() => {
    const catId = this.activeCatId();
    const q = this.searchQuery().trim().toLowerCase();
    let cats = this.categories();
    if (catId) cats = cats.filter(c => c.id === catId);
    let items = cats.flatMap(c => c.items.map(i => ({
      ...i,
      _accent: this.categoryAccents().get(c.id) ?? '#c9a96e'
    })));
    if (q) items = items.filter(i => i.name.toLowerCase().includes(q));
    return items;
  });

  // ── Item modal (variant / modifier picker) ────────────────────────────────
  modalItem = signal<(PublicItemResponse & { _accent: string }) | null>(null);
  modalVariant = signal<PublicVariantResponse | null>(null);
  modalMods = signal<Set<string>>(new Set());

  modalUnitPrice = computed(() => {
    const item = this.modalItem();
    if (!item) return 0;
    // Use variant price if selected, otherwise displayPrice (already computed
    // server-side from the cheapest variant), fall back to basePrice
    const vPrice = this.modalVariant()?.price
      ?? item.displayPrice
      ?? item.basePrice
      ?? 0;
    const mDelta = item.modifierGroups
      .flatMap(g => g.modifiers)
      .filter(m => this.modalMods().has(m.id))
      .reduce((s, m) => s + m.priceDelta, 0);
    return +(vPrice + mDelta).toFixed(3);
  });

  // ── Cart (proxied from PosCartService) ────────────────────────────────────
  cartItems = this.cart.items;
  cartCount = this.cart.count;
  cartSubtotal = this.cart.subtotal;
  cartIsEmpty = this.cart.isEmpty;

  // ── Order options ─────────────────────────────────────────────────────────
  orderType = signal<PosOrderType>('dine_in');
  paymentType = signal<PosPaymentType>('cash');
  orderNotes = signal('');
  submitting = signal(false);
  submitError = signal<string | null>(null);
  lastOrderRef = signal<string | null>(null);
  view = signal<PosView>('pos');

  // Snapshot of the cart at the moment the order is placed —
  // cart is cleared immediately after, so we capture before clearing
  receiptLines = signal<PosCartItem[]>([]);
  receiptSubtotal = signal<number>(0);
  receiptTable = signal<string | null>(null);
  tenantName = signal<string>('');

  // Computed for template — arrow functions not allowed in Angular interpolation
  activeTableCount = computed(() =>
    this.tables().filter(t => t.status !== 'FREE').length
  );

  // ── Constants ─────────────────────────────────────────────────────────────
  readonly tableStatusMeta = TABLE_STATUS_META;
  readonly qtyPresets = [1, 2, 3, 5, 10];
  readonly orderTypes: { value: PosOrderType; label: string }[] = [
    { value: 'dine_in', label: 'Sur place' },
    { value: 'takeaway', label: 'À emporter' },
    { value: 'delivery', label: 'Livraison' },
  ];

  private tablePoll?: Subscription;

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAll();
    this.cart.setTable('no-table');

    // Poll table status every 30s
    this.tablePoll = interval(30_000)
      .pipe(startWith(0), switchMap(() => this.posSvc.getTableStatus()))
      .subscribe({
        next: tables => this.tables.set(tables),
        error: () => { }
      });
  }

  ngOnDestroy(): void {
    this.tablePoll?.unsubscribe();
  }

  private loadAll(): void {
    this.loading.set(true);
    forkJoin({
      menu: this.posSvc.getMenu(),
      tables: this.posSvc.getTableStatus(),
    }).subscribe({
      next: ({ menu, tables }) => {
        this.categories.set(menu.categories);
        this.tenantName.set(menu.tenantName ?? '');
        this.tables.set(tables);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load POS data. Please refresh.');
      }
    });
  }

  // ── Table panel ───────────────────────────────────────────────────────────

  selectTable(key: string): void {
    this.selectedTableKey.set(key);
    this.cart.setTable(key);
    // Auto-set order type
    this.orderType.set(key === 'no-table' ? 'takeaway' : 'dine_in');
    this.submitError.set(null);
  }

  tableKey(t: TableStatusResponse): string {
    return String(t.number);
  }

  tableCardClass(t: TableStatusResponse): string {
    const key = String(t.number);
    const selected = this.selectedTableKey() === key;
    if (selected) return 'tbl-card tbl-card--selected';
    return `tbl-card tbl-card--${t.status.toLowerCase()}`;
  }

  tableStatusLabel(t: TableStatusResponse): string {
    return TABLE_STATUS_META[t.status].label;
  }

  tableStatusDot(t: TableStatusResponse): string {
    return TABLE_STATUS_META[t.status].dot;
  }

  // ── Category navigation ───────────────────────────────────────────────────

  setCategory(id: string | null): void {
    this.activeCatId.set(id);
  }

  setSearch(v: string): void {
    this.searchQuery.set(v);
    if (v) this.activeCatId.set(null); // searching across all categories
  }

  setQtyPreset(n: number): void {
    this.qtyPreset.set(n);
  }

  // ── Item tapping ──────────────────────────────────────────────────────────

  tapItem(item: PublicItemResponse & { _accent: string }): void {
    const hasVariants = item.variantGroups.length > 0;
    const hasModifiers = item.modifierGroups.length > 0;

    if (!hasVariants && !hasModifiers) {
      // Simple item — add directly with current qty preset
      const price = item.basePrice ?? 0;
      this.cart.addItem(item.id, item.name, null, [], this.qtyPreset(), price);
      this.qtyPreset.set(1);
      return;
    }

    // Open modal for variant/modifier selection
    this.modalItem.set(item);
    const allVariants = item.variantGroups.flatMap(g => g.variants);
    const def = allVariants.find(v => v.isDefault) ?? allVariants[0] ?? null;
    this.modalVariant.set(def);

    const defaultMods = new Set<string>();
    item.modifierGroups.forEach(g =>
      g.modifiers.filter(m => m.isDefault).forEach(m => defaultMods.add(m.id))
    );
    this.modalMods.set(defaultMods);
  }

  closeModal(): void { this.modalItem.set(null); }

  selectVariant(v: PublicVariantResponse): void {
    this.modalVariant.set(v);
  }

  toggleMod(modId: string, group: PublicModifierGroupResponse): void {
    const mods = new Set(this.modalMods());
    if (group.uiType === 'radio') {
      group.modifiers.forEach(m => mods.delete(m.id));
      mods.add(modId);
    } else {
      const selected = group.modifiers.filter(m => mods.has(m.id)).length;
      if (mods.has(modId)) {
        mods.delete(modId);
      } else if (selected < group.maxSelect) {
        mods.add(modId);
      }
    }
    this.modalMods.set(mods);
  }

  isModSelected(id: string): boolean {
    return this.modalMods().has(id);
  }

  addModalItemToCart(): void {
    const item = this.modalItem();
    if (!item) return;

    const variant = this.modalVariant()
      ? { id: this.modalVariant()!.id, name: this.modalVariant()!.name, price: this.modalVariant()!.price }
      : null;

    const mods: PosCartModifier[] = item.modifierGroups
      .flatMap(g => g.modifiers)
      .filter(m => this.modalMods().has(m.id))
      .map(m => ({ id: m.id, name: m.name, priceDelta: m.priceDelta }));

    this.cart.addItem(
      item.id, item.name, variant, mods,
      this.qtyPreset(), this.modalUnitPrice()
    );
    this.qtyPreset.set(1);
    this.closeModal();
  }

  // ── Cart actions ──────────────────────────────────────────────────────────

  updateQty(cartId: string, qty: number): void {
    this.cart.updateQuantity(cartId, qty);
  }

  removeItem(cartId: string): void {
    this.cart.removeItem(cartId);
  }

  setOrderType(t: PosOrderType): void { this.orderType.set(t); }
  setPaymentType(p: PosPaymentType): void { this.paymentType.set(p); }
  setOrderNotes(v: string): void { this.orderNotes.set(v); }

  // ── Place order ───────────────────────────────────────────────────────────

  placeOrder(): void {
    if (this.cartIsEmpty() || this.submitting()) return;

    const tableKey = this.selectedTableKey();

    this.submitting.set(true);
    this.submitError.set(null);

    const payload = {
      orderType: this.orderType(),
      tableNumber: tableKey === 'no-table' ? null : tableKey,
      customerName: null,
      notes: this.orderNotes() || null,
      paymentType: this.paymentType(),
      source: 'POS' as const,
      lines: this.cartItems().map(c => ({
        itemId: c.itemId,
        variantId: c.variant?.id ?? null,
        quantity: c.quantity,
        modifierIds: c.modifiers.map(m => m.id),
        specialInstructions: c.note || null,
      })),
    };

    this.posSvc.placeOrder(payload).subscribe({
      next: order => {
        // Snapshot cart BEFORE clearing — receipt renders from these
        this.receiptLines.set([...this.cartItems()]);
        this.receiptSubtotal.set(this.cartSubtotal());
        this.receiptTable.set(
          tableKey === 'no-table' ? null : tableKey
        );

        this.lastOrderRef.set(order.reference);
        this.cart.clearTable(tableKey ?? 'no-table');
        this.orderNotes.set('');
        this.submitting.set(false);
        this.view.set('orderSent');
      },
      error: err => {
        this.submitting.set(false);
        this.submitError.set(err?.error?.message ?? 'Failed to place order');
      }
    });
  }

  printReceipt(): void {
    window.print();
  }

  newOrder(): void {
    this.view.set('pos');
    this.lastOrderRef.set(null);
    this.receiptLines.set([]);
    this.receiptSubtotal.set(0);
    this.receiptTable.set(null);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  get staffName(): string {
    return this.posAuth.isOwner()
      ? 'Owner'
      : this.posAuth.getStaffName();
  }

  logout(): void {
    if (this.posAuth.isOwner()) {
      this.router.navigateByUrl('/dashboard');
    } else {
      this.posAuth.staffLogout();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Current date — bound once in the template for the receipt timestamp */
  get now(): Date { return new Date(); }

  fmt(n: number): string { return n.toFixed(3); }

  accentFor(catId: string): string {
    return this.categoryAccents().get(catId) ?? '#c9a96e';
  }

  trackById(_: number, item: { id?: string; cartId?: string }): string {
    return item.id ?? item.cartId ?? '';
  }
}
