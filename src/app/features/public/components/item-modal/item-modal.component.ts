import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  PublicItemResponse,
  PublicVariantResponse,
  PublicModifierGroupResponse,
  PublicPairingGroupResponse,
  PublicPairingResponse,
} from '../../models/public-menu.models';

@Component({
  selector: 'app-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './item-modal.component.html',
  styleUrl: './item-modal.component.scss',
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

  /**
   * Map of pairingId → selected count.
   * For checkbox/unlimited groups: 0 or 1.
   * For radio groups (maxSelect=1): only one per group can be > 0.
   * Managed entirely by the parent — this component only emits events.
   */
  @Input({ required: true }) selectedPairings!: Map<string, number>;

  @Output() close           = new EventEmitter<void>();
  @Output() selectVariant   = new EventEmitter<PublicVariantResponse>();
  @Output() toggleMod       = new EventEmitter<{ modId: string; group: PublicModifierGroupResponse }>();
  @Output() decQty          = new EventEmitter<void>();
  @Output() incQty          = new EventEmitter<void>();
  @Output() setSpecialNote  = new EventEmitter<string>();
  @Output() addToCart       = new EventEmitter<void>();

  /**
   * Emitted when the customer taps a pairing row.
   * The parent enforces minSelect/maxSelect and updates selectedPairings.
   */
  @Output() togglePairing   = new EventEmitter<{
    pairing: PublicPairingResponse;
    group:   PublicPairingGroupResponse;
  }>();

  // ── Modifier helpers ────────────────────────────────────────────────────────

  isModSelected(id: string): boolean {
    return this.selectedMods.has(id);
  }

  // ── Pairing helpers ─────────────────────────────────────────────────────────

  isPairingSelected(id: string): boolean {
    return (this.selectedPairings.get(id) ?? 0) > 0;
  }

  /**
   * How many pairings are currently selected in a given group.
   * Used to enforce maxSelect visually (disable non-selected items when at cap).
   */
  groupSelectedCount(group: PublicPairingGroupResponse): number {
    return group.pairings.reduce(
      (sum, p) => sum + (this.selectedPairings.get(p.id) ?? 0),
      0
    );
  }

  /**
   * Whether a specific pairing button should be disabled.
   * Disabled when: not selected AND group is at maxSelect cap.
   */
  isPairingDisabled(pairing: PublicPairingResponse, group: PublicPairingGroupResponse): boolean {
    if (this.isPairingSelected(pairing.id)) return false;
    if (group.maxSelect === -1) return false;
    return this.groupSelectedCount(group) >= group.maxSelect;
  }

  /**
   * Selection hint shown under the group title.
   * e.g. "Choose up to 2" / "Choose 1" / "Optional"
   */
  pairingGroupHint(group: PublicPairingGroupResponse): string {
    if (group.maxSelect === 1) return '';   // badge alone is enough for radio-style
    if (group.maxSelect === -1) return '';  // unlimited — no cap to communicate
    return '';                              // parent can use translate key with interpolation
  }

  isRadioGroup(group: PublicPairingGroupResponse): boolean {
    return group.maxSelect === 1;
  }

  fmt(n: number | null): string {
    if (n == null) return '';
    return n.toFixed(3);
  }
}