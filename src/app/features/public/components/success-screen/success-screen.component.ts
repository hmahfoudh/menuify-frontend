import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-success-screen',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './success-screen.component.html',
  styleUrl: './success-screen.component.scss',
})
export class SuccessScreenComponent {
  @Input({ required: true }) latestOrderRef!: string;
  @Output() openTracking = new EventEmitter<void>();
  @Output() backToMenu = new EventEmitter<void>();
}