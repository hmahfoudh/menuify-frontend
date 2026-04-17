import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-pos-promo-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-promo-modal.component.html',
  styles: [''],
})
export class PosPromoModalComponent {
  @Input({ required: true }) promoInput!: string;
  @Output() promoInputChange = new EventEmitter<string>();
  @Output() apply            = new EventEmitter<void>();
  @Output() dismiss          = new EventEmitter<void>();
}