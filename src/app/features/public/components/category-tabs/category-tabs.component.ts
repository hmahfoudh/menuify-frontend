import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicSubcategoryResponse } from '../../models/public-menu.models';

@Component({
  selector: 'app-category-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-tabs.component.html',
  styleUrl: './category-tabs.component.scss',
})
export class CategoryTabsComponent implements OnChanges {
  @Input({ required: true }) categories!: any[];
  @Input({ required: true }) activeCategory!: string;
  @Input() subcategories: PublicSubcategoryResponse[] = [];
  @Input() activeSubcategory: string = '';

  @Output() selectCategory = new EventEmitter<string>();
  @Output() selectSubcategory = new EventEmitter<string>();

  constructor(private host: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeCategory']) {
      // Scroll the active tab into view smoothly
      setTimeout(() => this.scrollTabIntoView(changes['activeCategory'].currentValue, '.mp-tab'));
    }
    if (changes['activeSubcategory'] && changes['activeSubcategory'].currentValue) {
      setTimeout(() => this.scrollTabIntoView(changes['activeSubcategory'].currentValue, '.mp-chip'));
    }
  }

  private scrollTabIntoView(id: string, selector: string): void {
    const host: HTMLElement = this.host.nativeElement;
    // Find the button whose click emits this id — match by index against categories/subcategories
    const buttons = host.querySelectorAll<HTMLButtonElement>(selector);
    const list = selector === '.mp-tab' ? this.categories : this.subcategories;
    const idx = list.findIndex((c: any) => c.id === id);
    if (idx >= 0 && buttons[idx]) {
      buttons[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }
}