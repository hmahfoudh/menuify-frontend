import {
  Component, OnInit, signal, inject
} from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { HttpClient }      from '@angular/common/http';
import { map }             from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

interface StaffResponse {
  id:        string;
  name:      string;
  color:     string | null;
  active:    boolean;
  createdAt: string;
}

interface StaffRequest {
  name:   string;
  pin:    string;
  color:  string;
  active: boolean;
}

type PanelMode = 'create' | 'edit';

const PRESET_COLORS = [
  '#c9a96e','#64c882','#5a9cf5','#e8a838',
  '#c85050','#a064dc','#3cbeb4','#dc6496',
];

@Component({
  selector:    'app-staff',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './staff.component.html',
  styleUrls:   ['./staff.component.scss'],
})
export class StaffComponent implements OnInit {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/dashboard/staff`;

  // ── Data ────────────────────────────────────────────────────────────────────
  staff      = signal<StaffResponse[]>([]);
  loading    = signal(true);
  error      = signal<string | null>(null);
  success    = signal<string | null>(null);

  // ── Panel ───────────────────────────────────────────────────────────────────
  panelOpen  = signal(false);
  panelMode  = signal<PanelMode>('create');
  saving     = signal(false);
  editingId  = signal<string | null>(null);

  // ── Form fields ─────────────────────────────────────────────────────────────
  fName      = signal('');
  fPin       = signal('');
  fColor     = signal(PRESET_COLORS[0]);
  fActive    = signal(true);
  showPin    = signal(false);

  readonly presetColors = PRESET_COLORS;

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.http.get<any>(this.base).pipe(map(r => r.data))
      .subscribe({
        next: list => { this.staff.set(list); this.loading.set(false); },
        error: ()  => { this.loading.set(false); this.error.set('Failed to load staff'); }
      });
  }

  // ── Panel open/close ─────────────────────────────────────────────────────────
  openCreate(): void {
    this.fName.set('');
    this.fPin.set('');
    this.fColor.set(PRESET_COLORS[0]);
    this.fActive.set(true);
    this.editingId.set(null);
    this.panelMode.set('create');
    this.error.set(null);
    this.panelOpen.set(true);
  }

  openEdit(s: StaffResponse): void {
    this.fName.set(s.name);
    this.fPin.set('');           // PIN never pre-filled
    this.fColor.set(s.color ?? PRESET_COLORS[0]);
    this.fActive.set(s.active);
    this.editingId.set(s.id);
    this.panelMode.set('edit');
    this.error.set(null);
    this.panelOpen.set(true);
  }

  closePanel(): void { this.panelOpen.set(false); }

  // ── Save ─────────────────────────────────────────────────────────────────────
  save(): void {
    if (!this.fName().trim()) return;
    if (this.panelMode() === 'create' && this.fPin().length !== 4) {
      this.error.set('PIN must be exactly 4 digits');
      return;
    }
    if (this.fPin() && !/^\d{4}$/.test(this.fPin())) {
      this.error.set('PIN must be exactly 4 digits');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const req: StaffRequest = {
      name:   this.fName().trim(),
      pin:    this.fPin(),
      color:  this.fColor(),
      active: this.fActive(),
    };

    const call$ = this.panelMode() === 'create'
      ? this.http.post<any>(this.base, req)
      : this.http.put<any>(`${this.base}/${this.editingId()}`, req);

    call$.pipe(map(r => r.data)).subscribe({
      next: saved => {
        this.saving.set(false);
        if (this.panelMode() === 'create') {
          this.staff.update(list => [...list, saved]);
          this.showSuccess('Staff member created');
        } else {
          this.staff.update(list => list.map(s => s.id === saved.id ? saved : s));
          this.showSuccess('Staff member updated');
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
  delete(id: string): void {
    if (!confirm('Remove this staff member?')) return;
    this.http.delete(`${this.base}/${id}`).subscribe({
      next: () => {
        this.staff.update(list => list.filter(s => s.id !== id));
        this.showSuccess('Staff member removed');
      },
      error: () => this.error.set('Failed to delete')
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  initial(name: string): string { return name.charAt(0).toUpperCase(); }

  pinPlaceholder(): string {
    return this.panelMode() === 'create' ? '4-digit PIN (required)' : 'New PIN (leave blank to keep)';
  }

  private showSuccess(msg: string): void {
    this.success.set(msg);
    setTimeout(() => this.success.set(null), 3000);
  }

  setColor(c: string): void { this.fColor.set(c); }
  setName(v: string):  void { this.fName.set(v); }
  setPin(v: string):   void { this.fPin.set(v.replace(/\D/g, '').slice(0, 4)); }
  toggleActive():      void { this.fActive.update(v => !v); }
  toggleShowPin():     void { this.showPin.update(v => !v); }
}