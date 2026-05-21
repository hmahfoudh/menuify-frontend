// menu-grid.component.ts
import {
  Component, Input, Output, EventEmitter,
  AfterViewInit, OnDestroy, ElementRef, Inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { ItemCardComponent } from '../item-card/item-card.component';
import { PublicItemResponse } from '../../models/public-menu.models';

@Component({
  selector: 'app-menu-grid',
  standalone: true,
  imports: [CommonModule, ItemCardComponent],
  templateUrl: './menu-grid.component.html',
  styleUrl: './menu-grid.component.scss',
})
export class MenuGridComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) categories!: any[];
  @Input({ required: true }) currency!: string;
  @Input({ required: true }) likedItems!: Set<string>;
  @Input({ required: true }) itemLikeCounts!: Map<string, number>;

  @Output() openItem = new EventEmitter<{ item: PublicItemResponse; catId: string }>();
  @Output() toggleLike = new EventEmitter<{ domEvent: Event; itemId: string }>();
  @Output() activeCategoryChange = new EventEmitter<string>();
  @Output() activeSubcategoryChange = new EventEmitter<string>();

  private observer: IntersectionObserver | null = null;

  // Maps section element → { catId, subId? }
  private sectionMeta = new Map<Element, { catId: string; subId?: string }>();

  constructor(
    private el: ElementRef,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Give the DOM one tick to render all sections
    setTimeout(() => this.initObserver(), 0);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  // ── IntersectionObserver setup ───────────────────────────────────────────────

  private initObserver(): void {
    this.sectionMeta.clear();
    const host: HTMLElement = this.el.nativeElement;

    // Map every mp-section → its category id
    host.querySelectorAll<HTMLElement>('.mp-section').forEach((sectionEl) => {
      const catId = sectionEl.id.replace('section-', '');
      this.sectionMeta.set(sectionEl, { catId });
    });

    // Map every mp-subsection → its subcategory id + parent category id
    host.querySelectorAll<HTMLElement>('.mp-subsection').forEach((subEl) => {
      const subId = subEl.id.replace('section-', '');
      // Walk up to the parent mp-section to get catId
      const parentSection = subEl.closest<HTMLElement>('.mp-section');
      const catId = parentSection ? parentSection.id.replace('section-', '') : '';
      this.sectionMeta.set(subEl, { catId, subId });
    });

    // rootMargin: top offset accounts for sticky nav (~90px covers tabs + chips row)
    // bottom offset pushes the trigger line to roughly the upper third of the viewport
    this.observer = new IntersectionObserver(
      (entries) => this.onIntersection(entries),
      {
        root: null,
        rootMargin: '-90px 0px -60% 0px',
        threshold: 0,
      },
    );

    this.sectionMeta.forEach((_, el) => this.observer!.observe(el));
  }

  private onIntersection(entries: IntersectionObserverEntry[]): void {
    // Among all currently intersecting sections, pick the one closest to the top
    const intersecting = entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

    if (intersecting.length === 0) return;

    const topEntry = intersecting[0];
    const meta = this.sectionMeta.get(topEntry.target);
    if (!meta) return;

    this.activeCategoryChange.emit(meta.catId);
    this.activeSubcategoryChange.emit(meta.subId ?? '');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  fmt(n: number | null): string {
    if (n == null) return '';
    return n.toFixed(3);
  }

  isItemLiked(itemId: string): boolean {
    return this.likedItems.has(itemId);
  }

  getItemLikeCount(itemId: string): number {
    return this.itemLikeCounts.get(itemId) ?? 0;
  }
}