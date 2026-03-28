import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get(key: string): string | null {
    return this.isBrowser ? localStorage.getItem(key) : null;
  }

  getJson<T>(key: string): T | null {
    try {
      const raw = this.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    if (this.isBrowser) localStorage.setItem(key, value);
  }

  setJson(key: string, value: unknown): void {
    this.set(key, JSON.stringify(value));
  }

  remove(key: string): void {
    if (this.isBrowser) localStorage.removeItem(key);
  }

  clear(): void {
    if (this.isBrowser) localStorage.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}