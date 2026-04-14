import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  OrderResponse, OrderStatus,
  STATUS_META, STATUS_FILTERS
} from '../../models/order.models';
import { OrderService } from '../../services/order.service';

@Component({
  selector:    'app-order-history',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './order-history.component.html',
  styleUrls:   ['./order-history.component.scss']
})
export class OrderHistoryComponent implements OnInit {

  private svc = inject(OrderService);

  // ── State ───────────────────────────────────────────────────────────────────
  orders        = signal<OrderResponse[]>([]);
  loading       = signal(true);
  totalElements = signal(0);
  currentPage   = signal(0);
  pageSize      = 20;

  selectedStatus = signal<OrderStatus | null>(null);
  selectedOrder  = signal<OrderResponse | null>(null);
  searchQuery    = signal('');
  error          = signal<string | null>(null);

  // ── Constants ────────────────────────────────────────────────────────────────
  readonly allFilters: { label: string; value: OrderStatus | null }[] = [
    ...STATUS_FILTERS
  ];

  readonly statusMeta = STATUS_META;

  // ── Computed ─────────────────────────────────────────────────────────────────
  totalPages = computed(() =>
    Math.ceil(this.totalElements() / this.pageSize) || 1);

  /** Client-side search filter on top of the server-side status filter */
  filteredOrders = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.orders();
    return this.orders().filter(o =>
      o.reference.toLowerCase().includes(q) ||
      (o.customerName ?? '').toLowerCase().includes(q) ||
      (o.customerPhone ?? '').includes(q)
    );
  });

  /** Page range text: "1 – 20 of 156" */
  pageRange = computed(() => {
    const start = this.currentPage() * this.pageSize + 1;
    const end   = Math.min(start + this.pageSize - 1, this.totalElements());
    return `${start} – ${end} of ${this.totalElements()}`;
  });

  /** Status counts for the filter badges (from current page data — indicative) */
  statusCounts = computed(() => {
    const map: Record<string, number> = {};
    this.orders().forEach(o => {
      map[o.status] = (map[o.status] ?? 0) + 1;
    });
    return map;
  });

  orderTypeLabel = computed(() => {
    const o = this.selectedOrder();
    if (!o) return '';
    return o.orderType === 'DINE_IN'  ? `Table ${o.tableNumber ?? '–'}`
         : o.orderType === 'TAKEAWAY' ? 'Takeaway'
         : 'Delivery';
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit() { this.loadOrders(); }

  // ── Data loading ─────────────────────────────────────────────────────────────
  loadOrders() {
    this.loading.set(true);
    this.error.set(null);

    this.svc.getAll(
      this.selectedStatus(),
      this.currentPage(),
      this.pageSize
    ).subscribe({
      next: page => {
        this.orders.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);

        // Keep detail panel in sync
        const sel = this.selectedOrder();
        if (sel) {
          const updated = page.content.find(o => o.id === sel.id);
          if (updated) this.selectedOrder.set(updated);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load orders');
      }
    });
  }

  // ── Filter ──────────────────────────────────────────────────────────────────
  setFilter(status: OrderStatus | null) {
    if (this.selectedStatus() === status) return;
    this.selectedStatus.set(status);
    this.currentPage.set(0);
    this.loadOrders();
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  onSearch(value: string) {
    this.searchQuery.set(value);
  }

  // ── Manual refresh ───────────────────────────────────────────────────────────
  refresh() { this.loadOrders(); }

  // ── Order detail ─────────────────────────────────────────────────────────────
  openOrder(order: OrderResponse) { this.selectedOrder.set(order); }
  closeDetail() { this.selectedOrder.set(null); }

  // ── Pagination ───────────────────────────────────────────────────────────────
  goToPage(page: number) {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.loadOrders();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  getStatusMeta(status: OrderStatus) { return STATUS_META[status]; }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('fr-TN', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatDate(iso: string): string {
    const d     = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' });
  }

  openWhatsApp(order: OrderResponse) {
    if (!order.customerPhone) return;
    const phone = order.customerPhone.replace(/\s+/g, '');
    window.open(`https://wa.me/${phone}`, '_blank', 'noopener');
  }

  /** Visible page buttons (max 5 around current) */
  get visiblePages(): number[] {
    const total   = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    let start = Math.max(0, current - 2);
    let end   = Math.min(total - 1, current + 2);

    // Shift window if near edges
    if (end - start < 4) {
      if (start === 0) end = Math.min(total - 1, 4);
      else start = Math.max(0, end - 4);
    }

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
}