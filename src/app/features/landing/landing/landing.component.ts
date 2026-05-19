import {
  Component, OnInit, signal, computed,
  inject, PLATFORM_ID, OnDestroy
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { FEATURE_ICONS, FEATURE_KEYS, Lang, PLANS, PublicTenant } from '../models/landing.models';
import { ActivatedRoute, RouterLink } from "@angular/router";
import { MetaTagsService } from '../../../shared/services/meta-tags.service';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { Subject, takeUntil } from 'rxjs';

interface FaqItem { q: string; a: string; }

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements OnInit, OnDestroy {

  private platformId = inject(PLATFORM_ID);
  private http        = inject(HttpClient);
  private translate   = inject(TranslateService);
  private metaTags    = inject(MetaTagsService);
  private route       = inject(ActivatedRoute);

  // ── Language ──────────────────────────────────────────────────────────────
  currentLang = signal<Lang>('fr');
  isRtl       = computed(() => this.currentLang() === 'ar');

  // ── Restaurant directory ──────────────────────────────────────────────────
  allTenants  = signal<PublicTenant[]>([]);
  searchQuery = signal('');
  loadingDir  = signal(true);
  showAll     = signal(false);

  filteredTenants = computed(() => {
    const q    = this.searchQuery().toLowerCase().trim();
    const list = q
      ? this.allTenants().filter(t =>
          t.name.toLowerCase().includes(q) ||
          (t.city ?? '').toLowerCase().includes(q))
      : this.allTenants();
    return this.showAll() ? list : list.slice(0, 8);
  });

  hasMore = computed(() => !this.showAll() && this.allTenants().length > 8);

  // ── FAQ items (resolved once on init, re-resolved on lang change) ─────────
  faqItems = signal<FaqItem[]>([]);

  // ── Contact form ──────────────────────────────────────────────────────────
  cName    = signal('');
  cEmail   = signal('');
  cResto   = signal('');
  cMsg     = signal('');
  cSending = signal(false);
  cSent    = signal(false);
  cError   = signal<string | null>(null);

  // ── Constants ─────────────────────────────────────────────────────────────
  readonly featureKeys  = FEATURE_KEYS;
  readonly featureIcons = FEATURE_ICONS;
  readonly plans        = PLANS;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateMetaTags();
      this.resolveFaqItems();
    });
    // Inject SSR meta tags synchronously (translate.instant is safe here)
    this.updateMetaTags();

    // Resolve FAQ items from translation file
    this.resolveFaqItems();

    // Smooth-scroll to anchor fragment if present
    this.route.fragment.pipe(takeUntil(this.destroy$)).subscribe(fragment => {
      if (fragment && isPlatformBrowser(this.platformId)) {
        setTimeout(() => {
          document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    });

    this.loadTenants();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Language ──────────────────────────────────────────────────────────────
  setLang(lang: Lang): void {
    this.currentLang.set(lang);
    this.translate.use(lang);

    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }

    // Refresh meta tags and FAQ items in the new language
    this.updateMetaTags();
    this.resolveFaqItems();
    this.metaTags.updateLocale(lang);
  }

  // ── Meta tags ─────────────────────────────────────────────────────────────
  private updateMetaTags(): void {
    this.metaTags.setCustomMetaTags({
      title:          this.translate.instant('seo.title'),
      description:    this.translate.instant('seo.description'),
      ogTitle:        this.translate.instant('seo.ogTitle'),
      ogDescription:  this.translate.instant('seo.ogDescription'),
      ogUrl:          'https://menuify.tn/',
      ogImage:        'https://menuify.tn/assets/brand/og-image.png',
      canonical:      'https://menuify.tn/',
      ogLocale:           this.currentLang(),
    });
  }

  // ── FAQ ───────────────────────────────────────────────────────────────────
  /**
   * Resolves the faq.items array from the translation file using instant().
   * Safe for SSR because translate.instant() is synchronous.
   */
  private resolveFaqItems(): void {
    const items = this.translate.instant('faq.items');
    this.faqItems.set(Array.isArray(items) ? items : []);
  }

  // ── Directory ─────────────────────────────────────────────────────────────
  private loadTenants(): void {
    this.http.get<any>(`${environment.apiUrl}/api/public/tenants`)
      .subscribe({
        next:  res => { this.allTenants.set(res.data ?? []); this.loadingDir.set(false); },
        error: ()  => this.loadingDir.set(false),
      });
  }

  setSearch(v: string): void { this.searchQuery.set(v); this.showAll.set(false); }

  openMenu(subdomain: string): void {
    window.open(`https://${subdomain}.menuify.tn/menu`, '_blank');
  }

  tenantInitial(name: string): string { return name.charAt(0).toUpperCase(); }

  // ── Smooth scroll ─────────────────────────────────────────────────────────
  scrollTo(section: string): void {
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ── Contact ───────────────────────────────────────────────────────────────
  submitContact(): void {
    if (!this.cName().trim() || !this.cEmail().trim() || !this.cMsg().trim()) return;

    this.cSending.set(true);
    this.cError.set(null);

    this.http.post(`${environment.apiUrl}/api/public/contact`, {
      name:           this.cName().trim(),
      email:          this.cEmail().trim(),
      restaurantName: this.cResto().trim() || null,
      message:        this.cMsg().trim(),
    }).subscribe({
      next:  () => { this.cSending.set(false); this.cSent.set(true); },
      error: () => {
        this.cSending.set(false);
        this.cError.set(this.translate.instant('contact.error'));
      },
    });
  }

  // ── Pricing helper ────────────────────────────────────────────────────────
  planFeatures(planKey: string): string[] {
    const features = this.translate.instant(`pricing.${planKey}.features`);
    return Array.isArray(features) ? features : [];
  }
}