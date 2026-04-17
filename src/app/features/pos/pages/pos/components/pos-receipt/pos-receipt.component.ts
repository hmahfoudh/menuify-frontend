import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PosCartItem } from '../../../../models/pos.models';

@Component({
  selector: 'app-pos-receipt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe, TranslatePipe],
  templateUrl: './pos-receipt.component.html',
  styleUrls: ['./pos-receipt.component.scss'],
})
export class PosReceiptComponent {
  @Input({ required: true }) tenantName!: string;
  @Input() receiptTable: string | null = null;
  @Input() lastOrderRef: string | null = null;
  @Input({ required: true }) now!: Date;
  @Input({ required: true }) receiptLines!: PosCartItem[];
  @Input({ required: true }) receiptSubtotal!: number;
  @Input({ required: true }) fmtFn!: (n: number) => string;
}