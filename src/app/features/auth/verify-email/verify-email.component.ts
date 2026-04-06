import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { HttpClient }      from '@angular/common/http';
import { environment }     from '../../../../environments/environment';
import { LocalStorageService } from '../../../core/services/local-storage.service';

/**
 * Handles GET /auth/verify-email?token=xxx
 *
 * This component is loaded when the owner clicks the verification link
 * in their email. It immediately calls the backend to verify the token
 * and shows a success or error state.
 */
@Component({
  selector:    'app-verify-email',
  standalone:  true,
  imports:     [CommonModule, RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrls:   ['./verify-email.component.scss'],
})
export class VerifyEmailComponent implements OnInit {

  private localStorage = inject(LocalStorageService);
  private http   = inject(HttpClient);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  state = signal<'loading' | 'success' | 'error'>('loading');
  errorMsg = signal<string>('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!token) {
      this.state.set('error');
      this.errorMsg.set('No verification token found in the link.');
      return;
    }

    this.http.get<any>(
      `${environment.apiUrl}/api/auth/verify-email`,
      { params: { token } }
    ).subscribe({
      next: () => {
        this.state.set('success');
        // Also update the stored user so the banner disappears immediately
        this.updateLocalUserVerified();
        // Auto-redirect to dashboard after 3 seconds
        setTimeout(() => this.router.navigateByUrl('/dashboard'), 3000);
      },
      error: err => {
        this.state.set('error');
        this.errorMsg.set(
          err?.error?.message ?? 'Verification failed. The link may have expired.'
        );
      }
    });
  }

  private updateLocalUserVerified(): void {
    try {
      const raw = this.localStorage.get('user');
      if (!raw) return;
      const user = JSON.parse(raw);
      user.emailVerified = true;
      this.localStorage.setJson('user', user);
    } catch { /* ignore */ }
  }
}