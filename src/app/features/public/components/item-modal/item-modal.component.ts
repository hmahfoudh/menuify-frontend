import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  PublicItemResponse,
  PublicVariantResponse,
  PublicModifierGroupResponse,
} from '../../models/public-menu.models';

@Component({
  selector: 'app-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './item-modal.component.html',
})
export class ItemModalComponent {
  @Input({ required: true }) item!: PublicItemResponse;
  @Input({ required: true }) currency!: string;
  @Input({ required: true }) selectedVariant!: PublicVariantResponse | null;
  @Input({ required: true }) selectedMods!: Set<string>;
  @Input({ required: true }) modalQty!: number;
  @Input({ required: true }) specialNote!: string;
  @Input({ required: true }) canAddToCart!: boolean;
  @Input({ required: true }) modalTotal!: number;

  @Output() close = new EventEmitter<void>();
  @Output() selectVariant = new EventEmitter<PublicVariantResponse>();
  @Output() toggleMod = new EventEmitter<{ modId: string; group: PublicModifierGroupResponse }>();
  @Output() decQty = new EventEmitter<void>();
  @Output() incQty = new EventEmitter<void>();
  @Output() setSpecialNote = new EventEmitter<string>();
  @Output() addToCart = new EventEmitter<void>();

  isModSelected(id: string): boolean {
    return this.selectedMods.has(id);
  }

  fmt(n: number | null): string {
    if (n == null) return '';
    return n.toFixed(3);
  }
}