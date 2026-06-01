import {
  Component, OnInit, OnDestroy, signal, computed,
  inject, HostListener, PLATFORM_ID,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicMenuService } from '../../services/public-menu.service';
import { CartService } from '../../services/cart.service';
import { ThemeInjectorService } from '../../services/theme-injector.service';
import { SessionService } from '../../services/session.service';
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
} from '../../models/public-menu.models';
import { interval, Subject, Subscription } from 'rxjs';
import { switchMap, startWith, takeUntil } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { ItemLikeService } from '../../services/item-like.service';
import { ItemLikeToggleResponse } from '../../models/item-like.models';

// ── Child components ────────────────────────────────────────────────
import { MenuHeaderComponent } from '../../components/menu-header/menu-header.component';
import { CategoryTabsComponent } from '../../components/category-tabs/category-tabs.component';
import { MenuGridComponent } from '../../components/menu-grid/menu-grid.component';
import { ItemModalComponent } from '../../components/item-modal/item-modal.component';
import { CartDrawerComponent } from '../../components/cart-drawer/cart-drawer.component';
import { CheckoutModalComponent } from '../../components/checkout-modal/checkout-modal.component';
import { SuccessScreenComponent } from '../../components/success-screen/success-screen.component';
import { TrackingPanelComponent } from '../../components/tracking-panel/tracking-panel.component';
import { BottomBarComponent } from '../../components/bottom-bar/bottom-bar.component';
import { MenuFooterComponent } from '../../components/menu-footer/menu-footer.component';
import { ClosedBannerComponent } from '../../components/closed-banner/closed-banner.component';
import { CartToastComponent } from '../../components/cart-toast/cart-toast.component';
import { WelcomePopupComponent } from "../../components/welcome-popup/welcome-popup.component";
import { LocalStorageService } from '../../../../core/services/local-storage.service';
import { MetaTagsService } from '../../../../shared/services/meta-tags.service';
import { FilterKey, SearchFilterBarComponent } from '../../components/search-filter-bar/search-filter-bar.component';
import { TranslatePipe } from '@ngx-translate/core';

export type OrderStep = 'idle' | 'checkout' | 'success';
export type OrderType = 'DINE_IN' | 'TAKEAWAY';

export interface SocialLink {
  platform: string;
  url: string;
  handle: string | null;
}

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslatePipe,
    MenuHeaderComponent, CategoryTabsComponent, MenuGridComponent,
    ItemModalComponent, CartDrawerComponent, CheckoutModalComponent,
    SuccessScreenComponent, TrackingPanelComponent, BottomBarComponent,
    MenuFooterComponent, ClosedBannerComponent, CartToastComponent,
    WelcomePopupComponent, SearchFilterBarComponent
  ],
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
  private localStorage = inject(LocalStorageService);
  private metaTags = inject(MetaTagsService);
  private doc = inject(DOCUMENT);
  private originalFavicons: { link: HTMLLinkElement; href: string }[] = [];

  // ── Menu data ────────────────────────────────────────────────────────────
  menu = signal<PublicMenuResponse | null>(null);
  loading = signal(true);
  error = signal(false);
  activeCategory = signal<string>('');
  activeSubcategory = signal<string>('');

  // Suppresses observer-driven tab updates while a programmatic scrollIntoView
  // is in flight — prevents the feedback loop: tap tab → scroll → observer
  // fires on intermediate sections → tab flickers back and forth.
  private _suppressScrollObserver = false;

  // ── Search & filter ──────────────────────────────────────────────────────
  searchQuery    = signal<string>('');
  activeFilters  = signal<Set<FilterKey>>(new Set());

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
  orderType = signal<OrderType>('DINE_IN');
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
  private destroy$ = new Subject<void>();

  readonly trackingSteps = TRACKING_STEPS;
  readonly trackingMetaMap = TRACKING_STATUS_META;

  // ── WiFi password copy state ───────────────────────────────────────────────
  wifiCopied = signal(false);

  // ── Cart toast ────────────────────────────────────────────────────────────
  cartToast = signal<{ name: string; visible: boolean } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  // ── Computed ──────────────────────────────────────────────────────────────
  categories = computed(() => this.menu()?.categories ?? []);
  currency = computed(() => this.menu()?.tenant.currencySymbol ?? 'DT');
  whatsapp = computed(() => this.menu()?.tenant.whatsappNumber ?? '');

  activeSubcategories = computed(() =>
    this.categories().find(c => c.id === this.activeCategory())?.subcategories ?? []
  );

  /**
   * Flags that exist on ≥1 item across the whole menu.
   * Drives which chips are rendered in SearchFilterBarComponent.
   */
  availableFilters = computed<Set<FilterKey>>(() => {
    const flags = new Set<FilterKey>();
    for (const cat of this.categories()) {
      for (const item of cat.items) {
        if (item.featured)   flags.add('featured');
        if (item.vegan)      flags.add('vegan');
        if (item.vegetarian) flags.add('vegetarian');
        if (item.glutenFree) flags.add('glutenFree');
        if (item.spicy)      flags.add('spicy');
      }
      for (const sub of cat.subcategories ?? []) {
        for (const item of sub.items) {
          if (item.featured)   flags.add('featured');
          if (item.vegan)      flags.add('vegan');
          if (item.vegetarian) flags.add('vegetarian');
          if (item.glutenFree) flags.add('glutenFree');
          if (item.spicy)      flags.add('spicy');
        }
      }
    }
    return flags;
  });

  /** True when the user has typed something OR toggled at least one chip */
  isFiltering = computed(() =>
    this.searchQuery().trim().length > 0 || this.activeFilters().size > 0
  );

  /**
   * The filtered view of categories fed into <app-menu-grid>.
   * When nothing is active this returns the raw categories signal so zero
   * overhead is added to the normal rendering path.
   */
  filteredCategories = computed(() => {
    if (!this.isFiltering()) return this.categories();
 
    const q       = this.searchQuery().trim().toLowerCase();
    const filters = this.activeFilters();
 
    const matchesFlags = (item: { featured: boolean; vegetarian: boolean; vegan: boolean; glutenFree: boolean; spicy: boolean }) => {
      if (filters.has('featured')   && !item.featured)   return false;
      if (filters.has('vegan')      && !item.vegan)      return false;
      if (filters.has('vegetarian') && !item.vegetarian) return false;
      if (filters.has('glutenFree') && !item.glutenFree) return false;
      if (filters.has('spicy')      && !item.spicy)      return false;
      return true;
    };
 
    const matchesQuery = (item: { name: string; nameAr: string | null; nameFr: string | null; description: string | null; tags: string | null }) => {
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.nameAr  ?? '').toLowerCase().includes(q) ||
        (item.nameFr  ?? '').toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q) ||
        (item.tags ?? '').toLowerCase().includes(q)
      );
    };
 
    const filterItems = <T extends {
      featured: boolean; vegetarian: boolean; vegan: boolean;
      glutenFree: boolean; spicy: boolean;
      name: string; nameAr: string | null; nameFr: string | null;
      description: string | null; tags: string | null;
    }>(items: T[]): T[] =>
      items.filter(i => matchesFlags(i) && matchesQuery(i));
 
    return this.categories()
      .map(cat => ({
        ...cat,
        items: filterItems(cat.items),
        subcategories: (cat.subcategories ?? []).map(sub => ({
          ...sub,
          items: filterItems(sub.items),
        })).filter(sub => sub.items.length > 0),
      }))
      .filter(cat => cat.items.length > 0 || cat.subcategories.length > 0);
  });

  readonly emptySet = new Set<FilterKey>();

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

  locationText = computed(() => {
    const t = this.menu()?.tenant;
    if (!t) return null;
    return [t.address, t.city, t.country].filter(Boolean).join(', ') || null;
  });

  mapsUrl = computed(() => {
    const t = this.menu()?.tenant;
    if (!t) return null;
    if (t.googleMapsUrl) return t.googleMapsUrl;
    const q = this.locationText();
    return q ? `https://maps.google.com/?q=${encodeURIComponent(q)}` : null;
  });

  whatsappUrl = computed(() => {
    const num = this.menu()?.tenant.whatsappNumber;
    if (!num) return null;
    return `https://wa.me/${num.replace(/\D/g, '')}`;
  });

  telUrl = computed(() => {
    const num = this.menu()?.tenant.whatsappNumber;
    return num ? `tel:${num.replace(/\s/g, '')}` : null;
  });

  wifiQrData = computed(() => {
    const t = this.menu()?.tenant;
    if (!t?.wifiName) return null;
    const esc = (s: string) => s.replace(/[\\";,]/g, c => `\\${c}`);
    const pw = t.wifiPassword ? esc(t.wifiPassword) : '';
    return `WIFI:T:WPA;S:${esc(t.wifiName)};P:${pw};;`;
  });

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
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ menu, theme }) => {
        this.localStorage.setJson('tenant', menu.tenant);
        this.menu.set(menu);
        this.themeSvc.applyTheme(theme);
        this.loading.set(false);

        if (menu.categories.length > 0) {
          this.activeCategory.set(menu.categories[0].id);
          const firstSubs = menu.categories[0].subcategories;
          if (firstSubs?.length > 0) {
            this.activeSubcategory.set(firstSubs[0].id);
          }
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
              if (item.likeCount !== undefined) likeCounts.set(item.id, item.likeCount);
            });
            cat.subcategories?.forEach(sub => {
              sub.items.forEach(item => {
                if (item.likeCount !== undefined) likeCounts.set(item.id, item.likeCount);
              });
            });
          });
          this.itemLikeCounts.set(likeCounts);
        }

        this.injectTenantMeta(menu);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }

  private injectTenantMeta(menu: PublicMenuResponse): void {
    const t = menu.tenant;

    const canonicalBase = this.isBrowser
      ? `${window.location.protocol}//${window.location.host}`
      : `https://${t.subdomain}.menuify.tn`;
    const canonicalUrl = `${canonicalBase}/menu`;

    const restaurantSchema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      'name': t.name,
      'description': t.tagline ?? `Menu digital de ${t.name}`,
      'url': canonicalUrl,
      'hasMenu': {
        '@type': 'Menu',
        'url': canonicalUrl,
      },
    };

    if (t.logoUrl) {
      restaurantSchema['image'] = t.logoUrl;
    }

    if (t.address || t.city || t.country) {
      restaurantSchema['address'] = {
        '@type': 'PostalAddress',
        ...(t.address && { 'streetAddress': t.address }),
        ...(t.city && { 'addressLocality': t.city }),
        ...(t.country && { 'addressCountry': t.country }),
      };
    }

    if (t.whatsappNumber) {
      restaurantSchema['telephone'] = t.whatsappNumber;
    }

    if (t.googleMapsUrl) {
      restaurantSchema['hasMap'] = t.googleMapsUrl;
    }

    if (t.instagramUrl) {
      restaurantSchema['sameAs'] = [t.instagramUrl];
      if (t.facebookUrl) (restaurantSchema['sameAs'] as string[]).push(t.facebookUrl);
    }

    this.metaTags.setCustomMetaTags({
      title: `${t.name} - Menu`,
      description: t.tagline
        ? `${t.tagline} — Consultez le menu de ${t.name} et commandez en ligne.`
        : `Consultez le menu de ${t.name} et commandez en ligne.`,
      canonical: canonicalUrl,
      ogType: 'website',
      ogUrl: canonicalUrl,
      ogTitle: `${t.name} - Menu digital`,
      ogDescription: t.tagline ?? `Découvrez le menu de ${t.name}`,
      ...(t.logoUrl && { ogImage: t.logoUrl }),
      robots: 'index,follow',
      structuredData: restaurantSchema,
    });

    if (t.logoUrl) this.setFavicon(t.logoUrl);
  }

  private setFavicon(url: string): void {
    if (!this.isBrowser) return;
    const links = Array.from(this.doc.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'));
    if (this.originalFavicons.length === 0) {
      this.originalFavicons = links.map(l => ({ link: l, href: l.href }));
    }
    links.forEach(l => { l.href = url; });
  }

  //──── Search & Filter ──────────────────────────────────────────────────────

  onSearchQueryChange(q: string): void {
    this.searchQuery.set(q);
  }
 
  onFiltersChange(filters: Set<FilterKey>): void {
    this.activeFilters.set(filters);
  }

  // ── Category / subcategory ────────────────────────────────────────────────

  selectCategory(id: string): void {
    this.activeCategory.set(id);
    const cat = this.categories().find(c => c.id === id);
    const firstSub = cat?.subcategories?.[0];
    this.activeSubcategory.set(firstSub?.id ?? '');

    // Suppress the IntersectionObserver while the programmatic scroll is in
    // flight — otherwise intermediate sections trigger spurious tab updates.
    this._suppressScrollObserver = true;
    setTimeout(() => { this._suppressScrollObserver = false; }, 800);

    if (!firstSub) {
      if (this.isBrowser) {
        setTimeout(() => {
          document.getElementById(`section-${id}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    } else {
      if (this.isBrowser) {
        setTimeout(() => {
          const el = document.getElementById(`section-${id}`);
          if (!el) return;
          const yOffset = -100;
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, 50);
      }
    }
  }

  selectSubcategory(subId: string): void {
    this.activeSubcategory.set(subId);

    // Same suppression — prevent the observer from immediately overwriting
    // the chip selection as the scroll animates past other subsections.
    this._suppressScrollObserver = true;
    setTimeout(() => { this._suppressScrollObserver = false; }, 800);

    if (this.isBrowser) {
      setTimeout(() => {
        const el = document.getElementById(`section-${subId}`);
        if (!el) return;
        const yOffset = -100;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 50);
    }
  }

  // ── Scroll-driven active tab/chip update (from MenuGridComponent) ─────────

  onScrollCategoryChange(catId: string): void {
    if (this._suppressScrollObserver) return;
    this.activeCategory.set(catId);
    // Reset chip to first subcategory of the newly visible category
    const cat = this.categories().find(c => c.id === catId);
    const firstSub = cat?.subcategories?.[0]?.id ?? '';
    this.activeSubcategory.set(firstSub);
  }

  onScrollSubcategoryChange(subId: string): void {
    if (this._suppressScrollObserver) return;
    if (subId) this.activeSubcategory.set(subId);
  }

  // ── Item modal ────────────────────────────────────────────────────────────

  openItem(event: { item: PublicItemResponse; catId: string }): void {
    const { item, catId } = event;
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

  toggleMod(event: { modId: string; group: PublicModifierGroupResponse }): void {
    const { modId, group } = event;
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
    this.showCartToast(item.name);
  }

  private showCartToast(itemName: string): void {
    clearTimeout(this.toastTimer);
    this.cartToast.set({ name: itemName, visible: true });
    this.toastTimer = setTimeout(() => {
      this.cartToast.update(t => t ? { ...t, visible: false } : null);
      setTimeout(() => this.cartToast.set(null), 320);
    }, 2600);
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

  // ── Order flow ────────────────────────────────────────────────────────────

  openCheckout(): void {
    this.cart.close();
    this.orderStep.set('checkout');
    this.orderError.set(null);
  }

  backToCart(): void {
    this.orderStep.set('idle');
    this.cart.open();
  }

  setOrderTypeDineIn(): void { this.orderType.set('DINE_IN'); }
  setOrderTypeTakeaway(): void { this.orderType.set('TAKEAWAY'); }
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

    this.menuSvc.submitOrder(req).pipe(takeUntil(this.destroy$)).subscribe({
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

  // ── Order tracking ────────────────────────────────────────────────────────

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

    this.menuSvc.trackOrder(ref).pipe(takeUntil(this.destroy$)).subscribe({
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

    this.menuSvc.trackOrder(reference).pipe(takeUntil(this.destroy$)).subscribe({
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

          const requests: Record<string, any> = {};
          refs.forEach(ref => {
            requests[ref] = this.menuSvc.trackOrder(ref);
          });

          requests['menu'] = this.menuSvc.getMenu();

          return forkJoin(requests);
        })
      ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: Record<string, any>) => {
          this.activeOrders.update(list =>
            list.map(o => results[o.reference] ?? o)
          );

          if (results['menu']?.categories) {
            const likeCounts = new Map<string, number>();
            results['menu'].categories.forEach((cat: any) => {
              cat.items?.forEach((item: any) => {
                if (item.likeCount !== undefined) likeCounts.set(item.id, item.likeCount);
              });
              cat.subcategories?.forEach((sub: any) => {
                sub.items?.forEach((item: any) => {
                  if (item.likeCount !== undefined) likeCounts.set(item.id, item.likeCount);
                });
              });
            });
            this.itemLikeCounts.set(likeCounts);
          }
        },
        error: () => { }
      });
  }

  // ── Tracking helpers ──────────────────────────────────────────────────────

  getTrackingMeta(status: TrackingStatus) {
    return this.trackingMetaMap[status];
  }

  isStepDone(stepStatus: TrackingStatus, current: TrackingStatus): boolean {
    return this.trackingMetaMap[current].step > this.trackingMetaMap[stepStatus].step;
  }

  isStepActive(stepStatus: TrackingStatus, current: TrackingStatus): boolean {
    return stepStatus === current;
  }

  // ── Like system ───────────────────────────────────────────────────────────

  toggleItemLike(event: { domEvent: Event; itemId: string }): void {
    const { domEvent, itemId } = event;
    domEvent.stopPropagation();

    if (this.likeInFlight().has(itemId)) return;

    const isCurrentlyLiked = this.likedItems().has(itemId);
    const currentCount = this.itemLikeCounts().get(itemId) ?? 0;

    const newLiked = new Set(this.likedItems());
    if (isCurrentlyLiked) {
      newLiked.delete(itemId);
      this.itemLikeCounts().set(itemId, Math.max(0, currentCount - 1));
    } else {
      newLiked.add(itemId);
      this.itemLikeCounts().set(itemId, currentCount + 1);
    }
    this.likedItems.set(newLiked);

    const inFlight = new Set(this.likeInFlight());
    inFlight.add(itemId);
    this.likeInFlight.set(inFlight);

    this.itemLikeSvc.toggleLike(itemId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: ItemLikeToggleResponse) => {
        this.itemLikeCounts().set(itemId, response.newLikeCount);
        const likedSet = new Set(this.likedItems());
        if (response.isNowLiked) {
          likedSet.add(itemId);
        } else {
          likedSet.delete(itemId);
        }
        this.likedItems.set(likedSet);
        const cleared = new Set(this.likeInFlight());
        cleared.delete(itemId);
        this.likeInFlight.set(cleared);
      },
      error: () => {
        const reverted = new Set(this.likedItems());
        if (isCurrentlyLiked) {
          reverted.add(itemId);
          this.itemLikeCounts().set(itemId, currentCount);
        } else {
          reverted.delete(itemId);
          this.itemLikeCounts().set(itemId, currentCount);
        }
        this.likedItems.set(reverted);
        const cleared = new Set(this.likeInFlight());
        cleared.delete(itemId);
        this.likeInFlight.set(cleared);
      }
    });
  }

  isItemLiked(itemId: string): boolean {
    return this.likedItems().has(itemId);
  }

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

  // ── Misc ──────────────────────────────────────────────────────────────────

  copyWifiPassword(): void {
    const pw = this.menu()?.tenant.wifiPassword;
    if (!pw || !this.isBrowser) return;
    navigator.clipboard.writeText(pw).then(() => {
      this.wifiCopied.set(true);
      setTimeout(() => this.wifiCopied.set(false), 2000);
    });
  }

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

  // ── Cleanup ───────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.trackPoll?.unsubscribe();
    clearInterval(this.hoursCheckInterval);
    clearTimeout(this.toastTimer);
    this.destroy$.next();
    this.destroy$.complete();
    this.originalFavicons.forEach(({ link, href }) => { link.href = href; });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalItem()) { this.closeModal(); return; }
    if (this.trackingView()) { this.closeTracking(); return; }
    if (this.cartOpen()) { this.cart.close(); return; }
    if (this.orderStep() === 'checkout') { this.backToCart(); }
  }
}