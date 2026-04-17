import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
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
  @Input({ required: true }) loading!: boolean;
  @Input({ required: true }) tables!: TableStatusResponse[];
  @Input({ required: true }) selectedTableKey!: string | null;

  @Input({ required: true }) tableCardClassFn!:   (t: TableStatusResponse) => string;
  @Input({ required: true }) tableStatusLabelFn!: (t: TableStatusResponse) => string;
  @Input({ required: true }) tableStatusDotFn!:   (t: TableStatusResponse) => string;
  @Input({ required: true }) tableKeyFn!:         (t: TableStatusResponse) => string;

  @Output() tableSelect = new EventEmitter<string>();

  readonly skeletons = [1, 2, 3, 4, 5, 6];
}