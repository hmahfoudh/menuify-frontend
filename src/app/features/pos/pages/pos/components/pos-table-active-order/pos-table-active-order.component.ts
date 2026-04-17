import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PosOrder } from '../../../../models/pos-order.models';

@Component({
  selector: 'app-pos-table-active-order',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-table-active-order.component.html',
  styleUrls: ['./pos-table-active-order.component.scss'],
})
export class PosTableActiveOrderComponent {
  @Input({ required: true }) order!: PosOrder;
  @Input({ required: true }) isShiftOpen!: boolean;
  @Input({ required: true }) orderStatusLabelFn!: (s: string) => string;
  @Input({ required: true }) orderStatusClassFn!: (s: string) => string;
  @Input({ required: true }) fmtFn!: (n: number) => string;

  @Output() enterAddItems = new EventEmitter<void>();
  @Output() payOrder      = new EventEmitter<void>();
}