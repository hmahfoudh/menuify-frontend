import {
  Component, OnInit, signal, computed,
  inject, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { FEATURE_ICONS, FEATURE_KEYS, Lang, PLANS, PublicTenant } from '../models/landing.models';
import { RouterLink } from "@angular/router";
import { MetaTagsService } from '../../../shared/services/meta-tags.service';



@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements OnInit {

  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  private metaTagsService = inject(MetaTagsService);

  // ── Language ─────────────────────────────────────────────────────────────────
  currentLang = signal<Lang>('fr');
  isRtl = computed(() => this.currentLang() === 'ar');

  // ── Navbar ───────────────────────────────────────────────────────────────────
  scrolled = signal(false);
  mobileMenuOpen = signal(false);

  // ── Restaurant directory ──────────────────────────────────────────────────────
  allTenants = signal<PublicTenant[]>([]);
  searchQuery = signal('');
  loadingDir = signal(true);
  showAll = signal(false);

  filteredTenants = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = q
      ? this.allTenants().filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.city ?? '').toLowerCase().includes(q))
      : this.allTenants();
    return this.showAll() ? list : list.slice(0, 8);
  });

  hasMore = computed(() =>
    !this.showAll() && this.allTenants().length > 8
  );

  // ── Contact form ──────────────────────────────────────────────────────────────
  cName = signal('');
  cEmail = signal('');
  cResto = signal('');
  cMsg = signal('');
  cSending = signal(false);
  cSent = signal(false);
  cError = signal<string | null>(null);

  // ── Constants ─────────────────────────────────────────────────────────────────
  readonly featureKeys = FEATURE_KEYS;
  readonly featureIcons = FEATURE_ICONS;
  readonly plans = PLANS;

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Load tenants directory
    this.loadTenants();
  }

  @HostListener('window:scroll')
  onScroll(): void { this.scrolled.set(window.scrollY > 40); }

  // ── Language ──────────────────────────────────────────────────────────────────
  setLang(lang: Lang): void {
    this.currentLang.set(lang); // This triggers the effect → meta tags update automatically
    this.translate.use(lang);
    // Update document dir for RTL support
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }

  // ── Directory ─────────────────────────────────────────────────────────────────
  private loadTenants(): void {
    this.http.get<any>(`${environment.apiUrl}/api/public/tenants`)
      .subscribe({
        next: res => { this.allTenants.set(res.data ?? []); this.loadingDir.set(false); },
        error: () => this.loadingDir.set(false),
      });
  }

  setSearch(v: string): void { this.searchQuery.set(v); this.showAll.set(false); }
  openMenu(subdomain: string): void {
    window.open(`https://${subdomain}.menuify.tn/menu`, '_blank');
  }
  tenantInitial(name: string): string { return name.charAt(0).toUpperCase(); }

  // ── Smooth scroll ─────────────────────────────────────────────────────────────
  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    this.mobileMenuOpen.set(false);
  }

  // ── Contact ───────────────────────────────────────────────────────────────────
  submitContact(): void {
    if (!this.cName().trim() || !this.cEmail().trim() || !this.cMsg().trim()) return;

    this.cSending.set(true);
    this.cError.set(null);

    this.http.post(`${environment.apiUrl}/api/public/contact`, {
      name: this.cName().trim(),
      email: this.cEmail().trim(),
      restaurantName: this.cResto().trim() || null,
      message: this.cMsg().trim(),
    }).subscribe({
      next: () => { this.cSending.set(false); this.cSent.set(true); },
      error: () => {
        this.cSending.set(false);
        // Use translate.instant() in TS — translate pipe is for templates
        this.cError.set(this.translate.instant('contact.error'));
      },
    });
  }

  // ── Pricing helper ────────────────────────────────────────────────────────────
  // Returns the features array from the loaded translation for a given plan.
  // ngx-translate doesn't support iterating over JSON arrays with the pipe,
  // so we read them imperatively via instant().
  planFeatures(planKey: string): string[] {
    const features = this.translate.instant(`pricing.${planKey}.features`);
    return Array.isArray(features) ? features : [];
  }

  public updateMobileOpenState(): void {
    this.mobileMenuOpen.update(v => !v);
  }
}