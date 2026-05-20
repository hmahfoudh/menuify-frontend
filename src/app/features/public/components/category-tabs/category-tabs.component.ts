import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicSubcategoryResponse } from '../../models/public-menu.models';

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
  @Input() subcategories: PublicSubcategoryResponse[] = [];
  @Input() activeSubcategory: string = '';
  @Output() selectCategory = new EventEmitter<string>();
  @Output() selectSubcategory = new EventEmitter<string>();
}