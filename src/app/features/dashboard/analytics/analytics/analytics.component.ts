import {
  Component, OnInit, signal, computed,
  inject, AfterViewInit, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule }      from '@angular/common';
import { AnalyticsService }  from '../services/analytics.service';
import {
  AnalyticsSummaryResponse, DailyStatsResponse,
  Period, ChartMetric,
  PERIODS, CHART_METRICS
} from '../models/analytics.models';

@Component({
  selector:    'app-analytics',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrls:   ['./analytics.component.scss']
})
export class AnalyticsComponent implements OnInit, AfterViewInit {

  @ViewChild('chartCanvas') chartRef!: ElementRef<HTMLCanvasElement>;

  private svc = inject(AnalyticsService);

  // ── State ──────────────────────────────────────────────────────────────────
  data          = signal<AnalyticsSummaryResponse | null>(null);
  loading       = signal(true);
  error         = signal<string | null>(null);
  period        = signal<Period>('7d');
  chartMetric   = signal<ChartMetric>('totalViews');
  hoveredIndex  = signal<number | null>(null);
  tooltip       = signal<{ x: number; y: number; stat: DailyStatsResponse } | null>(null);

  readonly periods      = PERIODS;
  readonly chartMetrics = CHART_METRICS;

  // ── KPI cards ──────────────────────────────────────────────────────────────
  Math = Math;
  cards = computed(() => {
    const d = this.data();
    if (!d) return [];
    return [
      {
        id:       'views',
        label:    'Menu views',
        value:    d.totalViews,
        prev:     d.prevTotalViews,
        format:   'number',
        icon:     'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
        color:    'blue',
      },
      {
        id:       'visitors',
        label:    'Unique visitors',
        value:    d.uniqueVisitors,
        prev:     null,
        format:   'number',
        icon:     'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
        color:    'purple',
      },
      {
        id:       'orders',
        label:    'Total orders',
        value:    d.totalOrders,
        prev:     d.prevTotalOrders,
        format:   'number',
        icon:     'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
        color:    'amber',
      },
      {
        id:       'revenue',
        label:    'Revenue',
        value:    d.totalRevenue,
        prev:     d.prevTotalRevenue,
        format:   'currency',
        icon:     'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
        color:    'gold',
      },
      {
        id:       'aov',
        label:    'Avg. order value',
        value:    d.averageOrderValue,
        prev:     null,
        format:   'currency',
        icon:     'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
        color:    'green',
      },
      {
        id:       'conversion',
        label:    'Conversion rate',
        value:    d.conversionRate,
        prev:     null,
        format:   'percent',
        icon:     'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
        color:    'teal',
      },
    ];
  });

  // Device breakdown percentages
  deviceBreakdown = computed(() => {
    const d = this.data();
    if (!d) return null;
    const total = d.mobileViews + d.desktopViews + d.tabletViews;
    if (total === 0) return null;
    return {
      mobile:  Math.round((d.mobileViews  / total) * 100),
      desktop: Math.round((d.desktopViews / total) * 100),
      tablet:  Math.round((d.tabletViews  / total) * 100),
    };
  });

  // Chart data for the selected metric
  chartPoints = computed(() => {
    const stats  = this.data()?.dailyStats ?? [];
    const metric = this.chartMetric();
    return stats.map(s => ({
      label: this.formatChartLabel(s.date),
      value: s[metric] as number,
      stat:  s,
    }));
  });

  chartMax = computed(() => {
    const vals = this.chartPoints().map(p => p.value);
    return Math.max(...vals, 1);
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() { this.load(); }
  ngAfterViewInit() { /* chart drawn after data loads */ }

  // ── Load ───────────────────────────────────────────────────────────────────
  load() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.getSummary(this.period()).subscribe({
      next:  d => { this.data.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set('Failed to load analytics'); }
    });
  }

  setPeriod(p: Period) {
    if (this.period() === p) return;
    this.period.set(p);
    this.load();
  }

  setChartMetric(m: ChartMetric) { this.chartMetric.set(m); }

  // ── % change helper ────────────────────────────────────────────────────────
  getChange(current: number, prev: number | null): number | null {
    if (prev === null || prev === 0) return null;
    return Math.round(((current - prev) / prev) * 100);
  }

  changeIsPositive(change: number): boolean { return change > 0; }

  // ── Chart helpers ──────────────────────────────────────────────────────────
  getBarHeight(value: number): number {
    const max = this.chartMax();
    return max === 0 ? 0 : Math.max((value / max) * 100, value > 0 ? 3 : 0);
  }

  onBarHover(index: number, event: MouseEvent, stat: DailyStatsResponse) {
    this.hoveredIndex.set(index);
    const rect = (event.target as HTMLElement)
      .closest('.chart-bar-group')!
      .getBoundingClientRect();
    const chartRect = (event.target as HTMLElement)
      .closest('.chart-bars')!
      .getBoundingClientRect();
    this.tooltip.set({
      x: rect.left - chartRect.left + rect.width / 2,
      y: rect.top  - chartRect.top,
      stat
    });
  }

  onBarLeave() {
    this.hoveredIndex.set(null);
    this.tooltip.set(null);
  }

  // ── Formatters ─────────────────────────────────────────────────────────────
  formatValue(value: number, fmt: string): string {
    if (fmt === 'currency') return value.toFixed(3) + ' DT';
    if (fmt === 'percent')  return value.toFixed(1) + '%';
    if (value >= 1000)      return (value / 1000).toFixed(1) + 'k';
    return value.toString();
  }

  formatChartLabel(date: string): string {
    const d   = new Date(date);
    const p   = this.period();
    if (p === '7d')  return d.toLocaleDateString('en', { weekday: 'short' });
    if (p === '30d') return d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  }

  formatTooltipDate(date: string): string {
    return new Date(date).toLocaleDateString('en', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  }

  formatTooltipValue(stat: DailyStatsResponse): string {
    const metric = this.chartMetric();
    const value  = stat[metric] as number;
    if (metric === 'totalRevenue') return value.toFixed(3) + ' DT';
    return value.toString();
  }

  getMetricLabel(): string {
    return CHART_METRICS.find(m => m.value === this.chartMetric())?.label ?? '';
  }
}