import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PosCartItem, PosPaymentType } from '../../../../models/pos.models';

@Component({
  selector: 'app-pos-cart-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-cart-panel.component.html',
  styleUrls: ['./pos-cart-panel.component.scss'],
})
export class PosCartPanelComponent {
  @Input({ required: true }) cartItems!: PosCartItem[];
  @Input({ required: true }) cartIsEmpty!: boolean;
  @Input({ required: true }) cartSubtotal!: number;
  @Input({ required: true }) orderNotes!: string;
  @Input({ required: true }) paymentType!: PosPaymentType;
  @Input({ required: true }) submitting!: boolean;
  @Input() submitError: string | null = null;
  @Input({ required: true }) isShiftOpen!: boolean;
  @Input() addingToOrderId: string | null = null;

  @Input({ required: true }) cartLineHasNoteFn!: (id: string) => boolean;
  @Input({ required: true }) getCartLineNoteFn!: (id: string) => string;
  @Input({ required: true }) fmtFn!: (n: number) => string;

  @Output() updateQty         = new EventEmitter<{ cartId: string; qty: number }>();
  @Output() removeItem        = new EventEmitter<string>();
  @Output() openNote          = new EventEmitter<string>();
  @Output() orderNotesChange  = new EventEmitter<string>();
  @Output() paymentTypeChange = new EventEmitter<PosPaymentType>();
  @Output() placeOrder        = new EventEmitter<void>();
}