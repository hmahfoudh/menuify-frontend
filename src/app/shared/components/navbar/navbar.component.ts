import { Component, inject, signal, HostListener, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  private router   = inject(Router);
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  scrolled       = signal(false);
  mobileMenuOpen = signal(false);
  currentLang    = signal(this.translate.currentLang || 'fr');

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > 20);
    }
  }

  /**
   * On landing (/): scroll to section.
   * On any other page: navigate to /#section so the landing handles the scroll.
   */
  navigateTo(section: string): void {
    this.mobileMenuOpen.set(false);
    const isLanding = this.router.url === '/' || this.router.url === '';
    if (isLanding && isPlatformBrowser(this.platformId)) {
      const el = document.getElementById(section);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      this.router.navigate(['/'], { fragment: section });
    }
  }

  setLang(lang: string): void {
    this.translate.use(lang);
    this.currentLang.set(lang);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.lang = lang;
      document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }

  updateMobileOpenState(): void {
    this.mobileMenuOpen.update(v => !v);
  }
}