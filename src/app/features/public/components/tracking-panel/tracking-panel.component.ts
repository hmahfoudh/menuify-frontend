import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TrackedOrder, TrackingStatus, TRACKING_STATUS_META } from '../../models/public-menu.models';

@Component({
  selector: 'app-tracking-panel',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './tracking-panel.component.html',
  styleUrl: './tracking-panel.component.scss',
})
export class TrackingPanelComponent {
  @Input({ required: true }) activeOrders!: TrackedOrder[];
  @Input({ required: true }) expandedRef!: string | null;
  @Input({ required: true }) trackingRef!: string;
  @Input({ required: true }) trackingError!: string | null;
  @Input({ required: true }) trackingLoading!: boolean;
  @Input({ required: true }) trackingSteps!: readonly TrackingStatus[];
  @Input({ required: true }) trackingMetaMap!: typeof TRACKING_STATUS_META;
  @Input({ required: true }) currency!: string;

  @Output() close = new EventEmitter<void>();
  @Output() expandOrder = new EventEmitter<string>();
  @Output() endTracking = new EventEmitter<string>();
  @Output() setTrackingRef = new EventEmitter<string>();
  @Output() lookupOrder = new EventEmitter<void>();

  getTrackingMeta(status: TrackingStatus) {
    return this.trackingMetaMap[status];
  }

  isStepDone(stepStatus: TrackingStatus, current: TrackingStatus): boolean {
    return this.trackingMetaMap[current].step > this.trackingMetaMap[stepStatus].step;
  }

  isStepActive(stepStatus: TrackingStatus, current: TrackingStatus): boolean {
    return stepStatus === current;
  }

  fmt(n: number | null): string {
    if (n == null) return '';
    return n.toFixed(3);
  }
}