import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeResponse }     from '../models/public-menu.models';

@Injectable({ providedIn: 'root' })
export class ThemeInjectorService {

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Flattens resolvedTokens JSON → CSS custom properties on :root.
   *
   * Input:
   *   { "colors": { "accent": "#c9a96e" }, "shape": { "cardRadius": "12px" } }
   *
   * Output injected into <head>:
   *   :root {
   *     --colors-accent: #c9a96e;
   *     --shape-cardRadius: 12px;
   *   }
   *
   * The menu page SCSS reads these via var(--colors-accent) etc.
   */
  applyTheme(theme: ThemeResponse): void {
    if (!this.isBrowser) return;

    try {
      const tokens = JSON.parse(theme.resolvedTokens ?? '{}');
      const css    = this.flatten(tokens, '');
      this.inject('menuify-tokens', `:root {\n${css}}`);
    } catch {
      console.warn('[Menuify] Failed to parse theme tokens');
    }

    // Custom CSS (Premium plan) injected after tokens
    if (theme.customCss?.trim()) {
      this.inject('menuify-custom-css', theme.customCss);
    }
  }

  /**
   * Listens for postMessage from the dashboard theme editor iframe.
   * Allows the owner to see live token changes in the preview without
   * reloading the page.
   */
  listenForPreviewUpdates(): void {
    if (!this.isBrowser) return;
    window.addEventListener('message', (e: MessageEvent) => {
      if (e.data?.type === 'THEME_UPDATE' && e.data?.css) {
        this.inject('menuify-tokens', e.data.css);
      }
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private flatten(obj: Record<string, any>, prefix: string): string {
    let css = '';
    for (const [key, value] of Object.entries(obj)) {
      const varName = prefix ? `--${prefix}-${key}` : `--${key}`;
      if (value !== null && typeof value === 'object') {
        css += this.flatten(value, prefix ? `${prefix}-${key}` : key);
      } else {
        css += `  ${varName}: ${value};\n`;
      }
    }
    return css;
  }

  private inject(id: string, css: string): void {
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el       = document.createElement('style');
      el.id    = id;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }
}