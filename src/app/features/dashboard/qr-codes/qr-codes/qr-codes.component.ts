import {
  Component, OnInit, signal, computed, inject,
} from '@angular/core';
import { CommonModule }        from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import QRCode                  from 'qrcode';
import { QrCodeService }       from '../services/qr-code.service';
import { QrCodeResponse }      from '../models/qr.models';
import { AuthService }         from '../../../../core/services/auth.service';
import { QRCodeModule } from 'angularx-qrcode';

@Component({
  selector:    'app-qr-codes',
  standalone:  true,
  imports:     [CommonModule, ReactiveFormsModule, QRCodeModule],
  templateUrl: './qr-codes.component.html',
  styleUrls:   ['./qr-codes.component.scss']
})
export class QrCodesComponent implements OnInit {

  private svc  = inject(QrCodeService);
  private auth = inject(AuthService);
  private fb   = inject(FormBuilder);

  // ── State ───────────────────────────────────────────────────────────────────
  qrCodes      = signal<QrCodeResponse[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  deletingId   = signal<string | null>(null);
  panelOpen    = signal(false);
  previewQr    = signal<QrCodeResponse | null>(null);
  error        = signal<string | null>(null);
  success      = signal<string | null>(null);

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

  // ── Data ─────────────────────────────────────────────────────────────────────
  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: qrs => {
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
    this.previewQr.set(qr);
  }

  closePreview() {
    this.previewQr.set(null);
  }

  // ── Downloads ─────────────────────────────────────────────────────────────────

  async downloadPng(qr: QrCodeResponse) {
    try {
      const size = 1024;
      const canvas = document.createElement('canvas');
      canvas.width  = size;
      canvas.height = size;

      await QRCode.toCanvas(canvas, qr.targetUrl, {
        width:                size,
        margin:               2,
        errorCorrectionLevel: 'H',
        color: { dark: qr.colorDark || '#000000', light: qr.colorLight || '#ffffff' },
      });

      const logoUrl = qr.embedLogo ? this.tenant()?.logoUrl : null;
      if (logoUrl) {
        const ctx      = canvas.getContext('2d')!;
        const logo     = await this.loadImage(logoUrl);
        const logoSize = Math.round(size * 0.2);
        const x        = (size - logoSize) / 2;
        const y        = (size - logoSize) / 2;

        // White backing so the logo is readable on any QR color
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 6, y - 6, logoSize + 12, logoSize + 12);
        ctx.drawImage(logo, x, y, logoSize, logoSize);
      }

      this.triggerDownload(canvas.toDataURL('image/png'), `qr-${qr.label ?? qr.code}.png`);
    } catch {
      this.error.set('Failed to generate PNG');
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
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