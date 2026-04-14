import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-tabs.component.html',
  styleUrl: './category-tabs.component.scss',
})
export class CategoryTabsComponent {
  @Input({ required: true }) categories!: any[];
  @Input({ required: true }) activeCategory!: string;
  @Output() selectCategory = new EventEmitter<string>();
}