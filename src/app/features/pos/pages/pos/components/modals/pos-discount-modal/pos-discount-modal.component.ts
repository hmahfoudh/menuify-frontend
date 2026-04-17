import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-pos-discount-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-discount-modal.component.html',
  styleUrls: ['./pos-discount-modal.component.scss'],
})
export class PosDiscountModalComponent {
  @Input({ required: true }) discountMode!: 'fixed' | 'percent';
  @Input({ required: true }) discountInput!: string;

  @Output() discountModeChange  = new EventEmitter<'fixed' | 'percent'>();
  @Output() discountInputChange = new EventEmitter<string>();
  @Output() apply               = new EventEmitter<void>();
  @Output() dismiss             = new EventEmitter<void>();
}
