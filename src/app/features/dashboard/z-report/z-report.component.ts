import {
  Component, OnInit, signal, computed, inject, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../pos/services/report.service';
import { ShiftService }  from '../../pos/services/shift.service';
import {
  RangeSummaryResponse, DailyRevenueRow, ZReportResponse
} from '../../pos/models/report.models';
import { Shift } from '../../pos/models/shift.models';
import { TranslatePipe } from '@ngx-translate/core';

type DatePreset = 'today' | 'week' | 'month' | 'custom';

@Component({
  selector: 'app-z-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TranslatePipe],
  templateUrl: './z-report.component.html',
  styleUrls:  ['./z-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZReportComponent implements OnInit {

  private reportSvc = inject(ReportService);
  private shiftSvc  = inject(ShiftService);

  // ── Date range ───────────────────────────────────────────────────────────
  preset     = signal<DatePreset>('week');
  customFrom = signal('');
  customTo   = signal('');

  activeFrom = computed(() => this.resolveFrom(this.preset()));
  activeTo   = computed(() => this.resolveTo(this.preset()));

  readonly presets: { value: DatePreset; label: string }[] = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week',  label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'custom', label: 'Personnalisé' },
  ];

  // ── Summary data ─────────────────────────────────────────────────────────
  summary        = signal<RangeSummaryResponse | null>(null);
  summaryLoading = signal(false);
  summaryError   = signal<string | null>(null);

  // ── Shift list ────────────────────────────────────────────────────────────
  shifts        = signal<Shift[]>([]);
  shiftsLoading = signal(false);
  shiftsPage    = signal(0);
  shiftsTotal   = signal(0);
  readonly PAGE_SIZE = 20;

  // ── Shift Z-report drawer ─────────────────────────────────────────────────
  selectedShift    = signal<Shift | null>(null);
  shiftZReport     = signal<ZReportResponse | null>(null);
  zReportLoading   = signal(false);
  drawerOpen       = signal(false);

  // ── Chart max for scaling bars ────────────────────────────────────────────
  chartMax = computed(() => {
    const rows = this.summary()?.dailyBreakdown ?? [];
    return Math.max(...rows.map(r => r.netRevenue), 1);
  });

  // ── KPI cards ─────────────────────────────────────────────────────────────
  kpis = computed(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      { label: 'Shifts',          value: String(s.totalShifts),           sub: null,                  icon: 'shifts' },
      { label: 'Commandes',       value: String(s.totalOrders),           sub: null,                  icon: 'orders' },
      { label: 'Revenus bruts',   value: this.fmt(s.grossRevenue),        sub: 'TND',                 icon: 'revenue' },
      { label: 'Revenus nets',    value: this.fmt(s.netRevenue),          sub: 'TND',                 icon: 'net' },
      { label: 'Espèces',         value: this.fmt(s.totalCashRevenue),    sub: 'TND',                 icon: 'cash' },
      { label: 'Carte',           value: this.fmt(s.totalCardRevenue),    sub: 'TND',                 icon: 'card' },
      { label: 'Remboursements',  value: this.fmt(s.totalRefunds),        sub: 'TND',                 icon: 'refund' },
      { label: 'Moy. / shift',    value: this.fmt(s.avgRevenuePerShift),  sub: 'TND',                 icon: 'avg' },
    ];
  });

  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.load();
  }

  // ── Load everything for the current date range ────────────────────────────
  load(): void {
    this.loadSummary();
    this.loadShifts(0);
  }

  loadSummary(): void {
    const from = this.activeFrom();
    const to   = this.activeTo();
    if (!from || !to) return;
    this.summaryLoading.set(true);
    this.summaryError.set(null);
    this.reportSvc.getRangeSummary(from, to).subscribe({
      next: res => {
        this.summaryLoading.set(false);
        if (res.success) this.summary.set(res.data);
      },
      error: err => {
        this.summaryLoading.set(false);
        this.summaryError.set(err?.error?.message ?? 'Erreur de chargement.');
      }
    });
  }

  loadShifts(page: number): void {
    this.shiftsLoading.set(true);
    this.shiftSvc.getShifts(page, this.PAGE_SIZE).subscribe({
      next: res => {
        this.shiftsLoading.set(false);
        if (res.success) {
          this.shifts.set(res.data.content);
          this.shiftsTotal.set(res.data.totalElements);
          this.shiftsPage.set(page);
        }
      },
      error: () => this.shiftsLoading.set(false)
    });
  }

  // ── Preset / date helpers ─────────────────────────────────────────────────
  setPreset(p: DatePreset): void {
    this.preset.set(p);
    if (p !== 'custom') this.load();
  }

  applyCustomRange(): void {
    if (this.customFrom() && this.customTo()) this.load();
  }

  private resolveFrom(p: DatePreset): string {
    if (p === 'custom') return this.customFrom();
    const d = new Date();
    if (p === 'today') return this.fmtDate(d);
    if (p === 'week')  { d.setDate(d.getDate() - 6); return this.fmtDate(d); }
    if (p === 'month') { d.setDate(1); return this.fmtDate(d); }
    return this.fmtDate(d);
  }

  private resolveTo(p: DatePreset): string {
    if (p === 'custom') return this.customTo();
    return this.fmtDate(new Date());
  }

  private fmtDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  // ── Open shift Z-report drawer ────────────────────────────────────────────
  openShiftReport(shift: Shift): void {
    this.selectedShift.set(shift);
    this.shiftZReport.set(null);
    this.drawerOpen.set(true);

    if (shift.status === 'CLOSED') {
      this.zReportLoading.set(true);
      this.reportSvc.getZReport(shift.id).subscribe({
        next: res => {
          this.zReportLoading.set(false);
          if (res.success) this.shiftZReport.set(res.data);
        },
        error: () => this.zReportLoading.set(false)
      });
    } else {
      // Open shift — use X report
      this.zReportLoading.set(true);
      this.reportSvc.getXReport().subscribe({
        next: res => {
          this.zReportLoading.set(false);
          if (res.success) this.shiftZReport.set({ shiftId: res.data.shiftId, report: res.data.report });
        },
        error: () => this.zReportLoading.set(false)
      });
    }
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedShift.set(null);
    this.shiftZReport.set(null);
  }

  printReport(): void { window.print(); }

  // ── Pagination ────────────────────────────────────────────────────────────
  get totalPages(): number { return Math.ceil(this.shiftsTotal() / this.PAGE_SIZE); }
  prevPage(): void { if (this.shiftsPage() > 0) this.loadShifts(this.shiftsPage() - 1); }
  nextPage(): void { if (this.shiftsPage() < this.totalPages - 1) this.loadShifts(this.shiftsPage() + 1); }

  // ── Helpers ───────────────────────────────────────────────────────────────
  fmt(n: number | null | undefined): string { return (n ?? 0).toFixed(3); }

  barWidth(row: DailyRevenueRow): number {
    const max = this.chartMax();
    return max > 0 ? Math.round((row.netRevenue / max) * 100) : 0;
  }

  discClass(d: number | null): string {
    if (!d || d === 0) return 'exact';
    return d < 0 ? 'short' : 'over';
  }

  discLabel(d: number | null): string {
    if (!d || d === 0) return 'Exact';
    return d < 0 ? `Court` : `Surplus`;
  }

  formatDuration(minutes: number | null): string {
    if (minutes === null) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  shiftStatusClass(shift: Shift): string {
    return shift.status === 'OPEN' ? 'open' : 'closed';
  }
}