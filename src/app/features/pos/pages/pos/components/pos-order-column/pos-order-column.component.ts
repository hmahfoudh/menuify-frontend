import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { PosCartItem, PosOrderType, PosPaymentType, TableStatusResponse } from '../../../../models/pos.models';
import { PosOrder } from '../../../../models/pos-order.models';

import { PosCartPanelComponent } from '../pos-cart-panel/pos-cart-panel.component';
import { PosPaymentScreenComponent } from '../pos-payment-screen/pos-payment-screen.component';
import { PosOrderSentComponent } from '../pos-order-sent/pos-order-sent.component';
import { PosTableActiveOrderComponent } from '../pos-table-active-order/pos-table-active-order.component';
import { PosAddItemsPanelComponent } from '../pos-add-items-panel/pos-add-items-panel.component';
import { PosView } from '../../pos.component';

@Component({
  selector: 'app-pos-order-column',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Allow parent .pos-order-col / shared primitives to cascade into children
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule, TranslatePipe,
    PosCartPanelComponent,
    PosPaymentScreenComponent,
    PosOrderSentComponent,
    PosTableActiveOrderComponent,
    PosAddItemsPanelComponent,
  ],
  templateUrl: './pos-order-column.component.html',
  styleUrls: ['./pos-order-column.component.scss'],
})
export class PosOrderColumnComponent {
  @Input({ required: true }) view!: PosView;
  @Input({ required: true }) selectedTableKey!: string | null;
  @Input() selectedTable: TableStatusResponse | null = null;
  @Input({ required: true }) isShiftOpen!: boolean;

  @Input() tableActiveOrder: PosOrder | null = null;
  @Input({ required: true }) tableActiveOrderLoading!: boolean;
  @Input({ required: true }) addingToExistingOrder!: boolean;
  @Input({ required: true }) addingToOrderLoading!: boolean;
  @Input() addingToOrderError: string | null = null;
  @Input() addingToOrderId: string | null = null;

  @Input({ required: true }) cartItems!: PosCartItem[];
  @Input({ required: true }) cartIsEmpty!: boolean;
  @Input({ required: true }) cartCount!: number;
  @Input({ required: true }) cartSubtotal!: number;

  @Input({ required: true }) orderNotes!: string;
  @Input({ required: true }) paymentType!: PosPaymentType;
  @Input({ required: true }) submitting!: boolean;
  @Input() submitError: string | null = null;

  @Input() pendingOrderRef: string | null = null;
  @Input({ required: true }) pendingTotal!: number;
  @Input({ required: true }) tenderedInput!: string;
  @Input({ required: true }) tipInput!: string;
  @Input({ required: true }) changeAmount!: number;
  @Input({ required: true }) isTenderedSufficient!: boolean;
  @Input() paymentError: string | null = null;
  @Input({ required: true }) paymentLoading!: boolean;

  @Input() lastOrderRef: string | null = null;

  @Input({ required: true }) orderStatusLabelFn!: (s: string) => string;
  @Input({ required: true }) orderStatusClassFn!: (s: string) => string;
  @Input({ required: true }) cartLineHasNoteFn!:  (id: string) => boolean;
  @Input({ required: true }) getCartLineNoteFn!:  (id: string) => string;
  @Input({ required: true }) fmtFn!:              (n: number) => string;

  // Table / add-items
  @Output() enterAddItems   = new EventEmitter<void>();
  @Output() cancelAddItems  = new EventEmitter<void>();
  @Output() confirmAddItems = new EventEmitter<void>();
  @Output() payTableOrder   = new EventEmitter<void>();

  // Cart
  @Output() updateQty          = new EventEmitter<{ cartId: string; qty: number }>();
  @Output() removeItem         = new EventEmitter<string>();
  @Output() openNote           = new EventEmitter<string>();
  @Output() orderNotesChange   = new EventEmitter<string>();
  @Output() paymentTypeChange  = new EventEmitter<PosPaymentType>();
  @Output() placeOrder         = new EventEmitter<void>();

  // Payment
  @Output() tenderedInputChange = new EventEmitter<string>();
  @Output() tipInputChange      = new EventEmitter<string>();
  @Output() recordPayment       = new EventEmitter<void>();
  @Output() skipPayment         = new EventEmitter<void>();

  // Order sent
  @Output() printReceipt = new EventEmitter<void>();
  @Output() newOrder     = new EventEmitter<void>();
}