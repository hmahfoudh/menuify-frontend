import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ZReportResponse } from '../../../../../models/report.models';

@Component({
  selector: 'app-pos-z-report-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, DatePipe, TranslatePipe],
  templateUrl: './pos-z-report-modal.component.html',
  styleUrls: ['./pos-z-report-modal.component.scss'],
})
export class PosZReportModalComponent {
  @Input() zReport: ZReportResponse | null = null;
  @Input({ required: true }) zReportLoading!: boolean;
  @Input({ required: true }) now!: Date;
  @Input({ required: true }) fmtFn!: (n: number) => string;
  @Input({ required: true }) zrDiffClassFn!: (diff: number | null) => string;
  @Input({ required: true }) zrDiffLabelFn!: (diff: number | null) => string;

  @Output() print   = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
}