import {
  Component, OnInit, OnDestroy, signal,
  computed, inject, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { ThemeService }   from '../services/theme.service';
import {
  TenantThemeResponse, TemplateResponse,
  PresetResponse, TOKEN_FIELDS, TokenField,
  getTokenValue, setTokenValue, tokensToCssVars
} from '../models/theme.models';
import { debounceTime, Subject } from 'rxjs';
import { takeUntil }             from 'rxjs/operators';
import { TrustedUrlPipe } from '../pipes/trusted-url.pipe';
import { AuthService } from '../../../../core/services/auth.service';

type EditorTab = 'template' | 'preset' | 'tokens' | 'css';

@Component({
  selector:    'app-theme-editor',
  standalone:  true,
  imports:     [CommonModule, FormsModule, TrustedUrlPipe],
  templateUrl: './theme-editor.component.html',
  styleUrls:   ['./theme-editor.component.scss']
})
export class ThemeEditorComponent implements OnInit, OnDestroy {

  @ViewChild('previewFrame') frameRef!: ElementRef<HTMLIFrameElement>;

  private svc     = inject(ThemeService);
  private auth    = inject(AuthService);
  private destroy = new Subject<void>();
  private tokenSave$ = new Subject<void>();

  // ── State ───────────────────────────────────────────────────────────────────
  theme       = signal<TenantThemeResponse | null>(null);
  templates   = signal<TemplateResponse[]>([]);
  presets     = signal<PresetResponse[]>([]);
  loading     = signal(true);
  saving      = signal(false);
  error       = signal<string | null>(null);
  success     = signal<string | null>(null);
  activeTab   = signal<EditorTab>('template');
  previewMode = signal<'desktop' | 'mobile'>('desktop');

  // Working copy of custom tokens (parsed)
  localTokens = signal<Record<string, any>>({});
  // Custom CSS textarea value
  localCss    = signal<string>('');

  readonly tokenFields = TOKEN_FIELDS;

  tenant = this.auth.currentTenant;

  previewUrl = computed(() => {
    const t = this.tenant();
    if (!t) return '';
    return t.customDomain
      ? `https://${t.customDomain}/menu`
      : `https://${t.subdomain}.menuify.tn/menu`;
  });

  tabs: { id: EditorTab; label: string }[] = [
    { id: 'template', label: 'Layout'   },
    { id: 'preset',   label: 'Preset'   },
    { id: 'tokens',   label: 'Tokens'   },
    { id: 'css',      label: 'Custom CSS'},
  ];

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit() {
    this.loadAll();

    // Debounce token saves — fire 800ms after last change
    this.tokenSave$
      .pipe(debounceTime(800), takeUntil(this.destroy))
      .subscribe(() => this.persistTokens());
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  // ── Load ─────────────────────────────────────────────────────────────────────
  loadAll() {
    this.loading.set(true);

    this.svc.getCurrent().subscribe({
      next: theme => {
        this.theme.set(theme);
        this.localTokens.set(this.parseTokens(theme.customTokens));
        this.localCss.set(theme.customCss ?? '');
        this.loading.set(false);
        this.loadPresets(theme.template?.id);
      },
      error: () => { this.loading.set(false); this.error.set('Failed to load theme'); }
    });

    this.svc.getTemplates().subscribe({
      next: ts => this.templates.set(ts)
    });
  }

  loadPresets(templateId?: string) {
    this.svc.getPresets(templateId).subscribe({
      next: ps => this.presets.set(ps)
    });
  }

  // ── Template ─────────────────────────────────────────────────────────────────
  selectTemplate(template: TemplateResponse) {
    if (this.theme()?.template?.id === template.id) return;
    this.saving.set(true);
    this.svc.switchTemplate(template.slug).subscribe({
      next: t => {
        this.theme.set(t);
        this.loading.set(false);
        this.saving.set(false);
        this.loadPresets(t.template?.id);
        this.refreshPreview();
        this.showSuccess('Layout updated');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to switch template');
      }
    });
  }

  // ── Preset ───────────────────────────────────────────────────────────────────
  selectPreset(preset: PresetResponse) {
    if (this.theme()?.preset?.id === preset.id) return;
    this.saving.set(true);
    this.svc.applyPreset(preset.id).subscribe({
      next: t => {
        this.theme.set(t);
        // Reset local tokens — preset is the new base
        this.localTokens.set({});
        this.saving.set(false);
        this.refreshPreview();
        this.showSuccess('Preset applied');
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Failed to apply preset');
      }
    });
  }

  // ── Token editor ──────────────────────────────────────────────────────────────
  getTokenVal(field: TokenField): string {
    // 1. Check local overrides first
    const local = getTokenValue(this.localTokens(), field.key);
    if (local !== undefined && local !== null) return String(local);

    // 2. Fall back to preset base tokens
    const preset = this.theme()?.preset;
    if (preset) {
      try {
        const base = JSON.parse(
          (preset as any).tokens ?? '{}');
        const baseVal = getTokenValue(base, field.key);
        if (baseVal !== undefined) return String(baseVal);
      } catch { /* ignore */ }
    }

    // 3. Sensible defaults
    if (field.type === 'color')  return '#000000';
    if (field.type === 'range')  return String(field.min ?? 0);
    if (field.type === 'select') return field.options?.[0] ?? '';
    return '';
  }

  onTokenChange(field: TokenField, value: string) {
    const finalVal = field.type === 'range' ? `${value}px` : value;
    this.localTokens.update(t => setTokenValue(t, field.key, finalVal));
    this.syncPreviewTokens();
    this.tokenSave$.next();  // debounced save
  }

  getRangeNumeric(field: TokenField): number {
    const val = this.getTokenVal(field);
    return parseInt(val, 10) || field.min || 0;
  }

  resetToPreset() {
    if (!confirm('Reset all token changes back to preset defaults?')) return;
    this.saving.set(true);
    this.svc.resetToPreset().subscribe({
      next: t => {
        this.theme.set(t);
        this.localTokens.set({});
        this.saving.set(false);
        this.refreshPreview();
        this.showSuccess('Reset to preset');
      },
      error: () => { this.saving.set(false); }
    });
  }

  private persistTokens() {
    const delta = this.localTokens();
    if (!Object.keys(delta).length) return;
    this.svc.updateTokens(JSON.stringify(delta)).subscribe({
      next: t => this.theme.set(t),
      error: () => this.error.set('Failed to save token changes')
    });
  }

  // ── Custom CSS ────────────────────────────────────────────────────────────────
  saveCustomCss() {
    this.saving.set(true);
    const css = this.localCss();
    const action$ = css.trim()
      ? this.svc.saveCustomCss(css)
      : this.svc.removeCustomCss();

    action$.subscribe({
      next: t => {
        this.theme.set(t);
        this.saving.set(false);
        this.refreshPreview();
        this.showSuccess('Custom CSS saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to save CSS');
      }
    });
  }

  // ── Preview iframe ────────────────────────────────────────────────────────────
  refreshPreview() {
    const frame = this.frameRef?.nativeElement;
    if (!frame) return;
    // Force reload by re-setting the src
    const src = frame.src;
    frame.src = '';
    setTimeout(() => { frame.src = src; }, 50);
  }

  syncPreviewTokens() {
    const frame = this.frameRef?.nativeElement;
    if (!frame?.contentWindow) return;
    // Merge preset + local tokens
    const merged = this.getMergedTokens();
    const css    = `:root {\n${tokensToCssVars(merged)}}`;
    frame.contentWindow.postMessage({ type: 'THEME_UPDATE', css }, '*');
  }

  getMergedTokens(): Record<string, any> {
    let base: Record<string, any> = {};
    try {
      const preset = this.theme()?.preset;
      if (preset) base = JSON.parse((preset as any).tokens ?? '{}');
    } catch { /* ignore */ }

    const local  = this.localTokens();
    return this.deepMerge(structuredClone(base), local);
  }

  private deepMerge(target: any, source: any): any {
    for (const key of Object.keys(source)) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key])
      ) {
        target[key] = this.deepMerge(target[key] ?? {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  setTab(tab: EditorTab) {
    this.activeTab.set(tab);
    this.error.set(null);
  }

  isPlanSufficient(required: string): boolean {
    const order = { STARTER: 0, STANDARD: 1, PREMIUM: 2 };
    const plan  = this.tenant()?.plan ?? 'STARTER';
    return (order[plan as keyof typeof order] ?? 0) >=
           (order[required as keyof typeof order] ?? 0);
  }

  private parseTokens(json: string | null): Record<string, any> {
    if (!json) return {};
    try { return JSON.parse(json); } catch { return {}; }
  }

  private showSuccess(msg: string) {
    this.success.set(msg);
    setTimeout(() => this.success.set(null), 3000);
  }
}