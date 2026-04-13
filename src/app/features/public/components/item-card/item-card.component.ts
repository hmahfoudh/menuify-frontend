import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { FormatLikeCountPipe } from '../../../../shared/pipes/format-like-count.pipe';
import { PublicItemResponse } from '../../models/public-menu.models';

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe, FormatLikeCountPipe],
  templateUrl: './item-card.component.html',
})
export class ItemCardComponent {
  @Input({ required: true }) item!: PublicItemResponse;
  @Input({ required: true }) catId!: string;
  @Input({ required: true }) currency!: string;
  @Input({ required: true }) isLiked!: boolean;
  @Input({ required: true }) likeCount!: number;
  @Output() cardClick = new EventEmitter<void>();
  @Output() likeClick = new EventEmitter<{ domEvent: Event; itemId: string }>();

  onLikeClick(event: Event): void {
    this.likeClick.emit({ domEvent: event, itemId: this.item.id });
  }

  fmt(n: number | null): string {
    if (n == null) return '';
    return n.toFixed(3);
  }
}