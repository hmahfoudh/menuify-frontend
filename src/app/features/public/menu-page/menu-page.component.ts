import {
  Component, OnInit, OnDestroy, signal, computed,
  inject, HostListener, ViewEncapsulation, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QRCodeModule } from 'angularx-qrcode';
import { PublicMenuService } from '../services/public-menu.service';
import { CartService } from '../services/cart.service';
import { ThemeInjectorService } from '../services/theme-injector.service';
import { SessionService } from '../services/session.service';
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
import { switchMap, startWith } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { ItemLikeService } from '../services/item-like.service';
import { ItemLikeToggleResponse } from '../models/item-like.models';
import { FormatLikeCountPipe } from '../../../shared/pipes/format-like-count.pipe';


type OrderStep = 'idle' | 'checkout' | 'success';
type OrderType = 'dine_in' | 'takeaway';

export interface SocialLink {
  platform: string;
  url: string;
  handle: string | null;
}

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeModule, FormatLikeCountPipe],
  templateUrl: './menu-page.component.html',
  styleUrls: ['./menu-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class MenuPageComponent implements OnInit, OnDestroy {

  private menuSvc = inject(PublicMenuService);
  private cart = inject(CartService);
  private themeSvc = inject(ThemeInjectorService);
  private session = inject(SessionService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private itemLikeSvc = inject(ItemLikeService);

  // ── Menu data ────────────────────────────────────────────────────────────
  menu = signal<PublicMenuResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  activeCategory = signal<string>('');

  // ── Cart (proxied from CartService) ──────────────────────────────────────
  cartItems = this.cart.items;
  cartCount = this.cart.count;
  cartSubtotal = this.cart.subtotal;
  cartOpen = this.cart.isOpen;
  cartEmpty = this.cart.isEmpty;

  cartMode = signal<'cart' | 'orders'>('cart');

  // ── ItemLikes ──────────────────────────────────────────────────────────────

  likedItems = signal<Set<string>>(new Set());
  itemLikeCounts = signal<Map<string, number>>(new Map());
  private likeInFlight = signal<Set<string>>(new Set());

  // ── Item modal ────────────────────────────────────────────────────────────
  modalItem = signal<PublicItemResponse | null>(null);
  modalCategoryId = signal<string>('');
  selectedVariant = signal<PublicVariantResponse | null>(null);
  selectedMods = signal<Set<string>>(new Set());
  modalQty = signal(1);
  specialNote = signal('');

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
  orderStep = signal<OrderStep>('idle');

  // ── Opening hours ──────────────────────────────────────────────────────────
  isOpen = signal(true);
  nextOpenTime = signal<string | null>(null);
  private hoursCheckInterval?: ReturnType<typeof setInterval>;

  submitting = signal(false);
  orderError = signal<string | null>(null);

  customerName = signal('');
  customerPhone = signal('');
  orderType = signal<OrderType>('dine_in');
  tableNumber = signal('');
  orderNotes = signal('');

  // ── Order tracking ────────────────────────────────────────────────────────
  trackingView = signal(false);
  trackingRef = signal('');
  trackingError = signal<string | null>(null);
  trackingLoading = signal(false);
  activeOrders = signal<TrackedOrder[]>([]);
  expandedRef = signal<string | null>(null);

  private trackPoll?: Subscription;

  readonly trackingSteps = TRACKING_STEPS;
  readonly trackingMetaMap = TRACKING_STATUS_META;

  // ── WiFi password copy state ───────────────────────────────────────────────
  wifiCopied = signal(false);

  // ── Computed ──────────────────────────────────────────────────────────────
  categories = computed(() => this.menu()?.categories ?? []);
  currency = computed(() => this.menu()?.tenant.currencySymbol ?? 'DT');
  whatsapp = computed(() => this.menu()?.tenant.whatsappNumber ?? '');

  latestOrderRef = computed(() => {
    const orders = this.activeOrders();
    return orders.length > 0 ? orders[orders.length - 1].reference : '';
  });

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

  // ── Footer computeds ──────────────────────────────────────────────────────

  /** Ordered list of active social links built from tenant fields. */
  socialLinks = computed<SocialLink[]>(() => {
    const t = this.menu()?.tenant;
    if (!t) return [];
    const links: SocialLink[] = [];
    if (t.instagramUrl) links.push({ platform: 'instagram', url: t.instagramUrl, handle: this.extractHandle(t.instagramUrl) });
    if (t.facebookUrl) links.push({ platform: 'facebook', url: t.facebookUrl, handle: this.extractHandle(t.facebookUrl) });
    if (t.tiktokUrl) links.push({ platform: 'tiktok', url: t.tiktokUrl, handle: this.extractHandle(t.tiktokUrl) });
    if (t.twitterUrl) links.push({ platform: 'twitter', url: t.twitterUrl, handle: this.extractHandle(t.twitterUrl) });
    if (t.youtubeUrl) links.push({ platform: 'youtube', url: t.youtubeUrl, handle: this.extractHandle(t.youtubeUrl) });
    if (t.linkedInUrl) links.push({ platform: 'linkedin', url: t.linkedInUrl, handle: this.extractHandle(t.linkedInUrl) });
    return links;
  });

  /** Full location string for display. */
  locationText = computed(() => {
    const t = this.menu()?.tenant;
    if (!t) return null;
    return [t.address, t.city, t.country].filter(Boolean).join(', ') || null;
  });

  /** Maps URL — prefer the stored one, fall back to a Google search link. */
  mapsUrl = computed(() => {
    const t = this.menu()?.tenant;
    if (!t) return null;
    if (t.googleMapsUrl) return t.googleMapsUrl;
    const q = this.locationText();
    return q ? `https://maps.google.com/?q=${encodeURIComponent(q)}` : null;
  });

  /** WhatsApp deep-link (wa.me expects digits only). */
  whatsappUrl = computed(() => {
    const num = this.menu()?.tenant.whatsappNumber;
    if (!num) return null;
    return `https://wa.me/${num.replace(/\D/g, '')}`;
  });

  /** tel: link for the phone dialer. */
  telUrl = computed(() => {
    const num = this.menu()?.tenant.whatsappNumber;
    return num ? `tel:${num.replace(/\s/g, '')}` : null;
  });

  /** WiFi QR payload — standard WIFI: URI scheme. */
  wifiQrData = computed(() => {
    const t = this.menu()?.tenant;
    if (!t?.wifiName) return null;
    // Escape special chars: \ " ; , per the WIFI QR spec
    const esc = (s: string) => s.replace(/[\\";,]/g, c => `\\${c}`);
    const pw = t.wifiPassword ? esc(t.wifiPassword) : '';
    return `WIFI:T:WPA;S:${esc(t.wifiName)};P:${pw};;`;
  });

  /** True when at least one footer section has data to show. */
  hasFooterContent = computed(() => {
    const t = this.menu()?.tenant;
    if (!t) return false;
    return !!(
      t.instagramUrl || t.facebookUrl || t.tiktokUrl ||
      t.twitterUrl || t.youtubeUrl || t.linkedInUrl ||
      t.wifiName || t.whatsappNumber ||
      t.address || t.city || t.country || t.googleMapsUrl
    );
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.themeSvc.listenForPreviewUpdates();
    this.loadMenu();
    const table = this.session.getTableNumber();
    if (table) this.tableNumber.set(table);

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
      menu: this.menuSvc.getMenu(),
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
        this.checkOpeningHours(menu.tenant.openingHours);
        this.hoursCheckInterval = setInterval(
          () => this.checkOpeningHours(menu.tenant.openingHours), 60_000
        );
        if (menu?.categories) {
          const likeCounts = new Map<string, number>();
          menu.categories.forEach(cat => {
            cat.items.forEach(item => {
              if (item.likeCount !== undefined) {
                likeCounts.set(item.id, item.likeCount);
              }
            });
          });
          this.itemLikeCounts.set(likeCounts);
        }
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

  setOrderTypeDineIn(): void { this.orderType.set('dine_in'); }
  setOrderTypeTakeaway(): void { this.orderType.set('takeaway'); }
  setTableNumber(v: string): void { this.tableNumber.set(v); }
  setCustomerName(v: string): void { this.customerName.set(v); }
  setCustomerPhone(v: string): void { this.customerPhone.set(v); }
  setOrderNotes(v: string): void { this.orderNotes.set(v); }
  setSpecialNote(v: string): void { this.specialNote.set(v); }

  submitOrder(): void {
    if (this.cart.isEmpty()) return;
    this.submitting.set(true);
    this.orderError.set(null);

    const req: CreateOrderRequest = {
      customerName: this.customerName() || null,
      customerPhone: this.customerPhone() || null,
      orderType: this.orderType(),
      tableNumber: this.tableNumber() || null,
      customerAddress: null,
      notes: this.orderNotes() || null,
      lines: this.cartItems().map(c => ({
        itemId: c.item.id,
        variantId: c.variant?.id ?? null,
        quantity: c.quantity,
        modifierIds: c.modifiers.map(m => m.id),
        specialInstructions: c.specialNote || null,
      }))
    };

    this.menuSvc.submitOrder(req).subscribe({
      next: order => {
        this.submitting.set(false);
        this.cart.clear();
        this.addTrackedOrder(order.reference);
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
  }

  // ── Order tracking ─────────────────────────────────────────────────────────
  openTracking(ref?: string): void {
    this.trackingError.set(null);
    this.trackingView.set(true);
    if (ref) this.expandedRef.set(ref);
  }

  closeTracking(): void {
    this.trackingView.set(false);
    this.expandedRef.set(null);
  }

  expandOrder(ref: string): void {
    this.expandedRef.set(this.expandedRef() === ref ? null : ref);
  }

  endTracking(ref: string): void {
    this.activeOrders.update(list => list.filter(o => o.reference !== ref));

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
    if (this.activeOrders().some(o => o.reference === reference)) return;

    this.menuSvc.trackOrder(reference).subscribe({
      next: order => {
        this.activeOrders.update(list => [...list, order]);
        this.restartPoll();
      },
      error: () => { }
    });
  }

  private restartPoll(): void {
  this.trackPoll?.unsubscribe();
 
  this.trackPoll = interval(30_000)
    .pipe(
      startWith(0),
      switchMap(() => {
        const refs = this.activeOrders().map(o => o.reference);
        if (refs.length === 0) return [];
 
        // Build the forkJoin with order tracking
        const requests: Record<string, any> = {};
        refs.forEach(ref => {
          requests[ref] = this.menuSvc.trackOrder(ref);
        });
 
        // Optionally fetch fresh menu to get updated like counts
        // This is simple but adds latency. Alternative: track likes per item
        // separately. For MVP, just refetch menu every poll cycle.
        requests['menu'] = this.menuSvc.getMenu();
 
        return forkJoin(requests);
      })
    )
    .subscribe({
      next: (results: Record<string, any>) => {
        // Update orders
        this.activeOrders.update(list =>
          list.map(o => results[o.reference] ?? o)
        );
 
        // Update like counts from fresh menu
        if (results['menu']?.categories) {
          const likeCounts = new Map<string, number>();
          results['menu'].categories.forEach((cat: any) => {
            cat.items.forEach((item: any) => {
              if (item.likeCount !== undefined) {
                likeCounts.set(item.id, item.likeCount);
              }
            });
          });
          this.itemLikeCounts.set(likeCounts);
        }
      },
      error: () => {}
    });
}


  getTrackingMeta(status: TrackingStatus) {
    return this.trackingMetaMap[status];
  }

  isStepDone(stepStatus: TrackingStatus, current: TrackingStatus): boolean {
    const currentStep = this.trackingMetaMap[current].step;
    const thisStep = this.trackingMetaMap[stepStatus].step;
    return currentStep > thisStep;
  }

  isStepActive(stepStatus: TrackingStatus, current: TrackingStatus): boolean {
    return stepStatus === current;
  }

  // ── ItemLikes ──────────────────────────────────────────────────────────────

  /**
 * Toggle like on an item (local optimistic update + API call).
 * Stops propagation to prevent opening the item modal.
 */
  toggleItemLike(event: Event, itemId: string): void {
    event.stopPropagation();

    // Prevent rapid double-clicks
    if (this.likeInFlight().has(itemId)) return;

    const isCurrentlyLiked = this.likedItems().has(itemId);
    const currentCount = this.itemLikeCounts().get(itemId) ?? 0;

    // Optimistic update
    const newLiked = new Set(this.likedItems());
    if (isCurrentlyLiked) {
      newLiked.delete(itemId);
      this.itemLikeCounts().set(itemId, Math.max(0, currentCount - 1));
    } else {
      newLiked.add(itemId);
      this.itemLikeCounts().set(itemId, currentCount + 1);
    }
    this.likedItems.set(newLiked);

    // Mark as in-flight
    const inFlight = new Set(this.likeInFlight());
    inFlight.add(itemId);
    this.likeInFlight.set(inFlight);

    // API call
    this.itemLikeSvc.toggleLike(itemId).subscribe({
      next: (response: ItemLikeToggleResponse) => {
        // Update with authoritative state from server
        this.itemLikeCounts().set(itemId, response.newLikeCount);

        const likedSet = new Set(this.likedItems());
        if (response.isNowLiked) {
          likedSet.add(itemId);
        } else {
          likedSet.delete(itemId);
        }
        this.likedItems.set(likedSet);

        // Mark not in-flight
        const cleared = new Set(this.likeInFlight());
        cleared.delete(itemId);
        this.likeInFlight.set(cleared);
      },
      error: () => {
        // Revert optimistic update on error
        const reverted = new Set(this.likedItems());
        if (isCurrentlyLiked) {
          reverted.add(itemId);
          this.itemLikeCounts().set(itemId, currentCount);
        } else {
          reverted.delete(itemId);
          this.itemLikeCounts().set(itemId, currentCount);
        }
        this.likedItems.set(reverted);

        // Mark not in-flight
        const cleared = new Set(this.likeInFlight());
        cleared.delete(itemId);
        this.likeInFlight.set(cleared);
      }
    });
  }

  /**
   * Check if a customer has liked an item.
   */
  isItemLiked(itemId: string): boolean {
    return this.likedItems().has(itemId);
  }

  /**
   * Get the like count for an item.
   */
  public getItemLikeCount(itemId: string): number {
    return this.itemLikeCounts().get(itemId) ?? 0;
  }

  // ── Opening hours ─────────────────────────────────────────────────────────
  private checkOpeningHours(openingHoursJson: string | null): void {
    if (!openingHoursJson) {
      this.isOpen.set(true);
      this.nextOpenTime.set(null);
      return;
    }

    try {
      const hours: Record<string, { open: boolean; from: string; to: string }>
        = JSON.parse(openingHoursJson);

      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayKey = days[now.getDay()];
      const todaySlot = hours[todayKey];

      if (!todaySlot?.open) {
        this.isOpen.set(false);
        this.nextOpenTime.set(this.findNextOpenTime(hours, days, now));
        return;
      }

      const [fh, fm] = todaySlot.from.split(':').map(Number);
      const [th, tm] = todaySlot.to.split(':').map(Number);
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const fromMins = fh * 60 + fm;
      const toMins = th * 60 + tm;

      if (nowMins >= fromMins && nowMins < toMins) {
        this.isOpen.set(true);
        this.nextOpenTime.set(null);
      } else if (nowMins < fromMins) {
        this.isOpen.set(false);
        this.nextOpenTime.set(`Opens today at ${todaySlot.from}`);
      } else {
        this.isOpen.set(false);
        this.nextOpenTime.set(this.findNextOpenTime(hours, days, now));
      }
    } catch {
      this.isOpen.set(true);
      this.nextOpenTime.set(null);
    }
  }

  private findNextOpenTime(
    hours: Record<string, { open: boolean; from: string; to: string }>,
    days: string[],
    now: Date
  ): string | null {
    for (let i = 1; i <= 7; i++) {
      const dayIdx = (now.getDay() + i) % 7;
      const dayKey = days[dayIdx];
      const slot = hours[dayKey];
      if (slot?.open) {
        const dayLabel = i === 1 ? 'tomorrow'
          : days[dayIdx].charAt(0).toUpperCase() + days[dayIdx].slice(1);
        return `Opens ${dayLabel} at ${slot.from}`;
      }
    }
    return 'Currently closed';
  }

  // ── Footer helpers ────────────────────────────────────────────────────────

  /** Copy WiFi password to clipboard with a brief visual confirmation. */
  copyWifiPassword(): void {
    const pw = this.menu()?.tenant.wifiPassword;
    if (!pw || !this.isBrowser) return;
    navigator.clipboard.writeText(pw).then(() => {
      this.wifiCopied.set(true);
      setTimeout(() => this.wifiCopied.set(false), 2000);
    });
  }

  /** Extract a @handle or channel name from a social URL for display. */
  private extractHandle(url: string): string | null {
    try {
      const path = new URL(url).pathname.replace(/\/$/, '');
      const parts = path.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      return last ? `@${last}` : null;
    } catch {
      return null;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  fmt(n: number | null): string {
    if (n == null) return '';
    return n.toFixed(3);
  }

  trackById(_: number, item: { id?: string; cartId?: string }): string {
    return item.id ?? item.cartId ?? '';
  }

  trackByPlatform(_: number, link: SocialLink): string {
    return link.platform;
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this.trackPoll?.unsubscribe();
    clearInterval(this.hoursCheckInterval);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalItem()) { this.closeModal(); return; }
    if (this.trackingView()) { this.closeTracking(); return; }
    if (this.cartOpen()) { this.cart.close(); return; }
    if (this.orderStep() === 'checkout') { this.backToCart(); }
  }
}