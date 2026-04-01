import {
  Component, OnInit, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { HttpClient }   from '@angular/common/http';
import { map }          from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

interface TableResponse {
  id:          string;
  number:      number;
  label:       string | null;
  displayName: string;
  active:      boolean;
}

interface TableStatusResponse extends TableResponse {
  status:         'FREE' | 'PENDING' | 'PREPARING' | 'READY';
  activeOrderRef: string | null;
}

type PanelMode = 'create' | 'edit';

@Component({
  selector:    'app-tables',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './tables.component.html',
  styleUrls:   ['./tables.component.scss'],
})
export class TablesComponent implements OnInit {

  private http  = inject(HttpClient);
  private base  = `${environment.apiUrl}/api/dashboard/tables`;
  private posBase = `${environment.apiUrl}/api/pos/tables/status`;

  // ── Data ────────────────────────────────────────────────────────────────────
  tables       = signal<TableResponse[]>([]);
  tableStatus  = signal<TableStatusResponse[]>([]);
  loading      = signal(true);
  error        = signal<string | null>(null);
  success      = signal<string | null>(null);

  // ── Panel ───────────────────────────────────────────────────────────────────
  panelOpen    = signal(false);
  panelMode    = signal<PanelMode>('create');
  saving       = signal(false);
  editingId    = signal<string | null>(null);

  // ── Form fields ─────────────────────────────────────────────────────────────
  fNumber      = signal<number | null>(null);
  fLabel       = signal('');
  fActive      = signal(true);

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.http.get<any>(this.posBase).pipe(map(r => r.data))
      .subscribe({
        next: list => {
          this.tableStatus.set(list);
          this.tables.set(list);
          this.loading.set(false);
        },
        error: () => {
          // Fall back to plain table list if pos status fails
          this.http.get<any>(this.base).pipe(map(r => r.data)).subscribe({
            next: list => { this.tables.set(list); this.loading.set(false); },
            error: ()  => { this.loading.set(false); this.error.set('Failed to load tables'); }
          });
        }
      });
  }

  // ── Panel ────────────────────────────────────────────────────────────────────
  openCreate(): void {
    const nextNum = this.tables().length > 0
      ? Math.max(...this.tables().map(t => t.number)) + 1
      : 1;
    this.fNumber.set(nextNum);
    this.fLabel.set('');
    this.fActive.set(true);
    this.editingId.set(null);
    this.panelMode.set('create');
    this.error.set(null);
    this.panelOpen.set(true);
  }

  openEdit(t: TableResponse): void {
    this.fNumber.set(t.number);
    this.fLabel.set(t.label ?? '');
    this.fActive.set(t.active);
    this.editingId.set(t.id);
    this.panelMode.set('edit');
    this.error.set(null);
    this.panelOpen.set(true);
  }

  closePanel(): void { this.panelOpen.set(false); }

  // ── Save ─────────────────────────────────────────────────────────────────────
  save(): void {
    const num = this.fNumber();
    if (!num || num < 1) { this.error.set('Table number is required'); return; }

    this.saving.set(true);
    this.error.set(null);

    const req = {
      number: num,
      label:  this.fLabel().trim() || null,
      active: this.fActive(),
    };

    const call$ = this.panelMode() === 'create'
      ? this.http.post<any>(this.base, req)
      : this.http.put<any>(`${this.base}/${this.editingId()}`, req);

    call$.pipe(map(r => r.data)).subscribe({
      next: saved => {
        this.saving.set(false);
        if (this.panelMode() === 'create') {
          this.tables.update(list => [...list, saved].sort((a, b) => a.number - b.number));
          this.showSuccess('Table created');
        } else {
          this.tables.update(list =>
            list.map(t => t.id === saved.id ? saved : t)
                .sort((a, b) => a.number - b.number)
          );
          this.showSuccess('Table updated');
        }
        this.closePanel();
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to save');
      }
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  delete(id: string, displayName: string): void {
    if (!confirm(`Remove ${displayName}? This cannot be undone.`)) return;
    this.http.delete(`${this.base}/${id}`).subscribe({
      next: () => {
        this.tables.update(list => list.filter(t => t.id !== id));
        this.showSuccess('Table removed');
      },
      error: () => this.error.set('Failed to delete table')
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  statusOf(id: string): TableStatusResponse['status'] {
    return this.tableStatus().find(t => t.id === id)?.status ?? 'FREE';
  }

  orderRefOf(id: string): string | null {
    return this.tableStatus().find(t => t.id === id)?.activeOrderRef ?? null;
  }

  private showSuccess(msg: string): void {
    this.success.set(msg);
    setTimeout(() => this.success.set(null), 3000);
  }

  setNumber(v: string): void { this.fNumber.set(+v || null); }
  setLabel(v: string):  void { this.fLabel.set(v); }
  toggleActive():       void { this.fActive.update(v => !v); }
}