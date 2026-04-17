import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PosCartItem } from '../../../../models/pos.models';
import { PosOrder } from '../../../../models/pos-order.models';

@Component({
  selector: 'app-pos-add-items-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-add-items-panel.component.html',
  styleUrls: ['./pos-add-items-panel.component.scss'],
})
export class PosAddItemsPanelComponent {
  @Input({ required: true }) order!: PosOrder;
  @Input({ required: true }) cartItems!: PosCartItem[];
  @Input({ required: true }) cartIsEmpty!: boolean;
  @Input({ required: true }) cartCount!: number;
  @Input({ required: true }) loading!: boolean;
  @Input() error: string | null = null;
  @Input({ required: true }) fmtFn!: (n: number) => string;

  @Output() cancel      = new EventEmitter<void>();
  @Output() updateQty   = new EventEmitter<{ cartId: string; qty: number }>();
  @Output() removeItem  = new EventEmitter<string>();
  @Output() confirm     = new EventEmitter<void>();
}