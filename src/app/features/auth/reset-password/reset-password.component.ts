import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { HttpClient }      from '@angular/common/http';
import { environment }     from '../../../../environments/environment';

@Component({
  selector:    'app-reset-password',
  standalone:  true,
  imports:     [CommonModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls:   ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {

  private http   = inject(HttpClient);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  token      = signal('');
  email      = signal('');        // pre-filled from token validation
  password   = signal('');
  showPass   = signal(false);

  // UI state
  validating = signal(true);     // checking the token on load
  invalid    = signal(false);    // token is bad / expired
  loading    = signal(false);
  done       = signal(false);
  error      = signal<string | null>(null);

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!t) { this.invalid.set(true); this.validating.set(false); return; }

    this.token.set(t);

    // Validate token before showing the form
    this.http.get<any>(
      `${environment.apiUrl}/api/auth/reset-password`,
      { params: { token: t } }
    ).subscribe({
      next: res => {
        this.email.set(res.data ?? '');
        this.validating.set(false);
      },
      error: () => {
        this.invalid.set(true);
        this.validating.set(false);
      }
    });
  }

  setPassword(v: string) { this.password.set(v); }
  toggleShowPass()        { this.showPass.update(v => !v); }

  submit(): void {
    if (this.password().length < 8) {
      this.error.set('Password must be at least 8 characters');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.http.post(
      `${environment.apiUrl}/api/auth/reset-password`,
      { token: this.token(), newPassword: this.password() }
    ).subscribe({
      next: () => { this.loading.set(false); this.done.set(true); },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Failed to reset password. Try requesting a new link.');
      }
    });
  }

  passwordStrength(): { label: string; level: 0|1|2|3 } {
    const v = this.password();
    if (!v)         return { label: '',       level: 0 };
    if (v.length < 6) return { label: 'Weak',   level: 1 };
    if (v.length < 10)return { label: 'Fair',   level: 2 };
    return               { label: 'Strong', level: 3 };
  }
}