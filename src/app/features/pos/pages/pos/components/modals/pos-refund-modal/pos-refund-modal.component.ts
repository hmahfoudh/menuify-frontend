import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PosOrder } from '../../../../../models/pos-order.models';

@Component({
  selector: 'app-pos-refund-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, DatePipe, TranslatePipe],
  templateUrl: './pos-refund-modal.component.html',
  styleUrls: ['./pos-refund-modal.component.scss'],
})
export class PosRefundModalComponent {
  @Input({ required: true }) mode!: 'list' | 'detail';
  @Input({ required: true }) refundOrders!: PosOrder[];
  @Input({ required: true }) refundLoading!: boolean;
  @Input() selectedRefundOrder: PosOrder | null = null;
  @Input({ required: true }) refundAmount!: string;
  @Input({ required: true }) refundReason!: string;
  @Input() refundError: string | null = null;
  @Input({ required: true }) refundSubmitting!: boolean;
  @Input({ required: true }) fmtFn!: (n: number) => string;

  @Output() refundAmountChange = new EventEmitter<string>();
  @Output() refundReasonChange = new EventEmitter<string>();
  @Output() selectOrder        = new EventEmitter<PosOrder>();
  @Output() backToList         = new EventEmitter<void>();
  @Output() confirm            = new EventEmitter<void>();
  @Output() dismiss            = new EventEmitter<void>();
}
