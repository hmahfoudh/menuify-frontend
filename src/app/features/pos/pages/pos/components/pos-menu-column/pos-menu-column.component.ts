import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PublicCategoryResponse, PublicItemResponse } from '../../../../../public/models/public-menu.models';

type ItemWithAccent = PublicItemResponse & { _accent: string };

@Component({
  selector: 'app-pos-menu-column',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-menu-column.component.html',
  styleUrls: ['./pos-menu-column.component.scss'],
})
export class PosMenuColumnComponent {
  @Input({ required: true }) loading!: boolean;
  @Input({ required: true }) categories!: PublicCategoryResponse[];
  @Input({ required: true }) activeCatId!: string | null;
  @Input({ required: true }) searchQuery!: string;
  @Input({ required: true }) filteredItems!: ItemWithAccent[];
  @Input({ required: true }) qtyPreset!: number;
  @Input({ required: true }) qtyPresets!: number[];
  @Input({ required: true }) accentForFn!: (catId: string) => string;
  @Input({ required: true }) fmtFn!: (n: number) => string;

  @Output() categoryChange  = new EventEmitter<string | null>();
  @Output() searchChange    = new EventEmitter<string>();
  @Output() qtyPresetChange = new EventEmitter<number>();
  @Output() itemTap         = new EventEmitter<ItemWithAccent>();

  readonly itemSkeletons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}