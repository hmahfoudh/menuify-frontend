import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-menu-header',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './menu-header.component.html',
})
export class MenuHeaderComponent {
  @Input({ required: true }) tenant!: any;
  @Input({ required: true }) langMenuOpen!: boolean;
  @Input({ required: true }) currentLang!: { code: string; flag: string; label: string };
  @Input({ required: true }) availableLangs!: { code: string; flag: string; label: string }[];
  @Output() toggleLangMenu = new EventEmitter<void>();
  @Output() switchLang = new EventEmitter<string>();
}