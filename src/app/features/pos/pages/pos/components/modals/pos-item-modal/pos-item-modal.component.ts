import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
  PublicItemResponse, PublicModifierGroupResponse, PublicVariantResponse
} from '../../../../../../public/models/public-menu.models';

@Component({
  selector: 'app-pos-item-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-item-modal.component.html',
  styleUrls: ['./pos-item-modal.component.scss'],
})
export class PosItemModalComponent {
  @Input({ required: true }) item!: PublicItemResponse & { _accent: string };
  @Input() modalVariant: PublicVariantResponse | null = null;
  @Input({ required: true }) modalMods!: Set<string>;
  @Input({ required: true }) modalUnitPrice!: number;
  @Input({ required: true }) qtyPreset!: number;
  @Input({ required: true }) fmtFn!: (n: number) => string;
  @Input({ required: true }) isModSelectedFn!: (id: string) => boolean;

  @Output() selectVariant = new EventEmitter<PublicVariantResponse>();
  @Output() toggleMod     = new EventEmitter<{ modId: string; group: PublicModifierGroupResponse }>();
  @Output() close         = new EventEmitter<void>();
  @Output() addToCart     = new EventEmitter<void>();
}