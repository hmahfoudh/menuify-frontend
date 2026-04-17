import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-pos-item-note-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pos-item-note-modal.component.html',
  styles: [''],
})
export class PosItemNoteModalComponent {
  @Input({ required: true }) noteInput!: string;
  @Output() noteInputChange = new EventEmitter<string>();
  @Output() save            = new EventEmitter<void>();
  @Output() close           = new EventEmitter<void>();
}