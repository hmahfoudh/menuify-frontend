import {
  Component, OnInit, signal, computed, inject,
  AfterViewChecked, ElementRef, QueryList, ViewChildren
} from '@angular/core';
import { CommonModule }        from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import QRCode                  from 'qrcode';
import { QrCodeService }       from '../services/qr-code.service';
import { QrCodeResponse }      from '../models/qr.models';
import { AuthService }         from '../../../../core/services/auth.service';

@Component({
  selector:    'app-qr-codes',
  standalone:  true,
  imports:     [CommonModule, ReactiveFormsModule],
  templateUrl: './qr-codes.component.html',
  styleUrls:   ['./qr-codes.component.scss']
})
export class QrCodesComponent implements OnInit, AfterViewChecked {

  private svc  = inject(QrCodeService);
  private auth = inject(AuthService);
  private fb   = inject(FormBuilder);

  // Canvas refs — one per QR card in the grid
  @ViewChildren('qrCanvas') canvasRefs!: QueryList<ElementRef<HTMLCanvasElement>>;

  // Canvas ref for the preview modal
  @ViewChildren('previewCanvas')
  previewCanvasRef!: QueryList<ElementRef<HTMLCanvasElement>>;

  // ── State ───────────────────────────────────────────────────────────────────
  qrCodes      = signal<QrCodeResponse[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  deletingId   = signal<string | null>(null);
  panelOpen    = signal(false);
  previewQr    = signal<QrCodeResponse | null>(null);
  error        = signal<string | null>(null);
  success      = signal<string | null>(null);

  // Track which canvas IDs have already been rendered to avoid re-renders
  private renderedIds = new Set<string>();
  private previewRendered = false;

  totalScans = computed(() =>
    this.qrCodes().reduce((sum, qr) => sum + qr.scanCount, 0));

  tenant = this.auth.currentTenant;

  // ── Form ────────────────────────────────────────────────────────────────────
  form: FormGroup = this.fb.group({
    label:       [''],
    tableNumber: [''],
    colorDark:   ['#000000'],
    colorLight:  ['#ffffff'],
    embedLogo:   [true],
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit() { this.load(); }

  ngAfterViewChecked() {
    // Render QR codes into grid canvases after the view updates
    this.canvasRefs?.forEach((ref, i) => {
      const qr = this.qrCodes()[i];
      if (!qr || this.renderedIds.has(qr.id)) return;
      this.renderToCanvas(ref.nativeElement, qr);
      this.renderedIds.add(qr.id);
    });

    // Render preview canvas when modal opens
    if (this.previewQr() && !this.previewRendered) {
      const ref = this.previewCanvasRef?.first;
      if (ref) {
        this.renderToCanvas(ref.nativeElement, this.previewQr()!, 280);
        this.previewRendered = true;
      }
    }
  }

  // ── Data ─────────────────────────────────────────────────────────────────────
  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: qrs => {
        this.renderedIds.clear(); // reset so canvases re-render
        this.qrCodes.set(qrs);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load QR codes');
      }
    });
  }

  // ── Panel ─────────────────────────────────────────────────────────────────────
  openPanel() {
    this.form.reset({ colorDark: '#000000', colorLight: '#ffffff', embedLogo: true });
    this.panelOpen.set(true);
  }

  closePanel() { this.panelOpen.set(false); }

  // ── Create ────────────────────────────────────────────────────────────────────
  create() {
    this.saving.set(true);
    this.error.set(null);

    const v = this.form.value;
    this.svc.create({
      label:       v.label       || undefined,
      tableNumber: v.tableNumber || undefined,
      colorDark:   v.colorDark,
      colorLight:  v.colorLight,
      embedLogo:   v.embedLogo,
    }).subscribe({
      next: qr => {
        this.renderedIds.delete(qr.id); // allow canvas render for new item
        this.qrCodes.update(list => [qr, ...list]);
        this.saving.set(false);
        this.closePanel();
        this.openPreview(qr);
        this.showSuccess('QR code created');
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to create QR code');
        this.saving.set(false);
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  confirmDelete(qr: QrCodeResponse) {
    const label = qr.label ?? qr.code;
    if (!confirm(`Remove QR code "${label}"? Scans will stop working.`)) return;
    this.deletingId.set(qr.id);
    this.svc.delete(qr.id).subscribe({
      next: () => {
        this.renderedIds.delete(qr.id);
        this.qrCodes.update(list => list.filter(q => q.id !== qr.id));
        this.deletingId.set(null);
        if (this.previewQr()?.id === qr.id) this.closePreview();
      },
      error: () => {
        this.deletingId.set(null);
        this.error.set('Failed to delete QR code');
      }
    });
  }

  // ── Preview ───────────────────────────────────────────────────────────────────
  openPreview(qr: QrCodeResponse) {
    this.previewRendered = false; // allow canvas render in modal
    this.previewQr.set(qr);
  }

  closePreview() {
    this.previewQr.set(null);
    this.previewRendered = false;
  }

  // ── Downloads ─────────────────────────────────────────────────────────────────

  async downloadPng(qr: QrCodeResponse) {
    try {
      const dataUrl = await QRCode.toDataURL(qr.targetUrl, {
        width:  1024,   // high resolution for print quality
        margin: 2,
        color:  { dark: qr.colorDark || '#000000', light: qr.colorLight || '#ffffff' },
      });
      this.triggerDownload(dataUrl, `qr-${qr.label ?? qr.code}.png`);
    } catch {
      this.error.set('Failed to generate PNG');
    }
  }

  async downloadSvg(qr: QrCodeResponse) {
    try {
      const svg = await QRCode.toString(qr.targetUrl, {
        type:   'svg',
        margin: 2,
        color:  { dark: qr.colorDark || '#000000', light: qr.colorLight || '#ffffff' },
      });
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      this.triggerDownload(url, `qr-${qr.label ?? qr.code}.svg`);
      URL.revokeObjectURL(url);
    } catch {
      this.error.set('Failed to generate SVG');
    }
  }

  copyLink(qr: QrCodeResponse) {
    navigator.clipboard.writeText(qr.targetUrl).then(() => {
      this.showSuccess('Link copied to clipboard');
    });
  }

  // ── Canvas rendering ──────────────────────────────────────────────────────────

  private async renderToCanvas(
    canvas: HTMLCanvasElement,
    qr: QrCodeResponse,
    size = 160
  ) {
    try {
      await QRCode.toCanvas(canvas, qr.targetUrl, {
        width:  size,
        margin: 1,
        color:  { dark: qr.colorDark || '#000000', light: qr.colorLight || '#ffffff' },
      });
    } catch (err) {
      console.error('QR render failed', err);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  private triggerDownload(url: string, filename: string) {
    const a = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
  }

  private showSuccess(msg: string) {
    this.success.set(msg);
    setTimeout(() => this.success.set(null), 3000);
  }
}