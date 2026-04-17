import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PosPaymentType } from '../../../../models/pos.models';

@Component({
  selector: 'app-pos-payment-screen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-payment-screen.component.html',
  styleUrls: ['./pos-payment-screen.component.scss'],
})
export class PosPaymentScreenComponent {
  @Input() pendingOrderRef: string | null = null;
  @Input({ required: true }) pendingTotal!: number;
  @Input({ required: true }) paymentType!: PosPaymentType;
  @Input({ required: true }) tenderedInput!: string;
  @Input({ required: true }) tipInput!: string;
  @Input({ required: true }) changeAmount!: number;
  @Input({ required: true }) isTenderedSufficient!: boolean;
  @Input() paymentError: string | null = null;
  @Input({ required: true }) paymentLoading!: boolean;
  @Input({ required: true }) fmtFn!: (n: number) => string;

  @Output() paymentTypeChange   = new EventEmitter<PosPaymentType>();
  @Output() tenderedInputChange = new EventEmitter<string>();
  @Output() tipInputChange      = new EventEmitter<string>();
  @Output() confirm             = new EventEmitter<void>();
  @Output() skip                = new EventEmitter<void>();

  parseFloat = parseFloat;
}