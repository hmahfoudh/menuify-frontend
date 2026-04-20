import { Component, EventEmitter, Output, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TableStatusResponse } from '../../../../models/pos.models';

@Component({
  selector: 'app-pos-tables-column',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-tables-column.component.html',
  styleUrls: ['./pos-tables-column.component.scss'],
})
export class PosTablesColumnComponent {
  // ── Signal inputs — react automatically when parent values change ──
  loading          = input.required<boolean>();
  tables           = input.required<TableStatusResponse[]>();
  selectedTableKey = input.required<string | null>();

  tableCardClassFn   = input.required<(t: TableStatusResponse) => string>();
  tableStatusLabelFn = input.required<(t: TableStatusResponse) => string>();
  tableStatusDotFn   = input.required<(t: TableStatusResponse) => string>();
  tableKeyFn         = input.required<(t: TableStatusResponse) => string>();

  @Output() tableSelect = new EventEmitter<string>();

  readonly skeletons = [1, 2, 3, 4, 5, 6];

}