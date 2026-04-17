import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PosOrderType } from '../../../../models/pos.models';
import { LangSwitcherComponent } from '../../../../../../shared/components/lang-switcher/lang-switcher.component';

@Component({
  selector: 'app-pos-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe, LangSwitcherComponent],
  templateUrl: './pos-topbar.component.html',
  styleUrls: ['./pos-topbar.component.scss'],
})
export class PosTopbarComponent {
  @Input({ required: true }) orderTypes!: { value: PosOrderType; label: string }[];
  @Input({ required: true }) orderType!: PosOrderType;
  @Input({ required: true }) isShiftOpen!: boolean;
  @Input() drawerState: any = null;
  @Input() drawerBalance = '';
  @Input() currentShift: any = null;
  @Input() shiftRevenue = '';
  @Input() activeTableCount = 0;
  @Input() staffName = '';

  @Output() orderTypeChange = new EventEmitter<PosOrderType>();
  @Output() cashIn          = new EventEmitter<void>();
  @Output() cashOut         = new EventEmitter<void>();
  @Output() refund          = new EventEmitter<void>();
  @Output() discount        = new EventEmitter<void>();
  @Output() promo           = new EventEmitter<void>();
  @Output() print           = new EventEmitter<void>();
  @Output() zReport         = new EventEmitter<void>();
  @Output() closeShift      = new EventEmitter<void>();
  @Output() logout          = new EventEmitter<void>();
}