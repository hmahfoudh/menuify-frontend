import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TrackedOrder, TrackingStatus, TRACKING_STATUS_META, TRACKING_STEPS } from '../../models/public-menu.models';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './cart-drawer.component.html',
})
export class CartDrawerComponent {
  @Input({ required: true }) cartMode!: 'cart' | 'orders';
  @Input({ required: true }) cartItems!: any[];
  @Input({ required: true }) cartEmpty!: boolean;
  @Input({ required: true }) cartCount!: number;
  @Input({ required: true }) cartSubtotal!: number;
  @Input({ required: true }) currency!: string;
  @Input({ required: true }) hasActiveOrders!: boolean;
  @Input({ required: true }) activeOrders!: TrackedOrder[];
  @Input({ required: true }) isOpen!: boolean;
  @Input({ required: true }) trackingSteps!: readonly TrackingStatus[];
  @Input({ required: true }) trackingMetaMap!: typeof TRACKING_STATUS_META;

  @Output() close = new EventEmitter<void>();
  @Output() setCartMode = new EventEmitter<'cart' | 'orders'>();
  @Output() updateQty = new EventEmitter<{ cartId: string; qty: number }>();
  @Output() openCheckout = new EventEmitter<void>();
  @Output() openTracking = new EventEmitter<string>();
  @Output() endTracking = new EventEmitter<string>();

  getTrackingMeta(status: TrackingStatus) {
    return this.trackingMetaMap[status];
  }

  isStepDone(stepStatus: TrackingStatus, current: TrackingStatus): boolean {
    return this.trackingMetaMap[current].step > this.trackingMetaMap[stepStatus].step;
  }

  isStepActive(stepStatus: TrackingStatus, current: TrackingStatus): boolean {
    return stepStatus === current;
  }

  fmt(n: number | null): string {
    if (n == null) return '';
    return n.toFixed(3);
  }
}