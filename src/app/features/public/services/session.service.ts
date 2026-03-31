import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { v4 as uuidv4 } from 'uuid';
import { LocalStorageService } from '../../../core/services/local-storage.service';
@Injectable({ providedIn: 'root' })
export class SessionService {

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private localStorage = inject(LocalStorageService);

  /** Anonymous session UUID — persisted in sessionStorage for the tab lifetime */
  getSessionId(): string {
    if (!this.isBrowser) return 'ssr';
    const key      = 'menuify_sid';
    const existing = this.localStorage.get(key);
    if (existing) return existing;
    const id = uuidv4();
    this.localStorage.set(key, id);
    return id;
  }

  /** ?table=5 from the URL */
  getTableNumber(): string | null {
    if (!this.isBrowser) return null;
    return new URLSearchParams(window.location.search).get('table');
  }

  /** ?qr=abc123 from the URL */
  getQrCode(): string | null {
    if (!this.isBrowser) return null;
    return new URLSearchParams(window.location.search).get('qr');
  }

  /** Opens a WhatsApp deep-link with a pre-filled message */
  openWhatsApp(phone: string, message: string): void {
    if (!this.isBrowser) return;
    const clean   = phone.replace(/\s+/g, '');
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${clean}?text=${encoded}`, '_blank', 'noopener');
  }
}