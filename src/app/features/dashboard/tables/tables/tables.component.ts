import {
  Component, OnInit, signal, computed, inject,
} from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { HttpClient }     from '@angular/common/http';
import { map }            from 'rxjs/operators';
import { QRCodeModule }   from 'angularx-qrcode';
import QRCode             from 'qrcode';
import JSZip              from 'jszip';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

// ── Models ────────────────────────────────────────────────────────────────────

type TableShape  = 'SQUARE' | 'RECTANGLE' | 'ROUND';
type TableStatus = 'FREE' | 'PENDING' | 'PREPARING' | 'READY';
type PanelMode   = 'create' | 'edit';

interface TableResponse {
  id:           string;
  number:       number;
  label:        string | null;
  displayName:  string;
  seats:        number;
  shape:        TableShape;
  active:       boolean;
  // QR fields
  qrCode:       string;
  qrTargetUrl:  string;
  qrColorDark:  string;
  qrColorLight: string;
  qrEmbedLogo:  boolean;
  qrScanCount:  number;
}

interface TableStatusResponse extends TableResponse {
  status:         TableStatus;
  orderId:        string | null;
  orderReference: string | null;
}

@Component({
  selector:    'app-tables',
  standalone:  true,
  imports:     [CommonModule, FormsModule, QRCodeModule],
  templateUrl: './tables.component.html',
  styleUrls:   ['./tables.component.scss'],
})
export class TablesComponent implements OnInit {

  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private base    = `${environment.apiUrl}/api/dashboard/tables`;
  private posBase = `${environment.apiUrl}/api/pos/tables/status`;

  // ── Data ────────────────────────────────────────────────────────────────────
  tables       = signal<TableResponse[]>([]);
  tableStatus  = signal<TableStatusResponse[]>([]);
  loading      = signal(true);
  error        = signal<string | null>(null);
  success      = signal<string | null>(null);

  tenant = this.auth.currentTenant;

  totalScans = computed(() =>
    this.tables().reduce((sum, t) => sum + t.qrScanCount, 0));

  // ── Panel ───────────────────────────────────────────────────────────────────
  panelOpen  = signal(false);
  panelMode  = signal<PanelMode>('create');
  saving     = signal(false);
  editingId  = signal<string | null>(null);

  // ── Form fields (signals) ───────────────────────────────────────────────────
  fNumber     = signal<number | null>(null);
  fLabel      = signal('');
  fSeats      = signal(2);
  fShape      = signal<TableShape>('RECTANGLE');
  fActive     = signal(true);
  fColorDark  = signal('#000000');
  fColorLight = signal('#ffffff');
  fEmbedLogo  = signal(true);

  // ── QR preview modal ───────────────────────────────────────────────────────
  previewTable = signal<TableResponse | null>(null);
  downloadingAll = signal(false);

  // ── Shape options ──────────────────────────────────────────────────────────
  shapes: { value: TableShape; label: string }[] = [
    { value: 'RECTANGLE', label: 'Rectangle' },
    { value: 'ROUND',     label: 'Round' },
    { value: 'SQUARE',    label: 'Square' },
  ];

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.http.get<any>(this.posBase).pipe(map(r => r.data))
      .subscribe({
        next: (list: TableStatusResponse[]) => {
          this.tableStatus.set(list);
          this.tables.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.http.get<any>(this.base).pipe(map(r => r.data)).subscribe({
            next: list => { this.tables.set(list); this.loading.set(false); },
            error: ()  => { this.loading.set(false); this.error.set('Failed to load tables'); }
          });
        }
      });
  }

  // ── Panel open/close ────────────────────────────────────────────────────────
  openCreate(): void {
    const nextNum = this.tables().length > 0
      ? Math.max(...this.tables().map(t => t.number)) + 1
      : 1;
    this.fNumber.set(nextNum);
    this.fLabel.set('');
    this.fSeats.set(2);
    this.fShape.set('RECTANGLE');
    this.fActive.set(true);
    this.fColorDark.set('#000000');
    this.fColorLight.set('#ffffff');
    this.fEmbedLogo.set(true);
    this.editingId.set(null);
    this.panelMode.set('create');
    this.error.set(null);
    this.panelOpen.set(true);
  }

  openEdit(t: TableResponse): void {
    this.fNumber.set(t.number);
    this.fLabel.set(t.label ?? '');
    this.fSeats.set(t.seats);
    this.fShape.set(t.shape);
    this.fActive.set(t.active);
    this.fColorDark.set(t.qrColorDark || '#000000');
    this.fColorLight.set(t.qrColorLight || '#ffffff');
    this.fEmbedLogo.set(t.qrEmbedLogo);
    this.editingId.set(t.id);
    this.panelMode.set('edit');
    this.error.set(null);
    this.panelOpen.set(true);
  }

  closePanel(): void { this.panelOpen.set(false); }

  // ── Save (create / update) ──────────────────────────────────────────────────
  save(): void {
    const num = this.fNumber();
    if (!num || num < 1) { this.error.set('Table number is required'); return; }

    this.saving.set(true);
    this.error.set(null);

    const req = {
      number:       num,
      label:        this.fLabel().trim() || null,
      seats:        this.fSeats(),
      shape:        this.fShape(),
      active:       this.fActive(),
      qrColorDark:  this.fColorDark(),
      qrColorLight: this.fColorLight(),
      qrEmbedLogo:  this.fEmbedLogo(),
    };

    const call$ = this.panelMode() === 'create'
      ? this.http.post<any>(this.base, req)
      : this.http.put<any>(`${this.base}/${this.editingId()}`, req);

    call$.pipe(map(r => r.data)).subscribe({
      next: (saved: TableResponse) => {
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

  // ── Delete ──────────────────────────────────────────────────────────────────
  delete(id: string, displayName: string): void {
    if (!confirm(`Remove ${displayName}? This cannot be undone.`)) return;
    this.http.delete(`${this.base}/${id}`).subscribe({
      next: () => {
        this.tables.update(list => list.filter(t => t.id !== id));
        if (this.previewTable()?.id === id) this.closePreview();
        this.showSuccess('Table removed');
      },
      error: () => this.error.set('Failed to delete table')
    });
  }

  // ── QR regeneration ────────────────────────────────────────────────────────
  regenerateQr(t: TableResponse): void {
    if (!confirm(`Regenerate QR for ${t.displayName}? Old QR codes will stop working.`)) return;
    this.http.post<any>(`${this.base}/${t.id}/qr/regenerate`, {}).pipe(map(r => r.data))
      .subscribe({
        next: (saved: TableResponse) => {
          this.tables.update(list =>
            list.map(x => x.id === saved.id ? saved : x));
          if (this.previewTable()?.id === saved.id) this.previewTable.set(saved);
          this.showSuccess('QR code regenerated');
        },
        error: () => this.error.set('Failed to regenerate QR')
      });
  }

  // ── QR preview modal ──────────────────────────────────────────────────────
  openPreview(t: TableResponse): void  { this.previewTable.set(t); }
  closePreview(): void                 { this.previewTable.set(null); }

  // ── Downloads ─────────────────────────────────────────────────────────────
  async downloadPng(t: TableResponse): Promise<void> {
    try {
      const size = 1024;
      const canvas = document.createElement('canvas');
      canvas.width  = size;
      canvas.height = size;

      await QRCode.toCanvas(canvas, t.qrTargetUrl, {
        width:                size,
        margin:               2,
        errorCorrectionLevel: 'H',
        color: { dark: t.qrColorDark || '#000000', light: t.qrColorLight || '#ffffff' },
      });

      const logoUrl = t.qrEmbedLogo ? this.tenant()?.logoUrl : null;
      if (logoUrl) {
        const ctx      = canvas.getContext('2d')!;
        const logo     = await this.loadImage(logoUrl);
        const logoSize = Math.round(size * 0.2);
        const x        = (size - logoSize) / 2;
        const y        = (size - logoSize) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 6, y - 6, logoSize + 12, logoSize + 12);
        ctx.drawImage(logo, x, y, logoSize, logoSize);
      }

      this.triggerDownload(canvas.toDataURL('image/png'), `qr-${t.displayName}.png`);
    } catch {
      this.error.set('Failed to generate PNG');
    }
  }

  async downloadSvg(t: TableResponse): Promise<void> {
    try {
      const svg = await QRCode.toString(t.qrTargetUrl, {
        type:   'svg',
        margin: 2,
        color: { dark: t.qrColorDark || '#000000', light: t.qrColorLight || '#ffffff' },
      });
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      this.triggerDownload(url, `qr-${t.displayName}.svg`);
      URL.revokeObjectURL(url);
    } catch {
      this.error.set('Failed to generate SVG');
    }
  }

  copyLink(t: TableResponse): void {
    navigator.clipboard.writeText(t.qrTargetUrl).then(() =>
      this.showSuccess('Link copied to clipboard'));
  }

  // ── Download all QR codes as ZIP ──────────────────────────────────────────
  async downloadAllQr(): Promise<void> {
    const list = this.tables();
    if (list.length === 0) return;

    this.downloadingAll.set(true);
    this.error.set(null);

    try {
      const zip = new JSZip();
      const size = 1024;

      for (const t of list) {
        const canvas = document.createElement('canvas');
        canvas.width  = size;
        canvas.height = size;

        await QRCode.toCanvas(canvas, t.qrTargetUrl, {
          width:                size,
          margin:               2,
          errorCorrectionLevel: 'H',
          color: {
            dark:  t.qrColorDark  || '#000000',
            light: t.qrColorLight || '#ffffff',
          },
        });

        const logoUrl = t.qrEmbedLogo ? this.tenant()?.logoUrl : null;
        if (logoUrl) {
          try {
            const ctx      = canvas.getContext('2d')!;
            const logo     = await this.loadImage(logoUrl);
            const logoSize = Math.round(size * 0.2);
            const x        = (size - logoSize) / 2;
            const y        = (size - logoSize) / 2;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 6, y - 6, logoSize + 12, logoSize + 12);
            ctx.drawImage(logo, x, y, logoSize, logoSize);
          } catch {
            // Skip logo on error, QR is still valid
          }
        }

        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob(b => resolve(b!), 'image/png')
        );
        const name = `${t.displayName.replace(/[^a-zA-Z0-9-_]/g, '_')}-qr.png`;
        zip.file(name, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      this.triggerDownload(url, 'qr-codes-all.zip');
      URL.revokeObjectURL(url);

      this.showSuccess(`${list.length} QR codes downloaded`);
    } catch {
      this.error.set('Failed to generate QR codes ZIP');
    } finally {
      this.downloadingAll.set(false);
    }
  }

  // ── Status helpers ────────────────────────────────────────────────────────
  statusOf(id: string): TableStatus {
    return this.tableStatus().find(t => t.id === id)?.status ?? 'FREE';
  }

  orderRefOf(id: string): string | null {
    return this.tableStatus().find(t => t.id === id)?.orderReference ?? null;
  }

  // ── Shape icon helper ──────────────────────────────────────────────────────
  shapeIcon(shape: TableShape): string {
    switch (shape) {
      case 'ROUND':     return '⬤';
      case 'SQUARE':    return '⬜';
      case 'RECTANGLE': return '▬';
    }
  }

  // ── Form setters ──────────────────────────────────────────────────────────
  setNumber(v: string):  void { this.fNumber.set(+v || null); }
  setLabel(v: string):   void { this.fLabel.set(v); }
  setSeats(v: string):   void { this.fSeats.set(Math.max(1, +v || 1)); }
  setShape(v: string):   void { this.fShape.set(v as TableShape); }
  toggleActive():        void { this.fActive.update(v => !v); }
  toggleEmbedLogo():     void { this.fEmbedLogo.update(v => !v); }

  // ── Private helpers ───────────────────────────────────────────────────────
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private triggerDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
  }

  private showSuccess(msg: string): void {
    this.success.set(msg);
    setTimeout(() => this.success.set(null), 3000);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }
}