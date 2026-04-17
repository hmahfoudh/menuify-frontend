import {
  Component, OnInit, OnDestroy, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription, forkJoin } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

import {
  TableStatusResponse, TABLE_STATUS_META,
  PosOrderType, PosPaymentType,
  PosCartItem, PosCartModifier,
  CATEGORY_ACCENT_PALETTE,
  AddOrderLinesRequest,
} from '../../models/pos.models';
import {
  PublicCategoryResponse, PublicItemResponse,
  PublicModifierGroupResponse, PublicVariantResponse
} from '../../../public/models/public-menu.models';
import { PosService } from '../../services/pos.service';
import { PosCartService } from '../../services/pos-cart.service';
import { PosOrderService } from '../../services/pos-order.service';
import { ShiftService } from '../../services/shift.service';
import { CashService } from '../../services/cash.service';
import { PaymentService } from '../../services/payment.service';
import { RefundService } from '../../services/refund.service';
import { ReportService } from '../../services/report.service';
import { OpenShiftRequest, CloseShiftRequest } from '../../models/shift.models';
import { CashMovementRequest } from '../../models/cash.models';
import { PaymentMethod } from '../../models/payment.models';
import { IssueRefundRequest } from '../../models/refund.models';
import { PosOrder } from '../../models/pos-order.models';
import { ZReportResponse } from '../../models/report.models';
import { AuthService } from '../../../../core/services/auth.service';

// ── Child components ──────────────────────────────────────────────────────────
import { PosTopbarComponent } from './components/pos-topbar/pos-topbar.component';
import { PosTablesColumnComponent } from './components/pos-tables-column/pos-tables-column.component';
import { PosMenuColumnComponent } from './components/pos-menu-column/pos-menu-column.component';
import { PosOrderColumnComponent } from './components/pos-order-column/pos-order-column.component';
import { PosReceiptComponent } from './components/pos-receipt/pos-receipt.component';

import { PosItemModalComponent } from './components/modals/pos-item-modal/pos-item-modal.component';
import { PosItemNoteModalComponent } from './components/modals/pos-item-note-modal/pos-item-note-modal.component';
import { PosOpenShiftModalComponent } from './components/modals/pos-open-shift-modal/pos-open-shift-modal.component';
import { PosCloseShiftModalComponent } from './components/modals/pos-close-shift-modal/pos-close-shift-modal.component';
import { PosCashMovementModalComponent } from './components/modals/pos-cash-movement-modal/pos-cash-movement-modal.component';
import { PosDiscountModalComponent } from './components/modals/pos-discount-modal/pos-discount-modal.component';
import { PosPromoModalComponent } from './components/modals/pos-promo-modal/pos-promo-modal.component';
import { PosRefundModalComponent } from './components/modals/pos-refund-modal/pos-refund-modal.component';
import { PosZReportModalComponent } from './components/modals/pos-z-report-modal/pos-z-report-modal.component';

// ── View states ───────────────────────────────────────────────────────────────
export type PosView = 'pos' | 'payment' | 'orderSent';
export type ModalView = 'none' | 'item' | 'openShift' | 'closeShift' | 'itemNote'
  | 'cashIn' | 'cashOut' | 'discount' | 'promo' | 'refund' | 'refundDetail' | 'zReport';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PosTopbarComponent,
    PosTablesColumnComponent,
    PosMenuColumnComponent,
    PosOrderColumnComponent,
    PosReceiptComponent,
    PosItemModalComponent,
    PosItemNoteModalComponent,
    PosOpenShiftModalComponent,
    PosCloseShiftModalComponent,
    PosCashMovementModalComponent,
    PosDiscountModalComponent,
    PosPromoModalComponent,
    PosRefundModalComponent,
    PosZReportModalComponent,
  ],
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
})
export class PosComponent implements OnInit, OnDestroy {

  private posSvc     = inject(PosService);
  private authService    = inject(AuthService);
  private cart       = inject(PosCartService);
  private router     = inject(Router);
  private shiftSvc   = inject(ShiftService);
  private cashSvc    = inject(CashService);
  private paymentSvc = inject(PaymentService);
  private refundSvc  = inject(RefundService);
  private reportSvc  = inject(ReportService);
  private orderSvc   = inject(PosOrderService);

  parseFloat = parseFloat;

  // ── Data ──────────────────────────────────────────────────────────────────
  tables     = signal<TableStatusResponse[]>([]);
  categories = signal<PublicCategoryResponse[]>([]);
  loading    = signal(true);
  error      = signal<string | null>(null);

  // ── Shift & Cash ──────────────────────────────────────────────────────────
  currentShift  = this.shiftSvc.currentShift;
  drawerState   = this.cashSvc.drawer;
  shiftLoading  = signal(false);
  shiftError    = signal<string | null>(null);

  // Open shift form
  openFloatInput  = signal('50.000');
  // Close shift form
  closeCountInput = signal('');
  closeNotesInput = signal('');

  get isShiftOpen(): boolean { return this.shiftSvc.isShiftOpen; }

  // ── Table selection ───────────────────────────────────────────────────────
  selectedTableKey = signal<string | null>('no-table');

  selectedTable = computed(() => {
    const key = this.selectedTableKey();
    if (!key || key === 'no-table') return null;
    return this.tables().find(t => String(t.number) === key) ?? null;
  });

  // ── Active order for the selected table ───────────────────────────────────
  tableActiveOrder        = signal<PosOrder | null>(null);
  tableActiveOrderLoading = signal(false);
  addingToOrderId         = signal<string | null>(null);

  // ── Category / menu navigation ────────────────────────────────────────────
  activeCatId  = signal<string | null>(null);
  searchQuery  = signal('');
  qtyPreset    = signal(1);

  categoryAccents = computed(() => {
    const map = new Map<string, string>();
    this.categories().forEach((c, i) =>
      map.set(c.id, CATEGORY_ACCENT_PALETTE[i % CATEGORY_ACCENT_PALETTE.length])
    );
    return map;
  });

  filteredItems = computed(() => {
    const catId = this.activeCatId();
    const q     = this.searchQuery().trim().toLowerCase();
    let cats    = this.categories();
    if (catId) cats = cats.filter(c => c.id === catId);
    let items = cats.flatMap(c => c.items.map(i => ({
      ...i, _accent: this.categoryAccents().get(c.id) ?? '#c9a96e'
    })));
    if (q) items = items.filter(i => i.name.toLowerCase().includes(q));
    return items;
  });

  // ── Item modal ────────────────────────────────────────────────────────────
  modalItem    = signal<(PublicItemResponse & { _accent: string }) | null>(null);
  modalVariant = signal<PublicVariantResponse | null>(null);
  modalMods    = signal<Set<string>>(new Set());

  modalUnitPrice = computed(() => {
    const item = this.modalItem();
    if (!item) return 0;
    const vPrice = this.modalVariant()?.price ?? item.displayPrice ?? item.basePrice ?? 0;
    const mDelta = item.modifierGroups
      .flatMap(g => g.modifiers)
      .filter(m => this.modalMods().has(m.id))
      .reduce((s, m) => s + m.priceDelta, 0);
    return +(vPrice + mDelta).toFixed(3);
  });

  // ── Item note modal ───────────────────────────────────────────────────────
  noteTargetCartId = signal<string | null>(null);
  noteInput        = signal('');

  // ── Cart ──────────────────────────────────────────────────────────────────
  cartItems    = this.cart.items;
  cartCount    = this.cart.count;
  cartSubtotal = this.cart.subtotal;
  cartIsEmpty  = this.cart.isEmpty;

  // ── Order options ─────────────────────────────────────────────────────────
  orderType    = signal<PosOrderType>('DINE_IN');
  paymentType  = signal<PosPaymentType>('cash');
  orderNotes   = signal('');
  submitting   = signal(false);
  submitError  = signal<string | null>(null);

  // ── Payment modal state ───────────────────────────────────────────────────
  pendingOrderId  = signal<string | null>(null);
  pendingOrderRef = signal<string | null>(null);
  pendingTotal    = signal<number>(0);
  tenderedInput   = signal('');
  tipInput        = signal('0.000');
  paymentError    = signal<string | null>(null);
  paymentLoading  = signal(false);

  changeAmount = computed(() => {
    const tendered  = parseFloat(this.tenderedInput()) || 0;
    const total     = this.pendingTotal();
    const tip       = parseFloat(this.tipInput()) || 0;
    const change    = tendered - total - tip;
    return Math.max(0, +change.toFixed(3));
  });

  isTenderedSufficient = computed(() => {
    const tendered = parseFloat(this.tenderedInput()) || 0;
    const total    = this.pendingTotal();
    const tip      = parseFloat(this.tipInput()) || 0;
    return tendered >= total + tip;
  });

  // ── Receipt / order sent ──────────────────────────────────────────────────
  view            = signal<PosView>('pos');
  lastOrderRef    = signal<string | null>(null);
  receiptLines    = signal<PosCartItem[]>([]);
  receiptSubtotal = signal<number>(0);
  receiptTable    = signal<string | null>(null);
  tenantName      = signal<string>('');

  // ── Modal overlay ─────────────────────────────────────────────────────────
  activeModal = signal<ModalView>('none');

  // ── Derived ───────────────────────────────────────────────────────────────
  activeTableCount = computed(() =>
    this.tables().filter(t => t.status !== 'FREE').length
  );

  // ── Constants ─────────────────────────────────────────────────────────────
  readonly tableStatusMeta = TABLE_STATUS_META;
  readonly qtyPresets      = [1, 2, 3, 5, 10];
  readonly orderTypes: { value: PosOrderType; label: string }[] = [
    { value: 'DINE_IN',   label: 'Sur place' },
    { value: 'TAKEAWAY',  label: 'À emporter' },
    { value: 'DELIVERY',  label: 'Livraison' },
  ];

  private tablePoll?: Subscription;
  private shiftPoll?: Subscription;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAll();
    this.cart.setTable('no-table');

    this.shiftSvc.loadCurrentShift().subscribe({
      next: () => {
        if (!this.isShiftOpen) this.activeModal.set('openShift');
        else this.cashSvc.loadDrawer().subscribe();
      },
      error: () => {
        this.activeModal.set('openShift');
      }
    });

    this.tablePoll = interval(30_000)
      .pipe(startWith(0), switchMap(() => this.posSvc.getTableStatus()))
      .subscribe({ next: t => this.tables.set(t), error: () => {} });

    this.shiftPoll = interval(60_000)
      .pipe(startWith(0), switchMap(() => this.shiftSvc.loadCurrentShift()))
      .subscribe({ error: () => {} });
  }

  ngOnDestroy(): void {
    this.tablePoll?.unsubscribe();
    this.shiftPoll?.unsubscribe();
  }

  private loadAll(): void {
    this.loading.set(true);
    forkJoin({
      menu:   this.posSvc.getMenu(),
      tables: this.posSvc.getTableStatus(),
    }).subscribe({
      next: ({ menu, tables }) => {
        this.categories.set(menu.categories);
        this.tenantName.set(menu.tenant.name ?? '');
        this.tables.set(tables);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load POS data. Please refresh.');
      }
    });
  }

  // ── Shift management ──────────────────────────────────────────────────────

  openShift(): void {
    const float = parseFloat(this.openFloatInput());
    if (isNaN(float) || float < 0) {
      this.shiftError.set('Enter a valid opening float (0 or more).');
      return;
    }
    this.shiftLoading.set(true);
    this.shiftError.set(null);
    const req: OpenShiftRequest = { openingFloat: +float.toFixed(3) };
    this.shiftSvc.openShift(req).subscribe({
      next: () => {
        this.cashSvc.loadDrawer().subscribe();
        this.shiftLoading.set(false);
        this.activeModal.set('none');
      },
      error: err => {
        this.shiftLoading.set(false);
        this.shiftError.set(err?.error?.message ?? 'Failed to open shift.');
      }
    });
  }

  openCloseShiftModal(): void {
    const expected = this.drawerState()?.expectedBalance ?? 0;
    this.closeCountInput.set(expected.toFixed(3));
    this.closeNotesInput.set('');
    this.shiftError.set(null);
    this.activeModal.set('closeShift');
  }

  closeShift(): void {
    const actual = parseFloat(this.closeCountInput());
    if (isNaN(actual) || actual < 0) {
      this.shiftError.set('Enter a valid cash count.');
      return;
    }
    this.shiftLoading.set(true);
    this.shiftError.set(null);
    const req: CloseShiftRequest = {
      actualCashCount: +actual.toFixed(3),
      notes: this.closeNotesInput() || undefined,
    };
    this.shiftSvc.closeShift(req).subscribe({
      next: () => {
        this.shiftLoading.set(false);
        this.activeModal.set('openShift');
      },
      error: err => {
        this.shiftLoading.set(false);
        this.shiftError.set(err?.error?.message ?? 'Failed to close shift.');
      }
    });
  }

  // ── Table panel ───────────────────────────────────────────────────────────

  selectTable(key: string): void {
    this.selectedTableKey.set(key);
    this.cart.setTable(key);
    this.orderType.set(key === 'no-table' ? 'TAKEAWAY' : 'DINE_IN');
    this.submitError.set(null);

    this.tableActiveOrder.set(null);
    this.addingToOrderId.set(null);

    if (key !== 'no-table') {
      const table = this.tables().find(t => String(t.number) === key);
      if (table?.orderId) {
        this.tableActiveOrderLoading.set(true);
        this.orderSvc.getOrder(table.orderId).subscribe({
          next: res => {
            this.tableActiveOrderLoading.set(false);
            if (res.success) this.tableActiveOrder.set(res.data);
          },
          error: () => this.tableActiveOrderLoading.set(false)
        });
      }
    }
  }

  tableKey(t: TableStatusResponse): string { return String(t.number); }

  tableCardClass(t: TableStatusResponse): string {
    const key      = String(t.number);
    const selected = this.selectedTableKey() === key;
    if (selected) return 'tbl-card tbl-card--selected';
    return `tbl-card tbl-card--${t.status.toLowerCase()}`;
  }

  tableStatusLabel(t: TableStatusResponse): string { return TABLE_STATUS_META[t.status].label; }
  tableStatusDot(t: TableStatusResponse): string   { return TABLE_STATUS_META[t.status].dot; }

  /** Called when the cashier clicks "Encaisser" on a loaded table order */
  payTableOrder(): void {
    const order = this.tableActiveOrder();
    if (!order) return;
    this.pendingOrderId.set(order.id);
    this.pendingOrderRef.set(order.reference);
    this.pendingTotal.set(order.amountDue ?? order.total);
    this.tenderedInput.set('');
    this.tipInput.set('0.000');
    this.paymentError.set(null);
    this.receiptSubtotal.set(order.amountDue ?? order.total);
    this.receiptTable.set(this.selectedTableKey() !== 'no-table' ? this.selectedTableKey() : null);
    this.lastOrderRef.set(order.reference);
    this.view.set('payment');
  }

  // ── Adding items to an existing table order ───────────────────────────────

  addingToExistingOrder = signal(false);
  addingToOrderLoading  = signal(false);
  addingToOrderError    = signal<string | null>(null);

  enterAddItemsMode(): void {
    this.cart.clearTable(this.selectedTableKey() ?? 'no-table');
    this.addingToExistingOrder.set(true);
    this.addingToOrderError.set(null);
  }

  cancelAddItems(): void {
    this.cart.clearTable(this.selectedTableKey() ?? 'no-table');
    this.addingToExistingOrder.set(false);
    this.addingToOrderError.set(null);
  }

  confirmAddItems(): void {
    const order = this.tableActiveOrder();
    if (!order || this.cartIsEmpty() || this.addingToOrderLoading()) return;

    this.addingToOrderLoading.set(true);
    this.addingToOrderError.set(null);

    const lines = this.cartItems().map(c => ({
      itemId:      c.itemId,
      variantId:   c.variant?.id,
      quantity:    c.quantity,
      notes:       c.note,
      modifierIds: c.modifiers.map(m => m.id),
    }));

    this.orderSvc.addLines(order.id, lines).subscribe({
      next: res => {
        if (res.success) {
          this.tableActiveOrder.set(res.data);
        }
        this.cart.clearTable(this.selectedTableKey() ?? 'no-table');
        this.addingToExistingOrder.set(false);
        this.addingToOrderLoading.set(false);
      },
      error: err => {
        this.addingToOrderLoading.set(false);
        this.addingToOrderError.set(
          err?.error?.message ?? 'Impossible d\'ajouter les articles.'
        );
      }
    });
  }

  orderStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      NEW: 'Nouveau', PENDING: 'En attente', CONFIRMED: 'Confirmé',
      IN_PROGRESS: 'En cours', PREPARING: 'En préparation',
      READY: 'Prêt', SERVED: 'Servi', PAID: 'Payé',
      COMPLETED: 'Terminé', CANCELLED: 'Annulé',
    };
    return labels[status] ?? status;
  }

  orderStatusClass(status: string): string {
    const map: Record<string, string> = {
      NEW: 'blue', PENDING: 'blue', CONFIRMED: 'blue',
      IN_PROGRESS: 'amber', PREPARING: 'amber',
      READY: 'green', SERVED: 'teal',
      PAID: 'gray', COMPLETED: 'gray', CANCELLED: 'red',
    };
    return map[status] ?? 'gray';
  }

  setCategory(id: string | null): void { this.activeCatId.set(id); }

  setSearch(v: string): void {
    this.searchQuery.set(v);
    if (v) this.activeCatId.set(null);
  }

  setQtyPreset(n: number): void { this.qtyPreset.set(n); }

  // ── Item tapping & modal ──────────────────────────────────────────────────

  tapItem(item: PublicItemResponse & { _accent: string }): void {
    const hasVariants  = item.variantGroups.length > 0;
    const hasModifiers = item.modifierGroups.length > 0;

    if (!hasVariants && !hasModifiers) {
      this.cart.addItem(item.id, item.name, null, [], this.qtyPreset(), item.basePrice ?? 0, '');
      this.qtyPreset.set(1);
      return;
    }

    this.modalItem.set(item);
    const allVariants = item.variantGroups.flatMap(g => g.variants);
    const def         = allVariants.find(v => v.isDefault) ?? allVariants[0] ?? null;
    this.modalVariant.set(def);

    const defaultMods = new Set<string>();
    item.modifierGroups.forEach(g =>
      g.modifiers.filter(m => m.isDefault).forEach(m => defaultMods.add(m.id))
    );
    this.modalMods.set(defaultMods);
    this.activeModal.set('item');
  }

  closeModal(): void {
    this.modalItem.set(null);
    this.activeModal.set('none');
  }

  selectVariant(v: PublicVariantResponse): void { this.modalVariant.set(v); }

  toggleMod(modId: string, group: PublicModifierGroupResponse): void {
    const mods = new Set(this.modalMods());
    if (group.uiType === 'radio') {
      group.modifiers.forEach(m => mods.delete(m.id));
      mods.add(modId);
    } else {
      const selected = group.modifiers.filter(m => mods.has(m.id)).length;
      if (mods.has(modId)) { mods.delete(modId); }
      else if (selected < group.maxSelect) { mods.add(modId); }
    }
    this.modalMods.set(mods);
  }

  isModSelected(id: string): boolean { return this.modalMods().has(id); }

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

    this.cart.addItem(item.id, item.name, variant, mods, this.qtyPreset(), this.modalUnitPrice(), '');
    this.qtyPreset.set(1);
    this.closeModal();
  }

  // ── Item note modal ───────────────────────────────────────────────────────

  openNoteModal(cartId: string): void {
    const line = this.cartItems().find(l => l.cartId === cartId);
    this.noteTargetCartId.set(cartId);
    this.noteInput.set(line?.note ?? '');
    this.activeModal.set('itemNote');
  }

  saveNote(): void {
    const cartId = this.noteTargetCartId();
    if (cartId) this.cart.setNote(cartId, this.noteInput());
    this.activeModal.set('none');
    this.noteTargetCartId.set(null);
    this.noteInput.set('');
  }

  closeNoteModal(): void {
    this.activeModal.set('none');
    this.noteTargetCartId.set(null);
  }

  // ── Cart actions ──────────────────────────────────────────────────────────

  updateQty(cartId: string, qty: number): void { this.cart.updateQuantity(cartId, qty); }
  removeItem(cartId: string): void             { this.cart.removeItem(cartId); }
  setOrderType(t: PosOrderType): void          { this.orderType.set(t); }
  setPaymentType(p: PosPaymentType): void      { this.paymentType.set(p); }
  setOrderNotes(v: string): void               { this.orderNotes.set(v); }

  // ── Place order → shows payment modal ────────────────────────────────────

  placeOrder(): void {
    if (this.cartIsEmpty() || this.submitting() || !this.isShiftOpen) return;

    const tableKey      = this.selectedTableKey();
    const appendOrderId = this.addingToOrderId();

    this.submitting.set(true);
    this.submitError.set(null);

    if (appendOrderId) {
      let linesPayload: AddOrderLinesRequest = {lines: []} ;

      linesPayload.lines = this.cartItems().map(c => ({
        itemId:      c.itemId,
        variantId:   c.variant?.id,
        quantity:    c.quantity,
        notes:       c.note,
        modifierIds: c.modifiers.map(m => m.id),
      }));

      this.posSvc.addLines(appendOrderId, linesPayload).subscribe({
        next: data => {
          this.tableActiveOrder.set(data);
          this.addingToOrderId.set(null);
          this.cart.clearTable(tableKey ?? 'no-table');
          this.orderNotes.set('');
          this.submitting.set(false);
        },
        error: err => {
          this.submitting.set(false);
          this.submitError.set(err?.error?.message ?? 'Erreur lors de l\'ajout.');
        }
      });
      return;
    }

    const payload = {
      orderType:   this.orderType(),
      tableNumber: tableKey === 'no-table' ? null : tableKey,
      customerName: null,
      notes:       this.orderNotes() || null,
      source:      'POS' as const,
      paymentType: this.paymentType(),
      lines: this.cartItems().map(c => ({
        itemId:              c.itemId,
        variantId:           c.variant?.id ?? null,
        quantity:            c.quantity,
        modifierIds:         c.modifiers.map(m => m.id),
        specialInstructions: c.note || null,
      })),
    };

    this.posSvc.placeOrder(payload).subscribe({
      next: order => {
        this.receiptLines.set([...this.cartItems()]);
        this.receiptSubtotal.set(this.cartSubtotal());
        this.receiptTable.set(tableKey === 'no-table' ? null : tableKey);
        this.lastOrderRef.set(order.reference);

        this.pendingOrderId.set(order.id);
        this.pendingOrderRef.set(order.reference);
        this.pendingTotal.set(order.amountDue ?? this.cartSubtotal());

        const method = this.paymentType();
        this.tenderedInput.set(
          method === 'cash' ? '' : (order.amountDue ?? this.cartSubtotal()).toFixed(3)
        );
        this.tipInput.set('0.000');
        this.paymentError.set(null);

        this.cart.clearTable(tableKey ?? 'no-table');
        this.orderNotes.set('');
        this.submitting.set(false);
        this.view.set('payment');
      },
      error: err => {
        this.submitting.set(false);
        this.submitError.set(err?.error?.message ?? 'Failed to place order');
      }
    });
  }

  // ── Record payment (called from payment screen) ───────────────────────────

  recordPayment(): void {
    const orderId = this.pendingOrderId();
    if (!orderId || this.paymentLoading()) return;

    const method  = this.paymentType();
    const total   = this.pendingTotal();
    const tip     = parseFloat(this.tipInput()) || 0;

    if (method === 'cash' && !this.isTenderedSufficient()) {
      this.paymentError.set('Amount tendered must cover the total and tip.');
      return;
    }

    this.paymentLoading.set(true);
    this.paymentError.set(null);

    const methodMap: Record<PosPaymentType, PaymentMethod> = {
      cash:  'CASH',
      card:  'CARD',
      mixed: 'MIXED',
    };

    const req = {
      orderId,
      method:         methodMap[method],
      amountPaid:     total,
      amountTendered: method === 'cash' ? parseFloat(this.tenderedInput()) : undefined,
      tip:            tip > 0 ? tip : undefined,
    };

    this.paymentSvc.recordPayment(req).subscribe({
      next: () => {
        this.cashSvc.loadDrawer().subscribe();
        this.paymentLoading.set(false);
        this.view.set('orderSent');
      },
      error: err => {
        this.paymentLoading.set(false);
        this.paymentError.set(err?.error?.message ?? 'Payment failed. Try again.');
      }
    });
  }

  skipPayment(): void {
    this.view.set('orderSent');
  }

  // ── Post-payment ──────────────────────────────────────────────────────────

  printReceipt(): void { window.print(); }

  newOrder(): void {
    this.view.set('pos');
    this.pendingOrderId.set(null);
    this.pendingOrderRef.set(null);
    this.lastOrderRef.set(null);
    this.receiptLines.set([]);
    this.receiptSubtotal.set(0);
    this.receiptTable.set(null);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  get staffName(): string {
    return this.authService.isOwner() ? 'Owner' : this.authService.getStaffName();
  }

  get isOwner(): boolean { return this.authService.isOwner(); }

  logout(): void {
    if (this.authService.isOwner()) this.router.navigateByUrl('/dashboard');
    else this.authService.staffLogout();
  }

  // ── Cash In / Out ─────────────────────────────────────────────────────────
  cashMovementAmount  = signal('');
  cashMovementReason  = signal('');
  cashMovementError   = signal<string | null>(null);
  cashMovementLoading = signal(false);

  openCashIn(): void {
    this.cashMovementAmount.set('');
    this.cashMovementReason.set('');
    this.cashMovementError.set(null);
    this.activeModal.set('cashIn');
  }

  openCashOut(): void {
    this.cashMovementAmount.set('');
    this.cashMovementReason.set('');
    this.cashMovementError.set(null);
    this.activeModal.set('cashOut');
  }

  confirmCashIn(): void {
    const amount = parseFloat(this.cashMovementAmount());
    const reason = this.cashMovementReason().trim();
    if (!amount || amount <= 0) { this.cashMovementError.set('Montant invalide.'); return; }
    if (!reason) { this.cashMovementError.set('Motif obligatoire.'); return; }
    this.cashMovementLoading.set(true);
    this.cashMovementError.set(null);
    const req: CashMovementRequest = { amount, reason };
    this.cashSvc.cashIn(req).subscribe({
      next: () => { this.cashMovementLoading.set(false); this.activeModal.set('none'); },
      error: err => { this.cashMovementLoading.set(false); this.cashMovementError.set(err?.error?.message ?? 'Erreur.'); }
    });
  }

  confirmCashOut(): void {
    const amount = parseFloat(this.cashMovementAmount());
    const reason = this.cashMovementReason().trim();
    if (!amount || amount <= 0) { this.cashMovementError.set('Montant invalide.'); return; }
    if (!reason) { this.cashMovementError.set('Motif obligatoire.'); return; }
    this.cashMovementLoading.set(true);
    this.cashMovementError.set(null);
    const req: CashMovementRequest = { amount, reason };
    this.cashSvc.cashOut(req).subscribe({
      next: () => { this.cashMovementLoading.set(false); this.activeModal.set('none'); },
      error: err => { this.cashMovementLoading.set(false); this.cashMovementError.set(err?.error?.message ?? 'Erreur.'); }
    });
  }

  // ── Discount ───────────────────────────────────────────────────────────────
  discountMode  = signal<'fixed' | 'percent'>('fixed');
  discountInput = signal('');
  discountAmount = signal(0);

  openDiscount(): void {
    this.discountInput.set('');
    this.activeModal.set('discount');
  }

  applyDiscount(): void {
    const val = parseFloat(this.discountInput());
    if (isNaN(val) || val < 0) return;
    const sub  = this.cartSubtotal();
    const disc = this.discountMode() === 'percent'
      ? +(sub * val / 100).toFixed(3)
      : +val.toFixed(3);
    this.discountAmount.set(Math.min(disc, sub));
    this.activeModal.set('none');
  }

  removeDiscount(): void { this.discountAmount.set(0); }

  // ── Promo code ─────────────────────────────────────────────────────────────
  promoInput = signal('');

  openPromo(): void { this.promoInput.set(''); this.activeModal.set('promo'); }

  applyPromo(): void {
    this.activeModal.set('none');
  }

  // ── Refund ─────────────────────────────────────────────────────────────────
  refundOrders        = signal<PosOrder[]>([]);
  refundLoading       = signal(false);
  selectedRefundOrder = signal<PosOrder | null>(null);
  refundAmount        = signal('');
  refundReason        = signal('');
  refundError         = signal<string | null>(null);
  refundSubmitting    = signal(false);
  refundPayments      = signal<any[]>([]);
  selectedPaymentId   = signal<string | null>(null);

  openRefund(): void {
    this.refundLoading.set(true);
    this.selectedRefundOrder.set(null);
    this.refundError.set(null);
    this.activeModal.set('refund');
    this.orderSvc.loadActiveOrders().subscribe({
      next: res => {
        if (res.success) this.refundOrders.set(res.data);
        this.refundLoading.set(false);
      },
      error: () => this.refundLoading.set(false)
    });
  }

  selectRefundOrder(order: PosOrder): void {
    this.selectedRefundOrder.set(order);
    this.refundAmount.set((order.amountDue ?? order.total).toFixed(3));
    this.refundReason.set('');
    this.refundError.set(null);
    this.paymentSvc.getOrderPayments(order.id).subscribe({
      next: res => {
        if (res.success) {
          this.refundPayments.set(res.data.payments);
          this.selectedPaymentId.set(res.data.payments[0]?.id ?? null);
        }
      },
      error: () => {}
    });
    this.activeModal.set('refundDetail');
  }

  confirmRefund(): void {
    const paymentId = this.selectedPaymentId();
    const amount    = parseFloat(this.refundAmount());
    const reason    = this.refundReason().trim();
    if (!paymentId) { this.refundError.set('Aucun paiement trouvé pour cette commande.'); return; }
    if (!amount || amount <= 0) { this.refundError.set('Montant invalide.'); return; }
    if (!reason) { this.refundError.set('Motif obligatoire.'); return; }
    this.refundSubmitting.set(true);
    this.refundError.set(null);
    const req: IssueRefundRequest = { paymentId, amount, reason };
    this.refundSvc.issueRefund(req).subscribe({
      next: () => {
        this.refundSubmitting.set(false);
        this.activeModal.set('none');
        this.cashSvc.loadDrawer().subscribe();
      },
      error: err => {
        this.refundSubmitting.set(false);
        this.refundError.set(err?.error?.message ?? 'Erreur de remboursement.');
      }
    });
  }

  // ── Z-Report ───────────────────────────────────────────────────────────────
  zReport        = signal<ZReportResponse | null>(null);
  zReportLoading = signal(false);

  openZReport(): void {
    this.zReport.set(null);
    this.zReportLoading.set(true);
    this.activeModal.set('zReport');
    const shiftId = this.currentShift()?.id;
    if (shiftId) {
      this.reportSvc.getZReport(shiftId).subscribe({
        next: res => { this.zReportLoading.set(false); if (res.success) this.zReport.set(res.data); },
        error: () => this.loadXReportFallback()
      });
    } else {
      this.loadXReportFallback();
    }
  }

  private loadXReportFallback(): void {
    this.reportSvc.getXReport().subscribe({
      next: res => {
        this.zReportLoading.set(false);
        if (res.success) this.zReport.set({ shiftId: res.data.shiftId, report: res.data.report });
      },
      error: () => this.zReportLoading.set(false)
    });
  }

  printZReport(): void { window.print(); }

  zrDiffClass(diff: number | null): string {
    if (!diff || diff === 0) return 'exact';
    return diff < 0 ? 'short' : 'over';
  }

  zrDiffLabel(diff: number | null): string {
    if (!diff || diff === 0) return 'Exact';
    return diff < 0 ? `Court` : `Surplus`;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get now(): Date { return new Date(); }

  fmt(n: number): string { return n.toFixed(3); }

  accentFor(catId: string): string {
    return this.categoryAccents().get(catId) ?? '#c9a96e';
  }

  trackById(_: number, item: { id?: string; cartId?: string }): string {
    return item.id ?? item.cartId ?? '';
  }

  cartLineHasNote(cartId: string): boolean {
    return !!(this.cartItems().find(l => l.cartId === cartId)?.note);
  }

  getCartLineNote(cartId: string): string {
    return this.cartItems().find(l => l.cartId === cartId)?.note ?? '';
  }

  // Shift summary helpers for topbar display
  get shiftRevenue(): string {
    return this.fmt(this.currentShift()?.totalRevenue ?? 0);
  }

  get drawerBalance(): string {
    return this.fmt(this.drawerState()?.expectedBalance ?? 0);
  }
}