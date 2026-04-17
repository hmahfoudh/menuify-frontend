import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-pos-open-shift-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-open-shift-modal.component.html',
  styleUrls: ['./pos-open-shift-modal.component.scss'],
})
export class PosOpenShiftModalComponent {
@Input({ required: true }) openFloatInput!: string;
@Input() shiftError: string | null = null;
@Input({ required: true }) shiftLoading!: boolean;
@Output() openFloatInputChange = new EventEmitter<string>();
@Output() confirm              = new EventEmitter<void>();
}