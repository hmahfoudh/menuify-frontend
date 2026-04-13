import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-bottom-bar',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './bottom-bar.component.html',
})
export class BottomBarComponent {
  @Input({ required: true }) cartEmpty!: boolean;
  @Input({ required: true }) cartCount!: number;
  @Input({ required: true }) cartSubtotal!: number;
  @Input({ required: true }) currency!: string;
  @Input({ required: true }) hasActiveOrders!: boolean;
  @Input({ required: true }) activeOrdersCount!: number;

  @Output() toggleCart = new EventEmitter<void>();
  @Output() openTracking = new EventEmitter<void>();

  fmt(n: number | null): string {
    if (n == null) return '';
    return n.toFixed(3);
  }
}