// menu-grid.component.ts
import {
  Component, Input, Output, EventEmitter,
  AfterViewInit, OnChanges, OnDestroy,
  SimpleChanges, ElementRef, Inject, PLATFORM_ID,
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
export class MenuGridComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) categories!: any[];
  @Input({ required: true }) currency!: string;
  @Input({ required: true }) likedItems!: Set<string>;
  @Input({ required: true }) itemLikeCounts!: Map<string, number>;

  @Output() openItem = new EventEmitter<{ item: PublicItemResponse; catId: string }>();
  @Output() toggleLike = new EventEmitter<{ domEvent: Event; itemId: string }>();
  @Output() activeCategoryChange = new EventEmitter<string>();
  @Output() activeSubcategoryChange = new EventEmitter<string>();

  private observer: IntersectionObserver | null = null;
  private sectionMeta = new Map<Element, { catId: string; subId?: string }>();

  // Tracks whether the initial AfterViewInit setup has run yet.
  // ngOnChanges fires before AfterViewInit on first render, so we must
  // not attempt DOM queries before the view exists.
  private viewInitialized = false;

  // Pending re-init timer — we cancel any in-flight timer before scheduling
  // a new one so rapid filter changes don't stack multiple re-inits.
  private reinitTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private el: ElementRef,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.viewInitialized = true;
    setTimeout(() => this.initObserver(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Only react to categories changes, and only after the view exists.
    // On first render ngOnChanges fires before ngAfterViewInit — ngAfterViewInit
    // handles that initial setup, so we skip it here.
    if (!this.viewInitialized) return;
    if (!changes['categories']) return;

    // Tear down immediately so stale nodes stop firing intersection events
    // while Angular is mid-render of the updated DOM.
    this.teardownObserver();

    // Schedule re-init after Angular has flushed the DOM changes.
    if (this.reinitTimer !== null) clearTimeout(this.reinitTimer);
    this.reinitTimer = setTimeout(() => {
      this.reinitTimer = null;
      this.initObserver();
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.reinitTimer !== null) clearTimeout(this.reinitTimer);
    this.teardownObserver();
  }

  // ── Observer lifecycle ────────────────────────────────────────────────────────

  private teardownObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.sectionMeta.clear();
  }

  private initObserver(): void {
    const host: HTMLElement = this.el.nativeElement;

    // Map every mp-section → its category id
    host.querySelectorAll<HTMLElement>('.mp-section').forEach((sectionEl) => {
      const catId = sectionEl.id.replace('section-', '');
      this.sectionMeta.set(sectionEl, { catId });
    });

    // Map every mp-subsection → its subcategory id + parent category id
    host.querySelectorAll<HTMLElement>('.mp-subsection').forEach((subEl) => {
      const subId = subEl.id.replace('section-', '');
      const parentSection = subEl.closest<HTMLElement>('.mp-section');
      const catId = parentSection ? parentSection.id.replace('section-', '') : '';
      this.sectionMeta.set(subEl, { catId, subId });
    });

    if (this.sectionMeta.size === 0) return;

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

  // ── Helpers ───────────────────────────────────────────────────────────────────

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