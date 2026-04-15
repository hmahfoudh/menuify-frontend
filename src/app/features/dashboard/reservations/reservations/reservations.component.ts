import {
  Component, OnInit, signal, computed, inject,
} from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { HttpClient }    from '@angular/common/http';
import { map }           from 'rxjs/operators';
import { environment }   from '../../../../../environments/environment';

type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
type ReservationType   = 'NORMAL' | 'ANNIVERSARY' | 'EVENT';
type FilterTab         = 'ALL' | ReservationStatus;

interface ReservationResponse {
  id:               string;
  reference:        string;
  fullName:         string;
  phoneNumber:      string;
  seats:            number;
  type:             ReservationType;
  date:             string;
  time:             string;
  notes:            string | null;
  status:           ReservationStatus;
  tableId:          string | null;
  tableDisplayName: string | null;
  createdAt:        string;
}

interface TableOption {
  id:          string;
  number:      number;
  displayName: string;
  seats:       number;
}

@Component({
  selector:    'app-reservations',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './reservations.component.html',
  styleUrls:   ['./reservations.component.scss'],
})
export class ReservationsComponent implements OnInit {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/dashboard/reservations`;

  // ── Data ────────────────────────────────────────────────────────────────
  reservations = signal<ReservationResponse[]>([]);
  tables       = signal<TableOption[]>([]);
  loading      = signal(true);
  error        = signal<string | null>(null);
  success      = signal<string | null>(null);

  // ── Filters ─────────────────────────────────────────────────────────────
  activeTab    = signal<FilterTab>('ALL');
  dateFrom     = signal('');
  dateTo       = signal('');

  tabs: { value: FilterTab; label: string }[] = [
    { value: 'ALL',       label: 'All' },
    { value: 'PENDING',   label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'REJECTED',  label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  filteredReservations = computed(() => {
    const tab  = this.activeTab();
    const list = this.reservations();
    if (tab === 'ALL') return list;
    return list.filter(r => r.status === tab);
  });

  pendingCount = computed(() =>
    this.reservations().filter(r => r.status === 'PENDING').length);

  todayCount = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.reservations().filter(r =>
      r.date === today && (r.status === 'PENDING' || r.status === 'CONFIRMED')
    ).length;
  });

  // ── Detail panel ────────────────────────────────────────────────────────
  selectedRes    = signal<ReservationResponse | null>(null);
  panelOpen      = signal(false);
  actionLoading  = signal(false);

  // ── Table assignment ────────────────────────────────────────────────────
  assigningTable = signal(false);
  selectedTableId = signal<string>('');

  // ── Lifecycle ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.load();
    this.loadTables();
  }

  // ── Load data ───────────────────────────────────────────────────────────
  load(): void {
    this.loading.set(true);

    let url = this.base;
    const params: string[] = [];
    if (this.dateFrom()) params.push(`from=${this.dateFrom()}`);
    if (this.dateTo())   params.push(`to=${this.dateTo()}`);
    if (params.length)   url += '?' + params.join('&');

    this.http.get<any>(url).pipe(map(r => r.data)).subscribe({
      next: list => {
        this.reservations.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load reservations');
      }
    });
  }

  private loadTables(): void {
    this.http.get<any>(`${environment.apiUrl}/api/dashboard/tables`)
      .pipe(map(r => r.data))
      .subscribe({
        next: list => this.tables.set(list),
        error: () => {} // non-critical
      });
  }

  // ── Filter actions ──────────────────────────────────────────────────────
  setTab(tab: FilterTab): void {
    this.activeTab.set(tab);
  }

  applyDateFilter(): void {
    this.load();
  }

  clearDateFilter(): void {
    this.dateFrom.set('');
    this.dateTo.set('');
    this.load();
  }

  // ── Detail panel ────────────────────────────────────────────────────────
  openDetail(r: ReservationResponse): void {
    this.selectedRes.set(r);
    this.selectedTableId.set(r.tableId ?? '');
    this.assigningTable.set(false);
    this.error.set(null);
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  // ── Status transitions ──────────────────────────────────────────────────
  confirm(r: ReservationResponse): void   { this.updateStatus(r.id, 'CONFIRMED'); }
  reject(r: ReservationResponse): void    { this.updateStatus(r.id, 'REJECTED'); }
  complete(r: ReservationResponse): void  { this.updateStatus(r.id, 'COMPLETED'); }
  cancel(r: ReservationResponse): void    { this.updateStatus(r.id, 'CANCELLED'); }

  private updateStatus(id: string, status: ReservationStatus): void {
    this.actionLoading.set(true);
    this.error.set(null);

    this.http.put<any>(`${this.base}/${id}/status`, { status })
      .pipe(map(r => r.data))
      .subscribe({
        next: (updated: ReservationResponse) => {
          this.reservations.update(list =>
            list.map(r => r.id === updated.id ? updated : r));
          this.selectedRes.set(updated);
          this.actionLoading.set(false);
          this.showSuccess(`Reservation ${status.toLowerCase()}`);
        },
        error: err => {
          this.actionLoading.set(false);
          this.error.set(err?.error?.message ?? 'Failed to update status');
        }
      });
  }

  // ── Table assignment ────────────────────────────────────────────────────
  showAssignTable(): void {
    this.assigningTable.set(true);
  }

  assignTable(): void {
    const res = this.selectedRes();
    const tableId = this.selectedTableId();
    if (!res || !tableId) return;

    this.actionLoading.set(true);
    this.http.put<any>(`${this.base}/${res.id}/assign-table`, { tableId })
      .pipe(map(r => r.data))
      .subscribe({
        next: (updated: ReservationResponse) => {
          this.reservations.update(list =>
            list.map(r => r.id === updated.id ? updated : r));
          this.selectedRes.set(updated);
          this.assigningTable.set(false);
          this.actionLoading.set(false);
          this.showSuccess('Table assigned');
        },
        error: err => {
          this.actionLoading.set(false);
          this.error.set(err?.error?.message ?? 'Failed to assign table');
        }
      });
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  delete(r: ReservationResponse): void {
    if (!confirm(`Delete reservation ${r.reference}? This cannot be undone.`)) return;

    this.http.delete(`${this.base}/${r.id}`).subscribe({
      next: () => {
        this.reservations.update(list => list.filter(x => x.id !== r.id));
        this.closePanel();
        this.showSuccess('Reservation deleted');
      },
      error: () => this.error.set('Failed to delete reservation')
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  statusLabel(s: string): string {
    return s.charAt(0) + s.slice(1).toLowerCase();
  }

  statusClass(s: string): string {
    switch (s) {
      case 'CONFIRMED':
      case 'COMPLETED': return 'st--green';
      case 'REJECTED':
      case 'CANCELLED': return 'st--red';
      default:          return 'st--gold';
    }
  }

  typeIcon(t: ReservationType): string {
    switch (t) {
      case 'ANNIVERSARY': return '🎂';
      case 'EVENT':       return '🎉';
      default:            return '🍽️';
    }
  }

  formatDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  }

  formatTime(t: string): string {
    const [h, m] = t.split(':');
    const hour = +h;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  }

  canConfirm(r: ReservationResponse): boolean  { return r.status === 'PENDING'; }
  canReject(r: ReservationResponse): boolean   { return r.status === 'PENDING'; }
  canComplete(r: ReservationResponse): boolean { return r.status === 'CONFIRMED'; }
  canCancel(r: ReservationResponse): boolean   { return r.status === 'CONFIRMED'; }

  private showSuccess(msg: string): void {
    this.success.set(msg);
    setTimeout(() => this.success.set(null), 3000);
  }
}