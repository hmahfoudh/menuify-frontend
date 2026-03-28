import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators
} from '@angular/forms';
import { QrCodeService }  from '../services/qr-code.service';
import { QrCodeResponse } from '../models/qr.models';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector:    'app-qr-codes',
  standalone:  true,
  imports:     [CommonModule, ReactiveFormsModule],
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

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next:  qrs => { this.qrCodes.set(qrs); this.loading.set(false); },
      error: ()  => { this.loading.set(false); this.error.set('Failed to load QR codes'); }
    });
  }

  // ── Panel ────────────────────────────────────────────────────────────────────
  openPanel() {
    this.form.reset({
      colorDark:  '#000000',
      colorLight: '#ffffff',
      embedLogo:  true,
    });
    this.panelOpen.set(true);
  }

  closePanel() { this.panelOpen.set(false); }

  // ── Create ───────────────────────────────────────────────────────────────────
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
        this.previewQr.set(qr);
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
      next:  () => {
        this.qrCodes.update(list => list.filter(q => q.id !== qr.id));
        this.deletingId.set(null);
        if (this.previewQr()?.id === qr.id) this.previewQr.set(null);
      },
      error: () => {
        this.deletingId.set(null);
        this.error.set('Failed to delete QR code');
      }
    });
  }

  // ── Preview / Download ────────────────────────────────────────────────────────
  openPreview(qr: QrCodeResponse) { this.previewQr.set(qr); }
  closePreview()                   { this.previewQr.set(null); }

  downloadPng(qr: QrCodeResponse) {
    if (!qr.imageUrlPng) return;
    this.triggerDownload(qr.imageUrlPng, `qr-${qr.code}.png`);
  }

  downloadSvg(qr: QrCodeResponse) {
    if (!qr.imageUrlSvg) return;
    this.triggerDownload(qr.imageUrlSvg, `qr-${qr.code}.svg`);
  }

  copyLink(qr: QrCodeResponse) {
    navigator.clipboard.writeText(qr.targetUrl).then(() => {
      this.showSuccess('Link copied to clipboard');
    });
  }

  private triggerDownload(url: string, filename: string) {
    const a = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.target   = '_blank';
    a.click();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  private showSuccess(msg: string) {
    this.success.set(msg);
    setTimeout(() => this.success.set(null), 3000);
  }
}