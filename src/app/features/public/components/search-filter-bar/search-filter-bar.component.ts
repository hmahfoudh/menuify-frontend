import {
  Component, input, output,
  computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export type FilterKey = 'featured' | 'vegetarian' | 'vegan' | 'glutenFree' | 'spicy';

export interface FilterChip {
  key:      FilterKey;
  label:    string;
  emoji:    string;
}

export const ALL_FILTER_CHIPS: FilterChip[] = [
  { key: 'featured',   label: 'Signature',    emoji: '⭐'  },
  { key: 'vegan',      label: 'Vegan',        emoji: '🌱' },
  { key: 'vegetarian', label: 'Végétarien',   emoji: '🌿' },
  { key: 'glutenFree', label: 'Sans gluten',  emoji: '🌾' },
  { key: 'spicy',      label: 'Épicé',        emoji: '🌶️' },
];

@Component({
  selector: 'app-search-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './search-filter-bar.component.html',
  styleUrls: ['./search-filter-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchFilterBarComponent {

  /** Flags that actually exist on at least one item — only these chips render */
  availableFilters = input.required<Set<FilterKey>>();

  /** Currently toggled filters */
  activeFilters = input.required<Set<FilterKey>>();

  /** Current search query string */
  searchQuery = input.required<string>();

  queryChange   = output<string>();
  filtersChange = output<Set<FilterKey>>();

  visibleChips = computed(() =>
    ALL_FILTER_CHIPS.filter(c => this.availableFilters().has(c.key))
  );

  hasActiveState = computed(() =>
    this.searchQuery().length > 0 || this.activeFilters().size > 0
  );

  onQueryInput(value: string): void {
    this.queryChange.emit(value);
  }

  isActive(key: FilterKey): boolean {
    return this.activeFilters().has(key);
  }

  toggleFilter(key: FilterKey): void {
    const next = new Set(this.activeFilters());
    next.has(key) ? next.delete(key) : next.add(key);
    this.filtersChange.emit(next);
  }

  clearAll(): void {
    this.queryChange.emit('');
    this.filtersChange.emit(new Set());
  }
}