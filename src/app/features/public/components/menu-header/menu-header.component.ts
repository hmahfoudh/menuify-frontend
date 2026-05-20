import { Component, Input, signal, HostListener, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-menu-header',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './menu-header.component.html',
  styleUrls: ['./menu-header.component.scss'],
})
export class MenuHeaderComponent {

  private translate = inject(TranslateService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) tenant!: any;

  // ── Language selection ────────────────────────────────────────────────────
  langMenuOpen = signal(false);
  currentLang = signal({ code: 'fr', flag: '🇫🇷', label: 'Français' });

  availableLangs = signal([
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
    { code: 'ar', flag: '🇹🇳', label: 'العربية' },
  ]);

  toggleLangMenu() {
    this.langMenuOpen.update(v => !v);
  }

  switchLang(code: string) {
    const lang = this.availableLangs().find(l => l.code === code)!;
    this.currentLang.set(lang);
    this.translate.use(code);
    this.langMenuOpen.set(false);
    if (this.isBrowser) {
      localStorage.setItem('lang', code);
      document.documentElement.dir = lang.code === 'ar' ? 'rtl' : 'ltr';
    }
  }

  @HostListener('document:click')
  closeLangMenu() {
    this.langMenuOpen.set(false);
  }
}