import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from '../../../core/services/local-storage.service';

@Component({
  selector: 'app-impersonation-banner',
  standalone: true,
  imports: [],
  templateUrl: './impersonation-banner.component.html',
  styleUrl: './impersonation-banner.component.scss'
})
export class ImpersonationBannerComponent {
  private router = inject(Router);
  private localStorage = inject(LocalStorageService);

  visible = signal(this.checkImpersonating());
  ownerEmail = signal(this.getOwnerEmail());

  private checkImpersonating(): boolean {
    return !!this.localStorage.get('superAdminToken');
  }

  private getOwnerEmail(): string {
    try {
      const token = this.localStorage.get('access_token');
      if (!token) return '';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.email ?? '';
    } catch { return ''; }
  }

  exit(): void {
    // Restore the super admin token
    const superToken = this.localStorage.get('superAdminToken');
    const superUser = this.localStorage.get('superAdminUser');

    if (superToken) this.localStorage.set('access_token', superToken);
    if (superUser) this.localStorage.set('user', superUser);

    this.localStorage.remove('superAdminToken');
    this.localStorage.remove('superAdminUser');

    // Navigate back to admin panel
    this.router.navigateByUrl('/admin');
  }
}
