import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-pos-cash-movement-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-cash-movement-modal.component.html',
  styles: [''],
})
export class PosCashMovementModalComponent {
  @Input({ required: true }) mode!: 'in' | 'out';
  @Input({ required: true }) amount!: string;
  @Input({ required: true }) reason!: string;
  @Input() error: string | null = null;
  @Input({ required: true }) loading!: boolean;

  @Output() amountChange = new EventEmitter<string>();
  @Output() reasonChange = new EventEmitter<string>();
  @Output() confirm      = new EventEmitter<void>();
  @Output() dismiss      = new EventEmitter<void>();

  // Computed labels per mode
  get titleKey():            string { return this.mode === 'in' ? 'pos.cash_in.title'            : 'pos.cash_out.title'; }
  get amountLabelKey():      string { return this.mode === 'in' ? 'pos.cash_in.amount_label'     : 'pos.cash_out.amount_label'; }
  get reasonLabelKey():      string { return this.mode === 'in' ? 'pos.cash_in.reason_label'     : 'pos.cash_out.reason_label'; }
  get reasonPlaceholderKey():string { return this.mode === 'in' ? 'pos.cash_in.reason_placeholder': 'pos.cash_out.reason_placeholder'; }
  get cancelKey():           string { return this.mode === 'in' ? 'pos.cash_in.cancel'           : 'pos.cash_out.cancel'; }
  get confirmKey():          string { return this.mode === 'in' ? 'pos.cash_in.confirm'          : 'pos.cash_out.confirm'; }
  get iconChar():            string { return this.mode === 'in' ? '↓' : '↑'; }
  get iconClass():           string { return this.mode === 'in' ? 'pos-modal__icon--in' : 'pos-modal__icon--out'; }
  get btnColorClass():       string { return this.mode === 'in' ? 'pos-modal__confirm-btn--blue' : 'pos-modal__confirm-btn--orange'; }
}
