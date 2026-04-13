import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-cart-toast',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './cart-toast.component.html',
})
export class CartToastComponent {
  @Input({ required: true }) toast!: { name: string; visible: boolean };
  @Input({ required: true }) cartCount!: number;
  @Output() viewCart = new EventEmitter<void>();
}