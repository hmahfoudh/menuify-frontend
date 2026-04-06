import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { LocalStorageService } from '../../../core/services/local-storage.service';

@Component({
  selector: 'app-email-verification-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-verification-banner.component.html',
  styleUrl: './email-verification-banner.component.scss'
})
export class EmailVerificationBannerComponent {
 
  private http = inject(HttpClient);
  private localStorage = inject(LocalStorageService);
 
  sending  = signal(false);
  sent     = signal(false);
  dismissed = signal(false);
 
  visible = signal(this.shouldShow());
 
  private shouldShow(): boolean {
    try {
      const raw = this.localStorage.get('user');
      if (!raw) return false;
      const user = JSON.parse(raw);
      return user.emailVerified === false;
    } catch {
      return false;
    }
  }
 
  resend(): void {
    const email = this.getUserEmail();
    if (!email || this.sending() || this.sent()) return;
 
    this.sending.set(true);
    this.http.post(
      `${environment.apiUrl}/api/auth/resend-verification`,
      { email }
    ).subscribe({
      next: ()  => { this.sending.set(false); this.sent.set(true); },
      error: () => { this.sending.set(false); this.sent.set(true); }
      // Always show "sent" — prevent email enumeration
    });
  }
 
  dismiss(): void {
    this.visible.set(false);
  }
 
  private getUserEmail(): string {
    try {
      return JSON.parse(this.localStorage.get('user') ?? '{}')?.email ?? '';
    } catch { return ''; }
  }
}

