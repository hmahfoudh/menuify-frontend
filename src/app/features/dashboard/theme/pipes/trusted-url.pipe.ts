import { Pipe, PipeTransform, inject } from '@angular/core';
import {
  DomSanitizer, SafeResourceUrl
} from '@angular/platform-browser';

/**
 * Bypasses Angular's URL sanitization for iframe src.
 * Required because Angular blocks dynamic URLs in [src] by default.
 *
 * Usage: [src]="previewUrl() | trustedUrl"
 *
 * Only use this for URLs you control — i.e. your own subdomain.
 */
@Pipe({ name: 'trustedUrl', standalone: true })
export class TrustedUrlPipe implements PipeTransform {

  private sanitizer = inject(DomSanitizer);

  transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}