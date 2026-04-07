import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { filter } from 'rxjs/operators';

interface MetaTagConfig {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  image?: string;
  url?: string;
  type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetaTagsService {
  private baseUrl = 'https://menuify.tn';
  private defaultImage = 'https://menuify.tn/assets/brand/og-image.png';
  private isBrowser: boolean;

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.initializeRouteListener();
    }
  }

  /**
   * Initialize listening to route changes to update meta tags
   * Only runs in the browser
   */
  private initializeRouteListener(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateMetaTags();
      });
  }

  /**
   * Update meta tags based on current route
   * Only runs in the browser
   */
  private updateMetaTags(): void {
    if (!this.isBrowser) return;

    const route = this.router.url;
    const config = this.getMetaConfigForRoute(route);
    this.setMetaTags(config);
  }

  /**
   * Get meta tag configuration based on route
   */
  private getMetaConfigForRoute(route: string): MetaTagConfig {
    // Homepage
    if (route === '/' || route === '') {
      return {
        title: 'Menuify - Digital Menu Platform for Restaurants',
        description: 'Manage your restaurant menu with QR codes, receive orders in real-time, and track customer orders. Free digital menu solution for modern restaurants.',
        image: this.defaultImage,
        url: this.baseUrl,
        type: 'website'
      };
    }

    // Public Menu
    if (route.includes('/menu')) {
      return {
        title: 'Browse Menu - Menuify',
        description: 'Explore our menu and place an order using Menuify.',
        image: this.defaultImage,
        url: `${this.baseUrl}/menu`,
        type: 'website'
      };
    }

    // Order Tracking
    if (route.includes('/track')) {
      return {
        title: 'Track Your Order - Menuify',
        description: 'Real-time order tracking. Check your order status and estimated arrival time.',
        image: this.defaultImage,
        url: `${this.baseUrl}/track`,
        type: 'website'
      };
    }

    // QR Code
    if (route.includes('/qr')) {
      return {
        title: 'QR Code - Menuify',
        description: 'Generate and manage QR codes for your digital menu.',
        image: this.defaultImage,
        url: `${this.baseUrl}/qr`,
        type: 'website'
      };
    }

    // Authentication
    if (route.includes('/auth/login')) {
      return {
        title: 'Login - Menuify',
        description: 'Sign in to your Menuify restaurant dashboard.',
        url: `${this.baseUrl}/auth/login`,
        type: 'website'
      };
    }

    if (route.includes('/auth/register')) {
      return {
        title: 'Register - Menuify',
        description: 'Create a new restaurant account and start managing your menu with Menuify.',
        url: `${this.baseUrl}/auth/register`,
        type: 'website'
      };
    }

    // Dashboard
    if (route.includes('/dashboard/overview')) {
      return {
        title: 'Dashboard Overview - Menuify',
        description: 'Restaurant dashboard with real-time analytics, orders, and menu management.',
        url: `${this.baseUrl}/dashboard/overview`,
        type: 'website'
      };
    }

    if (route.includes('/dashboard/orders')) {
      return {
        title: 'Orders - Menuify Dashboard',
        description: 'Manage and track all your restaurant orders in real-time.',
        url: `${this.baseUrl}/dashboard/orders`,
        type: 'website'
      };
    }

    if (route.includes('/dashboard/menu')) {
      return {
        title: 'Menu Management - Menuify Dashboard',
        description: 'Edit your menu items, categories, prices, and availability.',
        url: `${this.baseUrl}/dashboard/menu`,
        type: 'website'
      };
    }

    if (route.includes('/dashboard/analytics')) {
      return {
        title: 'Analytics - Menuify Dashboard',
        description: 'View detailed analytics about your restaurant sales and orders.',
        url: `${this.baseUrl}/dashboard/analytics`,
        type: 'website'
      };
    }

    if (route.includes('/dashboard/settings')) {
      return {
        title: 'Settings - Menuify Dashboard',
        description: 'Configure your restaurant settings and preferences.',
        url: `${this.baseUrl}/dashboard/settings`,
        type: 'website'
      };
    }

    // Default fallback
    return {
      title: 'Menuify - Digital Restaurant Menu Platform',
      description: 'Modern digital menu solution for restaurants. Manage menus, orders, and track customer preferences.',
      image: this.defaultImage,
      url: this.baseUrl,
      type: 'website'
    };
  }

  /**
   * Set meta tags on the page
   * Only runs in the browser
   */
  private setMetaTags(config: MetaTagConfig): void {
    if (!this.isBrowser) return;

    // Set title
    this.titleService.setTitle(config.title);

    // Set standard meta tags
    this.updateMetaTag('description', config.description);
    this.updateMetaTag('viewport', 'width=device-width, initial-scale=1.0', 'name');
    this.updateMetaTag('theme-color', '#ffffff', 'name');
    
    // Open Graph tags (for social media sharing)
    this.updateMetaTag('og:title', config.title, 'property');
    this.updateMetaTag('og:description', config.description, 'property');
    this.updateMetaTag('og:url', config.url || this.baseUrl, 'property');
    this.updateMetaTag('og:type', config.type || 'website', 'property');
    
    if (config.image) {
      this.updateMetaTag('og:image', config.image, 'property');
      this.updateMetaTag('og:image:width', '1200', 'property');
      this.updateMetaTag('og:image:height', '630', 'property');
    }

    // Twitter Card tags
    this.updateMetaTag('twitter:card', 'summary_large_image', 'name');
    this.updateMetaTag('twitter:title', config.title, 'name');
    this.updateMetaTag('twitter:description', config.description, 'name');
    if (config.image) {
      this.updateMetaTag('twitter:image', config.image, 'name');
    }

    // Additional SEO tags
    this.updateMetaTag('canonical', config.url || this.baseUrl, 'rel');
    this.updateMetaTag('robots', 'index, follow', 'name');
    this.updateMetaTag('keywords', 'restaurant menu, digital menu, QR code, food ordering', 'name');
    this.updateMetaTag('language', 'English', 'name');
  }

  /**
   * Update or create a meta tag
   * Only runs in the browser
   */
  private updateMetaTag(
    name: string,
    content: string,
    type: 'name' | 'property' | 'rel' = 'name'
  ): void {
    if (!this.isBrowser) return;

    let selector = '';
    const attributes: Record<string, string> = {};

    if (type === 'rel') {
      selector = `link[rel="${name}"]`;
      attributes['rel'] = name;
      attributes['href'] = content;
    } else {
      selector = `meta[${type}="${name}"]`;
      attributes[type] = name;
      attributes['content'] = content;
    }

    // Remove existing tag if it exists
    const existingTag = this.document.querySelector(selector);
    if (existingTag) {
      existingTag.remove();
    }

    // Create and add new tag
    if (type === 'rel') {
      const link = this.document.createElement('link');
      Object.entries(attributes).forEach(([key, value]) => {
        link.setAttribute(key, value);
      });
      this.document.head.appendChild(link);
    } else {
      const meta = this.document.createElement('meta');
      Object.entries(attributes).forEach(([key, value]) => {
        meta.setAttribute(key, value);
      });
      this.document.head.appendChild(meta);
    }
  }

  /**
   * Manually set meta tags (useful for dynamic content)
   * Only runs in the browser
   */
  public setCustomMetaTags(config: MetaTagConfig): void {
    if (this.isBrowser) {
      this.setMetaTags(config);
    }
  }

  /**
   * Get current meta config
   */
  public getCurrentMetaConfig(): MetaTagConfig {
    return this.getMetaConfigForRoute(this.router.url);
  }
}