import {
  Component, Input, Output, EventEmitter,
  OnDestroy, AfterViewInit, OnChanges, SimpleChanges, ElementRef
} from '@angular/core';
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
export class MenuGridComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) categories!: any[];
  @Input({ required: true }) currency!: string;
  @Input({ required: true }) likedItems!: Set<string>;
  @Input({ required: true }) itemLikeCounts!: Map<string, number>;

  @Output() openItem = new EventEmitter<{ item: PublicItemResponse; catId: string }>();
  @Output() toggleLike = new EventEmitter<{ domEvent: Event; itemId: string }>();
  /** Emits the section id (category or subcategory) currently in view */
  @Output() activeSectionChange = new EventEmitter<{ catId: string; subId: string | null }>();

  // ── LCP priority item ──────────────────────────────────────────────────────
  // Resolved ONCE in ngOnChanges from stable data.
  // The template uses: [isPriority]="priorityItemId === item.id"
  // This is a pure, side-effect-free expression — same value every CD cycle.
  priorityItemId: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories'] && this.categories?.length) {
      this.priorityItemId = this.resolvePriorityItemId();
    }
  }

  /**
   * Walks the categories tree once and returns the id of the very first
   * renderable item — the LCP candidate. Returns null if there are no items.
   */
  private resolvePriorityItemId(): string | null {
    for (const cat of this.categories) {
      if (cat.subcategories?.length > 0) {
        for (const sub of cat.subcategories) {
          if (sub.items?.length > 0) return sub.items[0].id;
        }
      } else {
        if (cat.items?.length > 0) return cat.items[0].id;
      }
    }
    return null;
  }

  // ── Scroll-spy observer ────────────────────────────────────────────────────

  private observer: IntersectionObserver | null = null;
  /** Maps section element → { catId, subId } so we know what each element represents */
  private sectionMeta = new Map<Element, { catId: string; subId: string | null }>();

  constructor(private host: ElementRef) {}

  ngAfterViewInit(): void {
    // Wait one tick so @for has rendered all sections
    setTimeout(() => this.initObserver());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private initObserver(): void {
    // rootMargin: top offset accounts for sticky tabs height (~90px covers tabs + chips row).
    // A section is "active" when its top edge crosses into the top 30% of the viewport.
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersections(entries),
      {
        root: null,
        // Top: negative offset so section activates when it reaches just below the sticky tabs
        // Bottom: negative 65% so only the topmost visible section fires
        rootMargin: '-90px 0px -65% 0px',
        threshold: 0,
      }
    );

    const host: HTMLElement = this.host.nativeElement;

    // Observe every section and subsection
    this.categories.forEach((cat) => {
      if (cat.subcategories?.length > 0) {
        // Parent section — observe each subsection individually
        cat.subcategories.forEach((sub: any) => {
          const el = host.querySelector(`#section-${sub.id}`);
          if (el) {
            this.sectionMeta.set(el, { catId: cat.id, subId: sub.id });
            this.observer!.observe(el);
          }
        });
        // Also observe the parent section so the tab activates when scrolling back to top
        const parentEl = host.querySelector(`#section-${cat.id}`);
        if (parentEl) {
          this.sectionMeta.set(parentEl, { catId: cat.id, subId: cat.subcategories[0]?.id ?? null });
          this.observer!.observe(parentEl);
        }
      } else {
        const el = host.querySelector(`#section-${cat.id}`);
        if (el) {
          this.sectionMeta.set(el, { catId: cat.id, subId: null });
          this.observer!.observe(el);
        }
      }
    });
  }

  private handleIntersections(entries: IntersectionObserverEntry[]): void {
    // Among all currently-intersecting sections, pick the one closest to the top
    const intersecting = entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

    if (intersecting.length === 0) return;

    const topEntry = intersecting[0];
    const meta = this.sectionMeta.get(topEntry.target);
    if (meta) {
      this.activeSectionChange.emit(meta);
    }
  }

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