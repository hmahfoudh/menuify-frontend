import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './checkout-modal.component.html',
})
export class CheckoutModalComponent {
  @Input({ required: true }) orderType!: 'dine_in' | 'takeaway';
  @Input({ required: true }) tableNumber!: string;
  @Input({ required: true }) customerName!: string;
  @Input({ required: true }) customerPhone!: string;
  @Input({ required: true }) orderNotes!: string;
  @Input({ required: true }) orderError!: string | null;
  @Input({ required: true }) submitting!: boolean;
  @Input({ required: true }) cartCount!: number;
  @Input({ required: true }) cartSubtotal!: number;
  @Input({ required: true }) currency!: string;

  @Output() back = new EventEmitter<void>();
  @Output() setOrderTypeDineIn = new EventEmitter<void>();
  @Output() setOrderTypeTakeaway = new EventEmitter<void>();
  @Output() setTableNumber = new EventEmitter<string>();
  @Output() setCustomerName = new EventEmitter<string>();
  @Output() setCustomerPhone = new EventEmitter<string>();
  @Output() setOrderNotes = new EventEmitter<string>();
  @Output() submitOrder = new EventEmitter<void>();

  fmt(n: number | null): string {
    if (n == null) return '';
    return n.toFixed(3);
  }
}