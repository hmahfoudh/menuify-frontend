import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-pos-order-sent',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-order-sent.component.html',
  styleUrls: ['./pos-order-sent.component.scss'],
})
export class PosOrderSentComponent {
  @Input() lastOrderRef: string | null = null;
  @Output() print    = new EventEmitter<void>();
  @Output() newOrder = new EventEmitter<void>();
}