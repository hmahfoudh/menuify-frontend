import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, pairwise } from 'rxjs/operators';

/**
 * Structured metadata for a page
 * Supports Open Graph, Twitter Cards, Schema.org JSON-LD
 */
export interface MetaTagConfig {
  // Basic metadata
  title: string;
  description: string;
  canonical?: string;

  // Open Graph (social media sharing)
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogImageAlt?: string;
  ogType?: 'website' | 'article' | 'product' | 'business.business';
  ogUrl?: string;

  // Twitter Card
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterCreator?: string;

  // Article-specific (if ogType === 'article')
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  articleAuthor?: string;
  articleSection?: string;
  articleTags?: string[];

  // Product-specific (if ogType === 'product')
  productPrice?: string;
  productCurrency?: string;

  // SEO
  robots?: 'index,follow' | 'noindex,nofollow' | 'index,nofollow' | 'noindex,follow';
  keywords?: string[];
  language?: string;

  // Structured data (JSON-LD)
  structuredData?: Record<string, any>;

  // Custom meta tags
  customMeta?: Array<{ name: string; content: string }>;
}

/**
 * Route-specific metadata configuration
 */
interface RouteMetaConfig {
  pattern: RegExp | string;
  config: MetaTagConfig;
  priority?: number;
}

@Injectable({ providedIn: 'root' })
export class MetaTagsService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  // Configuration
  private readonly baseUrl = signal('https://menuify.tn');
  private readonly defaultImage = signal('https://menuify.tn/assets/brand/og-image.png');
  private readonly defaultTwitterHandle = signal('@menuify_tn');

  // Current state
  private readonly currentUrl = signal<string>('');
  private readonly currentMetaConfig = signal<MetaTagConfig>({
    title: 'Menuify',
    description: 'Digital Menu Platform',
  });

  // Computed
  readonly metaConfig = computed(() => this.currentMetaConfig());
  readonly url = computed(() => this.currentUrl());

  // Route configuration map (DRY, typed, easily extensible)
  private readonly routeConfigs: RouteMetaConfig[] = [
    {
      pattern: /^\/$/,
      priority: 100,
      config: {
        title: 'Menuify - Plateforme de menus numériques pour les restaurants',
        description:
          'Gérez votre menu de restaurant & café avec des codes QR, recevez les commandes en temps réel et suivez les commandes des clients. Solution de menu numérique gratuite pour les restaurants modernes.',
        ogType: 'website',
        robots: 'index,follow',
        keywords: [
          'menu numérique',
          'menu digital',
          'menu restaurant',
          'code QR',
          'menu café',
          'gestion de restaurant',
        ],
      },
    },
    {
      pattern: /^\/menu/,
      priority: 80,
      config: {
        title: 'Browse Menu - Menuify',
        description: 'Explore our menu and place an order using Menuify.',
        ogType: 'website',
        robots: 'index,follow',
      },
    },
    {
      pattern: /^\/track/,
      priority: 80,
      config: {
        title: 'Track Your Order - Menuify',
        description: 'Real-time order tracking. Check your order status and estimated arrival time.',
        ogType: 'website',
        robots: 'noindex,follow', // Don't index tracking pages
      },
    },
    {
      pattern: /^\/qr/,
      priority: 70,
      config: {
        title: 'QR Code - Menuify',
        description: 'Generate and manage QR codes for your digital menu.',
        ogType: 'website',
        robots: 'noindex,nofollow',
      },
    },
    {
      pattern: /^\/auth\/login/,
      priority: 50,
      config: {
        title: 'Login - Menuify',
        description: 'Sign in to your Menuify restaurant dashboard.',
        robots: 'noindex,nofollow',
      },
    },
    {
      pattern: /^\/auth\/register/,
      priority: 50,
      config: {
        title: 'Register - Menuify',
        description: 'Create a new restaurant account and start managing your menu with Menuify.',
        robots: 'noindex,nofollow',
      },
    },
    {
      pattern: /^\/dashboard\/overview/,
      priority: 40,
      config: {
        title: 'Dashboard Overview - Menuify',
        description:
          'Restaurant dashboard with real-time analytics, orders, and menu management.',
        robots: 'noindex,nofollow',
      },
    },
    {
      pattern: /^\/dashboard\/orders/,
      priority: 40,
      config: {
        title: 'Orders - Menuify Dashboard',
        description: 'Manage and track all your restaurant orders in real-time.',
        robots: 'noindex,nofollow',
      },
    },
    {
      pattern: /^\/dashboard\/menu/,
      priority: 40,
      config: {
        title: 'Menu Management - Menuify Dashboard',
        description: 'Edit your menu items, categories, prices, and availability.',
        robots: 'noindex,nofollow',
      },
    },
    {
      pattern: /^\/dashboard\/analytics/,
      priority: 40,
      config: {
        title: 'Analytics - Menuify Dashboard',
        description: 'View detailed analytics about your restaurant sales and orders.',
        robots: 'noindex,nofollow',
      },
    },
    {
      pattern: /^\/dashboard\/settings/,
      priority: 40,
      config: {
        title: 'Settings - Menuify Dashboard',
        description: 'Configure your restaurant settings and preferences.',
        robots: 'noindex,nofollow',
      },
    },
  ];

  constructor() {
    this.initializeRouteListener();
    this.initializeMetaTagEffect();
  }

  /**
   * Initialize route change listener
   * Updates currentUrl signal on navigation
   */
  private initializeRouteListener(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        pairwise(), // Only trigger on URL change, not repeat navigations
      )
      .subscribe(([prev, current]) => {
        if ((prev as NavigationEnd).urlAfterRedirects !== (current as NavigationEnd).urlAfterRedirects) {
          this.currentUrl.set((current as NavigationEnd).urlAfterRedirects);
        }
      });

    // Initial load
    this.currentUrl.set(this.router.url);
  }

  /**
   * Initialize meta tag update effect
   * Automatically updates all meta tags when currentUrl changes
   * Uses signals for reactive, zoneless-compatible updates
   */
  private initializeMetaTagEffect(): void {
    effect(
      () => {
        const url = this.currentUrl();
        const config = this.resolveMetaConfig(url);
        this.currentMetaConfig.set(config);
        this.applyMetaTags(config, url);
      },
      { allowSignalWrites: true },
    );
  }

  /**
   * Resolve meta config for a given URL
   * Matches against route patterns with priority
   */
  private resolveMetaConfig(url: string): MetaTagConfig {
    const matches = this.routeConfigs
      .filter((rc) => {
        if (rc.pattern instanceof RegExp) {
          return rc.pattern.test(url);
        }
        return url === rc.pattern || url.startsWith(rc.pattern);
      })
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    if (matches.length > 0) {
      return this.enrichMetaConfig(matches[0].config);
    }

    // Fallback config
    return this.enrichMetaConfig({
      title: 'Menuify - Digital Restaurant Menu Platform',
      description:
        'Modern digital menu solution for restaurants. Manage menus, orders, and track customer preferences.',
      ogType: 'website',
      robots: 'index,follow',
    });
  }

  /**
   * Enrich config with defaults
   * Fills in missing values from signals and fallbacks
   */
  private enrichMetaConfig(config: MetaTagConfig): MetaTagConfig {
    return {
      ...config,
      ogTitle: config.ogTitle ?? config.title,
      ogDescription: config.ogDescription ?? config.description,
      ogImage: config.ogImage ?? this.defaultImage(),
      ogUrl: config.ogUrl ?? this.baseUrl(),
      twitterCard: config.twitterCard ?? 'summary_large_image',
      twitterTitle: config.twitterTitle ?? config.title,
      twitterDescription: config.twitterDescription ?? config.description,
      twitterImage: config.twitterImage ?? this.defaultImage(),
      twitterCreator: config.twitterCreator ?? this.defaultTwitterHandle(),
      canonical: config.canonical ?? this.baseUrl(),
      language: config.language ?? 'en',
      robots: config.robots ?? 'index,follow',
    };
  }

  /**
   * Apply all meta tags to the document
   * SSR-safe using Angular's Meta and Title services
   */
  private applyMetaTags(config: MetaTagConfig, url: string): void {
    // Set title
    this.titleService.setTitle(config.title);

    // Clear existing meta tags (except those we shouldn't touch)
    const preserveTags = ['charset', 'viewport', 'theme-color'];
    this.metaService
      .getTags('')
      .filter((tag) => !preserveTags.includes(tag.getAttribute('name') ?? ''))
      .forEach((tag) => this.metaService.removeTag(tag.outerHTML));

    // Standard meta tags
    this.metaService.updateTag({ name: 'description', content: config.description });
    this.metaService.updateTag({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' });
    this.metaService.updateTag({ name: 'theme-color', content: '#ffffff' });
    this.metaService.updateTag({ name: 'language', content: config.language ?? 'en' });

    // Robots and SEO
    this.metaService.updateTag({ name: 'robots', content: config.robots ?? 'index,follow' });
    if (config.keywords && config.keywords.length > 0) {
      this.metaService.updateTag({ name: 'keywords', content: config.keywords.join(', ') });
    }

    // Canonical
    const canonical = config.canonical ?? `${this.baseUrl()}${url}`;
    this.metaService.updateTag({ rel: 'canonical', href: canonical });

    // Open Graph tags
    this.metaService.updateTag({ property: 'og:title', content: config.ogTitle ?? '' });
    this.metaService.updateTag({ property: 'og:description', content: config.ogDescription ?? '' });
    this.metaService.updateTag({ property: 'og:url', content: config.ogUrl ?? '' });
    this.metaService.updateTag({ property: 'og:type', content: config.ogType ?? 'website' });

    if (config.ogImage) {
      this.metaService.updateTag({ property: 'og:image', content: config.ogImage });
      this.metaService.updateTag({
        property: 'og:image:width',
        content: (config.ogImageWidth ?? 1200).toString(),
      });
      this.metaService.updateTag({
        property: 'og:image:height',
        content: (config.ogImageHeight ?? 630).toString(),
      });
      if (config.ogImageAlt) {
        this.metaService.updateTag({ property: 'og:image:alt', content: config.ogImageAlt });
      }
    }

    // Twitter Card tags
    this.metaService.updateTag({ name: 'twitter:card', content: config.twitterCard ?? 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: config.twitterTitle ?? '' });
    this.metaService.updateTag({ name: 'twitter:description', content: config.twitterDescription ?? '' });
    if (config.twitterImage) {
      this.metaService.updateTag({ name: 'twitter:image', content: config.twitterImage });
    }
    if (config.twitterCreator) {
      this.metaService.updateTag({ name: 'twitter:creator', content: config.twitterCreator });
    }

    // Article metadata
    if (config.ogType === 'article') {
      if (config.articlePublishedTime) {
        this.metaService.updateTag({
          property: 'article:published_time',
          content: config.articlePublishedTime,
        });
      }
      if (config.articleModifiedTime) {
        this.metaService.updateTag({
          property: 'article:modified_time',
          content: config.articleModifiedTime,
        });
      }
      if (config.articleAuthor) {
        this.metaService.updateTag({ property: 'article:author', content: config.articleAuthor });
      }
      if (config.articleSection) {
        this.metaService.updateTag({ property: 'article:section', content: config.articleSection });
      }
      if (config.articleTags && config.articleTags.length > 0) {
        config.articleTags.forEach((tag) => {
          this.metaService.addTag({ property: 'article:tag', content: tag });
        });
      }
    }

    // Custom meta tags
    if (config.customMeta && config.customMeta.length > 0) {
      config.customMeta.forEach((meta) => {
        this.metaService.updateTag({ name: meta.name, content: meta.content });
      });
    }

    // Structured data (JSON-LD)
    if (config.structuredData) {
      this.setStructuredData(config.structuredData);
    }
  }

  /**
   * Set JSON-LD structured data
   * Replaces existing schema if present
   */
  private setStructuredData(data: Record<string, any>): void {
    // Remove existing schema.org script if present
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create new script tag
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  /**
   * Set configuration values (typically at app init)
   */
  setConfiguration(options: {
    baseUrl?: string;
    defaultImage?: string;
    defaultTwitterHandle?: string;
  }): void {
    if (options.baseUrl) this.baseUrl.set(options.baseUrl);
    if (options.defaultImage) this.defaultImage.set(options.defaultImage);
    if (options.defaultTwitterHandle) this.defaultTwitterHandle.set(options.defaultTwitterHandle);
  }

  /**
   * Programmatically set custom meta tags (for dynamic content)
   */
  setCustomMetaTags(config: MetaTagConfig): void {
    this.currentMetaConfig.set(this.enrichMetaConfig(config));
    this.applyMetaTags(this.currentMetaConfig(), this.router.url);
  }

  /**
   * Set meta tags with translated values from i18n keys
   * Ensures translations are loaded before applying
   * @param translationKeys Keys to fetch from current language
   */
  setCustomMetaTagsWithTranslations(translationKeys: {
    titleKey: string;
    descriptionKey: string;
    ogTitleKey?: string;
    ogDescriptionKey?: string;
    keywordsKey?: string;
  }): void {
    // Use instant() to get already-loaded translations
    // This is better than subscribe() because translations are already available
    const translations = this.translate.instant([
      translationKeys.titleKey,
      translationKeys.descriptionKey,
      translationKeys.ogTitleKey || translationKeys.titleKey,
      translationKeys.ogDescriptionKey || translationKeys.descriptionKey,
      translationKeys.keywordsKey || '',
    ]);

    const keywordString = translations[translationKeys.keywordsKey || ''] || '';
    const keywords = this.parseKeywords(keywordString);

    this.setCustomMetaTags({
      title: translations[translationKeys.titleKey],
      description: translations[translationKeys.descriptionKey],
      ogTitle: translations[translationKeys.ogTitleKey || translationKeys.titleKey],
      ogDescription: translations[translationKeys.ogDescriptionKey || translationKeys.descriptionKey],
      keywords: keywords.length > 0 ? keywords : undefined,
      language: this.translate.getCurrentLang() || 'fr',
      robots: 'index,follow',
      ogType: 'website',
    });
  }

  /**
   * Helper to parse comma-separated keywords
   */
  private parseKeywords(keywordString: string): string[] {
    if (!keywordString || typeof keywordString !== 'string') return [];
    return keywordString
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }

  /**
   * Register additional route configurations
   * Useful for lazy-loaded feature routes
   */
  registerRoutes(routes: RouteMetaConfig[]): void {
    this.routeConfigs.push(...routes);
    // Re-resolve current config with new routes
    this.currentUrl.set(this.router.url);
  }

  /**
   * Get current meta config (useful for debugging)
   */
  getCurrentMetaConfig(): MetaTagConfig {
    return this.currentMetaConfig();
  }

  /**
   * Get current URL (exposed as computed for reactivity)
   */
  getCurrentUrl(): string {
    return this.currentUrl();
  }
}