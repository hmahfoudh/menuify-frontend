import {
  Component, OnInit, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder,
  FormGroup, Validators
} from '@angular/forms';
import {
  TenantResponse, OpeningHoursMap, DayHours,
  WeekDay, DAYS, DAY_LABELS,
  DEFAULT_HOURS, LOCALES, CURRENCIES,
  Feature,
  FEATURES,
  TenantSettingsRequest
} from '../models/settings.models';
import { SettingsService } from '../services/settings.service';
import { AuthService } from '../../../../core/services/auth.service';

type SettingsTab = 'profile' | 'contact' | 'hours' | 'advanced' | 'features';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  private svc = inject(SettingsService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  // ── State ───────────────────────────────────────────────────────────────────
  tenant = signal<TenantResponse | null>(null);
  loading = signal(true);
  saving = signal(false);
  logoLoading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  activeTab = signal<SettingsTab>('profile');

  logoPreview = signal<string | null>(null);
  logoFile = signal<File | null>(null);

  // Opening hours — managed separately from the form
  hours = signal<OpeningHoursMap>({ ...DEFAULT_HOURS });

  // ── Constants ────────────────────────────────────────────────────────────────
  readonly tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'profile', label: 'Profile', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { id: 'contact', label: 'Contact', icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' },
    { id: 'hours', label: 'Hours', icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2' },
    { id: 'features', label: 'Features', icon: 'M4 7h10M14 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM20 17H10M10 17a2 2 0 1 1 0 4 2 2 0 0 1 0-4z' },
    { id: 'advanced', label: 'Advanced', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
  ];

  readonly days = DAYS;
  readonly dayLabels = DAY_LABELS;
  readonly locales = LOCALES;
  readonly currencies = CURRENCIES;
  readonly featureMeta = FEATURES;

  // ── Forms ────────────────────────────────────────────────────────────────────
  profileForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    tagline: ['', Validators.maxLength(200)],
    defaultLocale: ['fr'],
    currencySymbol: ['DT'],
  });

  contactForm: FormGroup = this.fb.group({
    whatsappNumber: [''],
    address: [''],
    city: [''],
    country: [''],
    googleMapsUrl: [''],
    facebookUrl: [''],
    instagramUrl: [''],
    twitterUrl: [''],
    tiktokUrl: [''],
    linkedinUrl: [''],
    youtubeUrl: [''],
    wifiName: [''],
    wifiPassword: [''],
  });

  advancedForm: FormGroup = this.fb.group({
    metaDescription: ['', Validators.maxLength(300)],
    googleAnalyticsId: ['', Validators.maxLength(30)],
    customDomain: [''],
  });

  // ── Init ─────────────────────────────────────────────────────────────────────
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.get().subscribe({
      next: t => { this.populate(t); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set('Failed to load settings'); }
    });
  }

  private populate(t: TenantResponse) {
    this.tenant.set(t);
    this.logoPreview.set(t.logoUrl);

    this.profileForm.patchValue({
      name: t.name,
      tagline: t.tagline ?? '',
      defaultLocale: t.defaultLocale ?? 'fr',
      currencySymbol: t.currencySymbol ?? 'DT',
    });

    this.contactForm.patchValue({
      whatsappNumber: t.whatsappNumber ?? '',
      address: t.address ?? '',
      city: t.city ?? '',
      country: t.country ?? '',
      googleMapsUrl: t.googleMapsUrl ?? '',
      facebookUrl: t.facebookUrl ?? '',
      instagramUrl: t.instagramUrl ?? '',
      twitterUrl: t.twitterUrl ?? '',
      tiktokUrl: t.tiktokUrl ?? '',
      linkedinUrl: t.linkedinUrl ?? '',
      youtubeUrl: t.youtubeUrl ?? '',
      wifiName: t.wifiName ?? '',
      wifiPassword: t.wifiPassword ?? '',
    });

    this.advancedForm.patchValue({
      metaDescription: t.metaDescription ?? '',
      googleAnalyticsId: t.googleAnalyticsId ?? '',
      customDomain: t.customDomain ?? '',
    });

    // Parse opening hours
    if (t.openingHours) {
      try {
        const parsed = JSON.parse(t.openingHours);
        const merged = { ...DEFAULT_HOURS };
        for (const day of DAYS) {
          if (parsed[day]) merged[day] = parsed[day];
        }
        this.hours.set(merged);
      } catch { /* keep defaults */ }
    }
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  setTab(tab: SettingsTab) {
    this.activeTab.set(tab);
    this.error.set(null);
    this.success.set(null);
  }

  // ── Logo ─────────────────────────────────────────────────────────────────────
  onLogoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('Please select an image file'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('Logo must be under 5MB'); return;
    }
    this.logoFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.logoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  uploadLogo() {
    const file = this.logoFile();
    if (!file) return;
    this.logoLoading.set(true);
    this.svc.uploadLogo(file).subscribe({
      next: t => {
        this.tenant.set(t);
        this.logoPreview.set(t.logoUrl);
        this.logoFile.set(null);
        this.logoLoading.set(false);
        this.auth.refreshTenant(t);
        this.showSuccess('Logo updated');
      },
      error: () => {
        this.logoLoading.set(false);
        this.error.set('Failed to upload logo');
      }
    });
  }

  removeLogo() {
    if (!confirm('Remove your current logo?')) return;
    this.logoLoading.set(true);
    this.svc.removeLogo().subscribe({
      next: t => {
        this.tenant.set(t);
        this.logoPreview.set(null);
        this.logoFile.set(null);
        this.logoLoading.set(false);
        this.auth.refreshTenant(t);
        this.showSuccess('Logo removed');
      },
      error: () => {
        this.logoLoading.set(false);
        this.error.set('Failed to remove logo');
      }
    });
  }

  clearLogoPreview() {
    this.logoFile.set(null);
    this.logoPreview.set(this.tenant()?.logoUrl ?? null);
  }

  // ── Opening hours ─────────────────────────────────────────────────────────────
  toggleDay(day: WeekDay) {
    this.hours.update(h => ({
      ...h,
      [day]: { ...h[day], open: !h[day].open }
    }));
  }

  updateHour(day: WeekDay, field: 'from' | 'to', value: string) {
    this.hours.update(h => ({
      ...h,
      [day]: { ...h[day], [field]: value }
    }));
  }

  copyToAll(day: WeekDay) {
    const src = this.hours()[day];
    this.hours.update(h => {
      const updated = { ...h };
      for (const d of DAYS) {
        updated[d] = { ...updated[d], from: src.from, to: src.to };
      }
      return updated;
    });
    this.showSuccess('Hours copied to all days');
  }

  // ── Features ─────────────────────────────────────────────────────────────

  isFeatureActive(id: Feature): boolean {
    return this.tenant()?.features?.includes(id) ?? false;
  }

  isFeatureLocked(minPlan: any): boolean {
    if (!minPlan) return false;
    const plan = this.tenant()?.plan;
    if (minPlan === 'PREMIUM') return plan !== 'PREMIUM';
    if (minPlan === 'STANDARD') return plan === 'STARTER';
    return false;
  }

  toggleFeature(id: Feature) {
    const current = this.tenant()?.features ?? [];
    const next = current.includes(id)
      ? current.filter(f => f !== id)
      : [...current, id];
    // Optimistically update tenant signal so toggle reflects immediately
    this.tenant.update(t => t ? { ...t, features: next } : t);
  }

  saveFeatures() {
    this.save({ features: this.tenant()?.features ?? [] });
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched(); return;
    }
    this.save(this.profileForm.value);
  }

  saveContact() {
    this.save(this.contactForm.value);
  }

  saveHours() {
    this.save({ openingHours: JSON.stringify(this.hours()) });
  }

  saveAdvanced() {
    const v = this.advancedForm.value;
    this.save({
      metaDescription: v.metaDescription || undefined,
      googleAnalyticsId: v.googleAnalyticsId || undefined,
    });

    // Handle custom domain separately
    const domain = v.customDomain?.trim();
    const currentDomain = this.tenant()?.customDomain;
    if (domain && domain !== currentDomain) {
      this.svc.requestCustomDomain(domain).subscribe({
        next: t => { this.tenant.set(t); this.auth.refreshTenant(t); },
        error: err => this.error.set(err?.error?.message ?? 'Invalid domain')
      });
    } else if (!domain && currentDomain) {
      this.svc.removeCustomDomain().subscribe({
        next: t => { this.tenant.set(t); this.auth.refreshTenant(t); }
      });
    }
  }

  private save(req: TenantSettingsRequest) {
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.svc.update(req).subscribe({
      next: t => {
        this.tenant.set(t);
        this.auth.refreshTenant(t);
        this.saving.set(false);
        this.showSuccess('Settings saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to save settings');
      }
    });
  }

  private showSuccess(msg: string) {
    this.success.set(msg);
    setTimeout(() => this.success.set(null), 3000);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  get menuUrl(): string {
    const t = this.tenant();
    if (!t) return '';
    return t.customDomain
      ? `https://${t.customDomain}`
      : `https://${t.subdomain}.menuify.tn`;
  }

  get nameCtrl() { return this.profileForm.get('name')!; }
}