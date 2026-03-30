import {
  Component, OnInit, OnDestroy, signal, computed,
  inject, HostListener, ViewEncapsulation, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule }        from '@angular/forms';
import { PublicMenuService }  from '../services/public-menu.service';
import { CartService }        from '../services/cart.service';
import { ThemeInjectorService } from '../services/theme-injector.service';
import { SessionService }     from '../services/session.service';
import {
  PublicMenuResponse,
  PublicItemResponse,
  PublicVariantResponse,
  PublicModifierGroupResponse,
  CreateOrderRequest,
  TrackedOrder,
  TrackingStatus,
  TRACKING_STATUS_META,
  TRACKING_STEPS,
} from '../models/public-menu.models';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith }   from 'rxjs/operators';
import { forkJoin } from 'rxjs';

type OrderStep = 'idle' | 'checkout' | 'success';
type OrderType = 'dine_in' | 'takeaway';

@Component({
  selector:     'app-menu-page',
  standalone:   true,
  imports:      [CommonModule, FormsModule],
  templateUrl:  './menu-page.component.html',
  styleUrls:    ['./menu-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class MenuPageComponent implements OnInit, OnDestroy {

  private menuSvc   = inject(PublicMenuService);
  private cart      = inject(CartService);
  private themeSvc  = inject(ThemeInjectorService);
  private session   = inject(SessionService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // ── Menu data ────────────────────────────────────────────────────────────
  menu           = signal<PublicMenuResponse | null>(null);
  loading        = signal(true);
  error          = signal<string | null>(null);
  activeCategory = signal<string>('');

  // ── Cart (proxied from CartService) ──────────────────────────────────────
  cartItems    = this.cart.items;
  cartCount    = this.cart.count;
  cartSubtotal = this.cart.subtotal;
  cartOpen     = this.cart.isOpen;
  cartEmpty    = this.cart.isEmpty;

  // Controls which tab is visible inside the cart modal:
  //   'cart'   → item list + checkout (default)
  //   'orders' → active order tracking cards
  cartMode = signal<'cart' | 'orders'>('cart');

  // ── Item modal ────────────────────────────────────────────────────────────
  modalItem       = signal<PublicItemResponse | null>(null);
  modalCategoryId = signal<string>('');
  selectedVariant = signal<PublicVariantResponse | null>(null);
  selectedMods    = signal<Set<string>>(new Set());
  modalQty        = signal(1);
  specialNote     = signal('');

  modalPrice = computed(() => {
    const item = this.modalItem();
    if (!item) return 0;
    const mods = item.modifierGroups
      .flatMap(g => g.modifiers)
      .filter(m => this.selectedMods().has(m.id));
    return this.cart.calcUnitPrice(item, this.selectedVariant(), mods);
  });

  modalTotal = computed(() => this.modalPrice() * this.modalQty());

  // ── Order flow ────────────────────────────────────────────────────────────
  orderStep  = signal<OrderStep>('idle');
  // orderRef() is now a computed shorthand for display — real state is activeOrders
  submitting = signal(false);
  orderError = signal<string | null>(null);

  customerName  = signal('');
  customerPhone = signal('');
  orderType     = signal<OrderType>('dine_in');
  tableNumber   = signal('');
  orderNotes    = signal('');

  // ── Order tracking — supports multiple simultaneous active orders ────────────
  trackingView    = signal(false);     // true = tracking panel visible
  trackingRef     = signal('');        // reference typed in lookup form
  trackingError   = signal<string | null>(null);
  trackingLoading = signal(false);     // only for manual lookup

  // All currently tracked orders — source of truth for bottom bar + cart modal
  activeOrders    = signal<TrackedOrder[]>([]);

  // The order whose detail is expanded in the tracking panel (null = list view)
  expandedRef     = signal<string | null>(null);

  private trackPoll?: Subscription;

  readonly trackingSteps   = TRACKING_STEPS;
  readonly trackingMetaMap = TRACKING_STATUS_META;

  // ── Computed ──────────────────────────────────────────────────────────────
  categories = computed(() => this.menu()?.categories ?? []);
  currency   = computed(() => this.menu()?.currencySymbol ?? 'DT');
  whatsapp   = computed(() => this.menu()?.whatsappNumber ?? '');

  // The most recently submitted order ref — used on the success screen
  latestOrderRef = computed(() => {
    const orders = this.activeOrders();
    return orders.length > 0 ? orders[orders.length - 1].reference : '';
  });

  // True when at least one non-terminal order is being tracked
  hasActiveOrders = computed(() => this.activeOrders().length > 0);

  canAddToCart = computed(() => {
    const item = this.modalItem();
    if (!item) return false;
    for (const g of item.variantGroups) {
      if (g.required && !this.selectedVariant()) return false;
    }
    for (const g of item.modifierGroups) {
      if (g.required && g.minSelect > 0) {
        const count = g.modifiers
          .filter(m => this.selectedMods().has(m.id)).length;
        if (count < g.minSelect) return false;
      }
    }
    return true;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.themeSvc.listenForPreviewUpdates();
    this.loadMenu();
    const table = this.session.getTableNumber();
    if (table) this.tableNumber.set(table);

    // Auto-open tracking panel if ?track=REF is in the URL
    if (this.isBrowser) {
      const ref = new URLSearchParams(window.location.search).get('track');
      if (ref) {
        this.trackingRef.set(ref);
        this.trackingView.set(true);
        this.addTrackedOrder(ref);
      }
    }
  }

  private loadMenu(): void {
    forkJoin({
      menu:  this.menuSvc.getMenu(),
      theme: this.menuSvc.getTheme(),
    }).subscribe({
      next: ({ menu, theme }) => {
        this.menu.set(menu);
        this.themeSvc.applyTheme(theme);
        this.loading.set(false);
        if (menu.categories.length > 0) {
          this.activeCategory.set(menu.categories[0].id);
        }
        this.menuSvc.trackMenuView(
          this.session.getSessionId(),
          this.session.getQrCode(),
          this.session.getTableNumber()
        );
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Menu not available right now. Please try again.');
      }
    });
  }

  // ── Category ──────────────────────────────────────────────────────────────
  selectCategory(id: string): void {
    this.activeCategory.set(id);
    if (this.isBrowser) {
      setTimeout(() => {
        document.getElementById(`section-${id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }

  // ── Item modal ────────────────────────────────────────────────────────────
  openItem(item: PublicItemResponse, catId: string): void {
    this.modalItem.set(item);
    this.modalCategoryId.set(catId);
    this.modalQty.set(1);
    this.specialNote.set('');

    const allVariants = item.variantGroups.flatMap(g => g.variants);
    const def = allVariants.find(v => v.isDefault) ?? allVariants[0] ?? null;
    this.selectedVariant.set(item.variantGroups.length ? def : null);

    const defaults = new Set<string>();
    item.modifierGroups.forEach(g =>
      g.modifiers.filter(m => m.isDefault).forEach(m => defaults.add(m.id))
    );
    this.selectedMods.set(defaults);

    this.menuSvc.trackItemView(item.id, catId, this.session.getSessionId());
  }

  closeModal(): void { this.modalItem.set(null); }

  selectVariant(v: PublicVariantResponse): void {
    this.selectedVariant.set(v);
  }

  toggleMod(modId: string, group: PublicModifierGroupResponse): void {
    const mods = new Set(this.selectedMods());
    if (group.uiType === 'radio') {
      group.modifiers.forEach(m => mods.delete(m.id));
      mods.add(modId);
    } else {
      const groupSelected = group.modifiers
        .filter(m => mods.has(m.id)).length;
      if (mods.has(modId)) {
        mods.delete(modId);
      } else if (groupSelected < group.maxSelect) {
        mods.add(modId);
      }
    }
    this.selectedMods.set(mods);
  }

  isModSelected(id: string): boolean {
    return this.selectedMods().has(id);
  }

  // Named stepper methods — arrow functions are forbidden in Angular templates
  decModalQty(): void { if (this.modalQty() > 1) this.modalQty.update(q => q - 1); }
  incModalQty(): void { this.modalQty.update(q => q + 1); }

  addToCart(): void {
    const item = this.modalItem();
    if (!item || !this.canAddToCart()) return;

    const mods = item.modifierGroups
      .flatMap(g => g.modifiers)
      .filter(m => this.selectedMods().has(m.id));

    this.cart.addItem(
      item, this.selectedVariant(), mods,
      this.modalQty(), this.specialNote()
    );
    this.closeModal();
    this.cart.open();
  }

  // ── Cart ──────────────────────────────────────────────────────────────────
  openCart(): void {
    // If cart is empty but there are active orders, default to orders tab
    this.cartMode.set(
      this.cart.isEmpty() && this.hasActiveOrders() ? 'orders' : 'cart'
    );
    this.cart.open();
  }

  closeCart(): void { this.cart.close(); }

  toggleCart(): void {
    if (this.cart.isOpen()) {
      this.cart.close();
    } else {
      this.openCart();
    }
  }

  setCartMode(mode: 'cart' | 'orders'): void { this.cartMode.set(mode); }

  updateQty(cartId: string, qty: number): void {
    this.cart.updateQuantity(cartId, qty);
  }

  // ── Checkout flow ─────────────────────────────────────────────────────────
  openCheckout(): void {
    this.cart.close();
    this.orderStep.set('checkout');
    this.orderError.set(null);
  }

  backToCart(): void {
    this.orderStep.set('idle');
    this.cart.open();
  }

  // Named setters — signal.set() calls must not appear in templates
  setOrderTypeDineIn():  void { this.orderType.set('dine_in');  }
  setOrderTypeTakeaway():void { this.orderType.set('takeaway'); }
  setTableNumber(v: string):   void { this.tableNumber.set(v);   }
  setCustomerName(v: string):  void { this.customerName.set(v);  }
  setCustomerPhone(v: string): void { this.customerPhone.set(v); }
  setOrderNotes(v: string):    void { this.orderNotes.set(v);    }
  setSpecialNote(v: string):   void { this.specialNote.set(v);   }

  submitOrder(): void {
    if (this.cart.isEmpty()) return;
    this.submitting.set(true);
    this.orderError.set(null);

    const req: CreateOrderRequest = {
      customerName:    this.customerName() || null,
      customerPhone:   this.customerPhone() || null,
      orderType:       this.orderType(),
      tableNumber:     this.tableNumber() || null,
      customerAddress: null,
      notes:           this.orderNotes() || null,
      lines:           this.cartItems().map(c => ({
        itemId:              c.item.id,
        variantId:           c.variant?.id ?? null,
        quantity:            c.quantity,
        modifierIds:         c.modifiers.map(m => m.id),
        specialInstructions: c.specialNote || null,
      }))
    };

    this.menuSvc.submitOrder(req).subscribe({
      next: order => {
        this.submitting.set(false);
        this.cart.clear();
        // Add to the active orders list and start polling for it
        this.addTrackedOrder(order.reference);
        // Switch to success screen
        this.orderStep.set('success');
      },
      error: () => {
        this.submitting.set(false);
        this.orderError.set('Failed to submit order. Please try again.');
      }
    });
  }

  backToMenu(): void {
    this.orderStep.set('idle');
    // activeOrders and poll are already running from submitOrder()
    // Nothing to do here — bottom bar and cart modal will show automatically
  }

  // ── Order tracking ─────────────────────────────────────────────────────────

  // ── Tracking panel ────────────────────────────────────────────────────────

  openTracking(ref?: string): void {
    this.trackingError.set(null);
    this.trackingView.set(true);
    if (ref) this.expandedRef.set(ref);
  }

  closeTracking(): void {
    // Hide panel only — poll keeps running, activeOrders stays populated
    this.trackingView.set(false);
    this.expandedRef.set(null);
  }

  expandOrder(ref: string): void {
    this.expandedRef.set(this.expandedRef() === ref ? null : ref);
  }

  endTracking(ref: string): void {
    // Remove one completed/cancelled order from the active list
    this.activeOrders.update(list => list.filter(o => o.reference !== ref));

    // If no more active orders, stop the poll and clean up URL
    if (this.activeOrders().length === 0) {
      this.trackPoll?.unsubscribe();
      this.trackingView.set(false);
      if (this.isBrowser) {
        const url = new URL(window.location.href);
        url.searchParams.delete('track');
        window.history.replaceState({}, '', url.toString());
      }
    }

    if (this.expandedRef() === ref) this.expandedRef.set(null);
  }

  setTrackingRef(v: string): void { this.trackingRef.set(v); }

  lookupOrder(): void {
    const ref = this.trackingRef().trim().toUpperCase();
    if (!ref) return;

    // Don't add duplicates
    if (this.activeOrders().some(o => o.reference === ref)) {
      this.expandedRef.set(ref);
      return;
    }

    this.trackingLoading.set(true);
    this.trackingError.set(null);

    this.menuSvc.trackOrder(ref).subscribe({
      next: order => {
        this.trackingLoading.set(false);
        this.trackingError.set(null);
        this.activeOrders.update(list => [...list, order]);
        this.expandedRef.set(ref);
        this.restartPoll();

        if (this.isBrowser) {
          const url = new URL(window.location.href);
          url.searchParams.set('track', ref);
          window.history.replaceState({}, '', url.toString());
        }
      },
      error: () => {
        this.trackingLoading.set(false);
        this.trackingError.set('Order not found. Check the reference number.');
      }
    });
  }

  private addTrackedOrder(reference: string): void {
    // Don't add duplicates
    if (this.activeOrders().some(o => o.reference === reference)) return;

    // Fetch once immediately, then the shared poll will keep it updated
    this.menuSvc.trackOrder(reference).subscribe({
      next: order => {
        this.activeOrders.update(list => [...list, order]);
        this.restartPoll();
      },
      error: () => {} // silent — poll will retry
    });
  }

  private restartPoll(): void {
    // One shared interval that refreshes ALL active orders every 30s.
    // Restarts whenever a new order is added so the timer resets cleanly.
    this.trackPoll?.unsubscribe();

    this.trackPoll = interval(30_000)
      .pipe(
        startWith(0),
        switchMap(() => {
          const refs = this.activeOrders().map(o => o.reference);
          if (refs.length === 0) return [];
          // Fetch all orders in parallel
          return forkJoin(
            refs.reduce((acc, ref) => {
              acc[ref] = this.menuSvc.trackOrder(ref);
              return acc;
            }, {} as Record<string, any>)
          );
        })
      )
      .subscribe({
        next: (results: Record<string, any>) => {
          this.activeOrders.update(list =>
            list.map(o => results[o.reference] ?? o)
          );
        },
        error: () => {} // silent — next tick will retry
      });
  }

  getTrackingMeta(status: TrackingStatus) {
    return this.trackingMetaMap[status];
  }

  isStepDone(stepStatus: TrackingStatus, current: TrackingStatus): boolean {
    const currentStep = this.trackingMetaMap[current].step;
    const thisStep    = this.trackingMetaMap[stepStatus].step;
    return currentStep > thisStep;
  }

  isStepActive(stepStatus: TrackingStatus, current: TrackingStatus): boolean {
    return stepStatus === current;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  fmt(n: number | null): string {
    if (n == null) return '';
    return n.toFixed(3);
  }

  trackById(_: number, item: { id?: string; cartId?: string }): string {
    return item.id ?? item.cartId ?? '';
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this.trackPoll?.unsubscribe();
  }



  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalItem())                { this.closeModal();   return; }
    if (this.trackingView())             { this.closeTracking(); return; }
    if (this.cartOpen())                 { this.cart.close();    return; }
    if (this.orderStep() === 'checkout') { this.backToCart(); }
  }
}