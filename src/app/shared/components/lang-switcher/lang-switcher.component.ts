import {
  Component, signal, computed, HostListener,
  inject, OnInit, ElementRef, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '../../../core/services/local-storage.service';

export type Lang = 'fr' | 'en' | 'ar';

export const LANG_OPTIONS: { code: Lang; flag: string; label: string }[] = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English'  },
  { code: 'ar', flag: '🇹🇳', label: 'العربية'  },
];

@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lang-switcher.component.html',
  styleUrls: ['./lang-switcher.component.scss'],
})
export class LangSwitcherComponent implements OnInit {

  private translate    = inject(TranslateService);
  private localStorage = inject(LocalStorageService);
  private elRef        = inject(ElementRef);
  private platformId   = inject(PLATFORM_ID);

  readonly langs = LANG_OPTIONS;

  open        = signal(false);
  currentLang = signal<Lang>('fr');

  currentOption = computed(() =>
    LANG_OPTIONS.find(l => l.code === this.currentLang()) ?? LANG_OPTIONS[0]
  );

  ngOnInit(): void {
    const saved = this.localStorage.get('lang') as Lang | null;
    if (saved && ['fr', 'en', 'ar'].includes(saved)) {
      this.applyLang(saved);
    } else {
      // Detect browser language
      if (isPlatformBrowser(this.platformId)) {
        const browser = navigator.language.substring(0, 2) as Lang;
        this.applyLang(['fr', 'en', 'ar'].includes(browser) ? browser : 'fr');
      }
    }
  }

  select(lang: Lang): void {
    this.applyLang(lang);
    this.open.set(false);
  }

  toggle(): void { this.open.update(v => !v); }

  private applyLang(lang: Lang): void {
    this.currentLang.set(lang);
    this.translate.use(lang);
    this.localStorage.set('lang', lang);

    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.lang = lang;
      document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }

  // Close dropdown on outside click
  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  // Close on Escape
  @HostListener('document:keydown.escape')
  onEscape(): void { this.open.set(false); }
}