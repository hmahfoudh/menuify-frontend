import {
  Component, OnInit, OnDestroy, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  OrderResponse, OrderStatus,
  STATUS_META, STATUS_FILTERS
} from '../../models/order.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OrderService } from '../../services/order.service';

@Component({
  selector:    'app-orders',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './orders.component.html',
  styleUrls:   ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {

  private svc        = inject(OrderService);
  private platformId = inject(PLATFORM_ID);
  private destroy$   = new Subject<void>();

  // ── State ─────────────────────────────────────────────────────────────────
  orders        = signal<OrderResponse[]>([]);
  loading       = signal(true);
  totalElements = signal(0);
  currentPage   = signal(0);
  pageSize      = 20;

  selectedStatus    = signal<OrderStatus | null>(null);
  selectedOrder     = signal<OrderResponse | null>(null);
  updatingId        = signal<string | null>(null);
  error             = signal<string | null>(null);
  lastRefreshed     = signal<Date>(new Date());
  etaMinutes        = signal<number | null>(null);
  restaurantMessage = signal('');

  // ── Constants ──────────────────────────────────────────────────────────────
  readonly statusFilters = STATUS_FILTERS;
  readonly statusMeta    = STATUS_META;

  // ── Computed ───────────────────────────────────────────────────────────────
  pendingCount   = computed(() => this.orders().filter(o => o.status === 'PENDING').length);
  confirmedCount = computed(() => this.orders().filter(o => o.status === 'CONFIRMED').length);
  preparingCount = computed(() => this.orders().filter(o => o.status === 'PREPARING').length);
  readyCount     = computed(() => this.orders().filter(o => o.status === 'READY').length);

  totalPages = computed(() =>
    Math.ceil(this.totalElements() / this.pageSize));

  orderTypeLabel = computed(() => {
    const o = this.selectedOrder();
    if (!o) return '';
    return o.orderType === 'DINE_IN'  ? `Table ${o.tableNumber ?? '–'}`
         : o.orderType === 'TAKEAWAY' ? 'Takeaway'
         : 'Delivery';
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadOrders();

    if (isPlatformBrowser(this.platformId)) {
      this.svc.connectStream();

      this.svc.newOrderEvents$
        .pipe(takeUntil(this.destroy$))
        .subscribe(event => {
          if (event.type === 'NEW_ORDER') {
            this.loadOrders();
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.svc.closeStream();
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  loadOrders(): void {
    this.loading.set(true);
    this.svc.getAll(null, this.currentPage(), this.pageSize).subscribe({
      next: page => {
        this.orders.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
        this.lastRefreshed.set(new Date());

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

  // ── Manual refresh ─────────────────────────────────────────────────────────
  refresh(): void {
    this.loadOrders();
  }

  // ── Order detail ───────────────────────────────────────────────────────────
  openOrder(order: OrderResponse)  { this.selectedOrder.set(order); }
  closeDetail()                    { this.selectedOrder.set(null);  }

  // ── Status update ──────────────────────────────────────────────────────────
  advanceStatus(order: OrderResponse): void {
    const meta = STATUS_META[order.status];
    if (!meta.next) return;

    this.updatingId.set(order.id);
    this.svc.updateStatus(
      order.id, meta.next,
      this.etaMinutes(),
      this.restaurantMessage() || null
    ).subscribe({
      next: updated => {
        this.orders.update(list =>
          list.map(o => o.id === updated.id ? updated : o));
        if (this.selectedOrder()?.id === updated.id) {
          this.selectedOrder.set(updated);
        }
        this.updatingId.set(null);
      },
      error: () => {
        this.error.set('Failed to update status');
        this.updatingId.set(null);
      }
    });
  }

  cancelOrder(order: OrderResponse): void {
    if (!confirm(`Cancel order ${order.reference}?`)) return;
    this.updatingId.set(order.id);
    this.svc.updateStatus(order.id, 'CANCELLED', null, null).subscribe({
      next: updated => {
        this.orders.update(list =>
          list.map(o => o.id === updated.id ? updated : o));
        if (this.selectedOrder()?.id === updated.id) {
          this.selectedOrder.set(updated);
        }
        this.updatingId.set(null);
      },
      error: () => {
        this.error.set('Failed to cancel order');
        this.updatingId.set(null);
      }
    });
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.loadOrders();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getStatusMeta(status: OrderStatus) { return STATUS_META[status]; }

  setEtaMinutes(v: string): void       { this.etaMinutes.set(v ? +v : null); }
  setRestaurantMessage(v: string): void { this.restaurantMessage.set(v); }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('fr-TN', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' });
  }

  openWhatsApp(order: OrderResponse): void {
    if (!order.customerPhone) return;
    const phone = order.customerPhone.replace(/\s+/g, '');
    window.open(`https://wa.me/${phone}`, '_blank', 'noopener');
  }
}