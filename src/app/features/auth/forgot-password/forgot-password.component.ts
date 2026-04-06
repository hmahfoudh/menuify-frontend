import { Component, signal, inject } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { RouterLink }    from '@angular/router';
import { HttpClient }    from '@angular/common/http';
import { FormsModule }   from '@angular/forms';
import { environment }   from '../../../../environments/environment';

@Component({
  selector:    'app-forgot-password',
  standalone:  true,
  imports:     [CommonModule, RouterLink, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls:   ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {

  private http = inject(HttpClient);

  email    = signal('');
  loading  = signal(false);
  sent     = signal(false);
  error    = signal<string | null>(null);

  setEmail(v: string) { this.email.set(v); }

  submit(): void {
    const e = this.email().trim();
    if (!e || !e.includes('@')) { this.error.set('Enter a valid email address'); return; }

    this.loading.set(true);
    this.error.set(null);

    this.http.post(
      `${environment.apiUrl}/api/auth/forgot-password`,
      { email: e }
    ).subscribe({
      next: () => { this.loading.set(false); this.sent.set(true); },
      error: ()  => { this.loading.set(false); this.sent.set(true); }
      // Always show success — never reveal if email exists
    });
  }
}