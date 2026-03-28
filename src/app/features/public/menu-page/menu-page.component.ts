import {
  Component, OnInit, signal, computed,
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
} from '../models/public-menu.models';
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
export class MenuPageComponent implements OnInit {

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
  orderRef   = signal('');
  submitting = signal(false);
  orderError = signal<string | null>(null);

  customerName  = signal('');
  customerPhone = signal('');
  orderType     = signal<OrderType>('dine_in');
  tableNumber   = signal('');
  orderNotes    = signal('');

  // ── Computed ──────────────────────────────────────────────────────────────
  categories = computed(() => this.menu()?.categories ?? []);
  currency   = computed(() => this.menu()?.currencySymbol ?? 'DT');
  whatsapp   = computed(() => this.menu()?.whatsappNumber ?? '');

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
  openCart():   void { this.cart.open();   }
  closeCart():  void { this.cart.close();  }
  toggleCart(): void { this.cart.toggle(); }

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
        this.orderRef.set(order.reference);
        this.submitting.set(false);
        this.orderStep.set('success');
        this.cart.clear();
        this.session.openWhatsApp(this.whatsapp(), order.whatsappMessage);
      },
      error: () => {
        this.submitting.set(false);
        this.orderError.set('Failed to submit order. Please try again.');
      }
    });
  }

  backToMenu(): void {
    this.orderStep.set('idle');
    this.orderRef.set('');
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
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalItem())                { this.closeModal(); return; }
    if (this.cartOpen())                 { this.cart.close(); return; }
    if (this.orderStep() === 'checkout') { this.backToCart(); }
  }
}