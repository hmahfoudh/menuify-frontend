import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ItemCardComponent } from '../item-card/item-card.component';
import { PublicItemResponse } from '../../models/public-menu.models';

@Component({
  selector: 'app-menu-grid',
  standalone: true,
  imports: [CommonModule, ItemCardComponent],
  templateUrl: './menu-grid.component.html',
})
export class MenuGridComponent {
  @Input({ required: true }) categories!: any[];
  @Input({ required: true }) currency!: string;
  @Input({ required: true }) likedItems!: Set<string>;
  @Input({ required: true }) itemLikeCounts!: Map<string, number>;
  @Output() openItem = new EventEmitter<{ item: PublicItemResponse; catId: string }>();
  @Output() toggleLike = new EventEmitter<{ domEvent: Event; itemId: string }>();

  fmt(n: number | null): string {
    if (n == null) return '';
    return n.toFixed(3);
  }

  isItemLiked(itemId: string): boolean {
    return this.likedItems.has(itemId);
  }

  getItemLikeCount(itemId: string): number {
    return this.itemLikeCounts.get(itemId) ?? 0;
  }
}