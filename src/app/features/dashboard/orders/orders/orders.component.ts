import {
  Component, OnInit, OnDestroy, signal, computed, inject
} from '@angular/core';
import { CommonModule }  from '@angular/common';
import { OrderService }  from '../services/order.service';
import {
  OrderResponse, OrderStatus,
  STATUS_META, STATUS_FILTERS
} from '../models/order.models';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith }   from 'rxjs/operators';

@Component({
  selector:    'app-orders',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './orders.component.html',
  styleUrls:   ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {

  private svc  = inject(OrderService);
  private poll?: Subscription;

  // ── State ───────────────────────────────────────────────────────────────────
  orders        = signal<OrderResponse[]>([]);
  loading       = signal(true);
  totalElements = signal(0);
  currentPage   = signal(0);
  pageSize      = 20;

  selectedStatus = signal<OrderStatus | null>(null);
  selectedOrder  = signal<OrderResponse | null>(null);
  updatingId     = signal<string | null>(null);
  error          = signal<string | null>(null);
  lastRefreshed  = signal<Date>(new Date());

  // ── Constants ────────────────────────────────────────────────────────────────
  readonly statusFilters = STATUS_FILTERS;
  readonly statusMeta    = STATUS_META;

  // ── Computed ─────────────────────────────────────────────────────────────────
  pendingCount = computed(() =>
    this.orders().filter(o => o.status === 'PENDING').length);

  totalPages = computed(() =>
    Math.ceil(this.totalElements() / this.pageSize));

  orderTypeLabel = computed(() => {
    const o = this.selectedOrder();
    if (!o) return '';
    return o.orderType === 'dine_in'  ? `Table ${o.tableNumber ?? '–'}`
         : o.orderType === 'takeaway' ? 'Takeaway'
         : 'Delivery';
  });

  ngOnInit() { this.startPolling(); }

  ngOnDestroy() { this.poll?.unsubscribe(); }

  // ── Polling (refreshes every 30s for live order updates) ─────────────────────
  startPolling() {
    this.poll = interval(30_000)
      .pipe(startWith(0), switchMap(() => {
        return this.svc.getAll(
          this.selectedStatus(), this.currentPage(), this.pageSize);
      }))
      .subscribe({
        next: page => {
          this.orders.set(page.content);
          this.totalElements.set(page.totalElements);
          this.loading.set(false);
          this.lastRefreshed.set(new Date());

          // Refresh selected order detail if open
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
    this.loading.set(true);
    this.poll?.unsubscribe();
    this.startPolling();
  }

  // ── Manual refresh ───────────────────────────────────────────────────────────
  refresh() {
    this.loading.set(true);
    this.poll?.unsubscribe();
    this.startPolling();
  }

  // ── Order detail ─────────────────────────────────────────────────────────────
  openOrder(order: OrderResponse) {
    this.selectedOrder.set(order);
  }

  closeDetail() { this.selectedOrder.set(null); }

  // ── Status update ────────────────────────────────────────────────────────────
  advanceStatus(order: OrderResponse) {
    const meta = STATUS_META[order.status];
    if (!meta.next) return;

    this.updatingId.set(order.id);
    this.svc.updateStatus(order.id, meta.next).subscribe({
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

  cancelOrder(order: OrderResponse) {
    if (!confirm(`Cancel order ${order.reference}?`)) return;
    this.updatingId.set(order.id);
    this.svc.updateStatus(order.id, 'CANCELLED').subscribe({
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

  // ── Pagination ───────────────────────────────────────────────────────────────
  goToPage(page: number) {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.loading.set(true);
    this.poll?.unsubscribe();
    this.startPolling();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  getStatusMeta(status: OrderStatus) { return STATUS_META[status]; }

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

  openWhatsApp(order: OrderResponse) {
    if (!order.customerPhone) return;
    const phone = order.customerPhone.replace(/\s+/g, '');
    window.open(`https://wa.me/${phone}`, '_blank', 'noopener');
  }
}