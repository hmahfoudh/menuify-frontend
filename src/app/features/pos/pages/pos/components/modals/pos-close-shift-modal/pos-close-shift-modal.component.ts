import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-pos-close-shift-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-close-shift-modal.component.html',
  styleUrls: ['./pos-close-shift-modal.component.scss'],
})
export class PosCloseShiftModalComponent {
  @Input() currentShift: any = null;
  @Input({ required: true }) drawerBalance!: string;
  @Input({ required: true }) closeCountInput!: string;
  @Input({ required: true }) closeNotesInput!: string;
  @Input() shiftError: string | null = null;
  @Input({ required: true }) shiftLoading!: boolean;
  @Input({ required: true }) fmtFn!: (n: number) => string;

  @Output() closeCountInputChange = new EventEmitter<string>();
  @Output() closeNotesInputChange = new EventEmitter<string>();
  @Output() confirm               = new EventEmitter<void>();
  @Output() dismiss               = new EventEmitter<void>();
}
