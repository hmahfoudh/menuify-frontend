// category-tabs.component.ts
import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ElementRef,
  Inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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

  constructor(
    private el: ElementRef,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (changes['activeCategory']) {
      // Scroll the active tab button into view
      setTimeout(() => {
        const host: HTMLElement = this.el.nativeElement;
        const activeTab = host.querySelector<HTMLElement>('.mp-tab--active');
        activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }, 0);
    }

    if (changes['activeSubcategory']) {
      // Scroll the active chip into view
      setTimeout(() => {
        const host: HTMLElement = this.el.nativeElement;
        const activeChip = host.querySelector<HTMLElement>('.mp-chip--active');
        activeChip?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }, 0);
    }
  }
}