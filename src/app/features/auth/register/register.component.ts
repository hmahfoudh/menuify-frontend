import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ErrorResponse } from '../../../core/models/api.models';

// Shape of the 422 error response from the backend

type Step = 1 | 2;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient);

  step = signal<Step>(1);
  loading = signal(false);
  error = signal<string | null>(null);
  showPass = signal(false);

  // Server-side field errors — keyed exactly as the backend returns them:
  // { "email": "...", "tenant.slug": "...", "tenant.subdomain": "..." }
  serverErrors = signal<ErrorResponse | null>(null);

  // ── Forms ──────────────────────────────────────────────────────────────────
  accountForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  restaurantForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      Validators.pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    ]],
    subdomain: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      Validators.pattern(/^[a-z0-9]+$/)
    ]],
    whatsappNumber: [''],
    city: [''],
  });

  stepLabel = computed(() =>
    this.step() === 1 ? 'Your account' : 'Your restaurant'
  );

  constructor() {
    // Auto-generate slug and subdomain from restaurant name
    this.restaurantForm.get('name')!.valueChanges.subscribe((name: string) => {
      if (!name) return;
      const slug = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const subdomain = name.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
      this.restaurantForm.patchValue({ slug, subdomain }, { emitEvent: false });

      // Clear server errors when the user edits the field
      this.clearServerError('tenant.slug');
      this.clearServerError('tenant.subdomain');
    });

    // Clear server errors when user edits any field
    this.accountForm.get('email')!.valueChanges
      .subscribe(() => this.clearServerError('email'));
    this.restaurantForm.get('slug')!.valueChanges
      .subscribe(() => this.clearServerError('tenant.slug'));
    this.restaurantForm.get('subdomain')!.valueChanges
      .subscribe(() => this.clearServerError('tenant.subdomain'));
  }

  // ── Accessors ──────────────────────────────────────────────────────────────
  get fullName() { return this.accountForm.get('fullName')!; }
  get email() { return this.accountForm.get('email')!; }
  get password() { return this.accountForm.get('password')!; }
  get name() { return this.restaurantForm.get('name')!; }
  get slug() { return this.restaurantForm.get('slug')!; }
  get subdomain() { return this.restaurantForm.get('subdomain')!; }

  // ── Server error helpers ───────────────────────────────────────────────────

  serverError(field: string): string | null {
    return this.serverErrors()?.errors?.[field] ?? null;
  }

  private clearServerError(field: string): void {
    const current = this.serverErrors();

    if (!current?.errors?.[field]) return;

    const updatedErrors = { ...current.errors };
    delete updatedErrors[field];

    this.serverErrors.set({
      ...current,
      errors: updatedErrors
    });
  }

  private applyServerErrors(response: ErrorResponse): void {
    this.serverErrors.set(response);
    console.log('Applying server errors', response);
    const errors = response.errors ?? {};

    // If any account-level errors exist, jump back to step 1
    const accountFields = ['email', 'fullName', 'password'];
    const hasAccountErrors = accountFields.some(f => errors[f]);

    if (hasAccountErrors) {
      this.step.set(1);
    }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  togglePassword() { this.showPass.update(v => !v); }

  nextStep(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.step.set(2);
  }

  prevStep(): void {
    this.step.set(1);
    this.error.set(null);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.restaurantForm.invalid) {
      this.restaurantForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.serverErrors.set(null);

    const payload = {
      ...this.accountForm.value,
      tenant: this.restaurantForm.value,
    };

    this.http.post<any>(
      `${environment.apiUrl}/api/auth/register`,
      payload
    ).subscribe({
      next: res => {
        // Persist auth data exactly as login does
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(res.data.user));
        localStorage.setItem('currentTenant', JSON.stringify(res.data.tenant));
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.loading.set(false);

        const body: ErrorResponse = err.error;
        console.log('Registration error', body);
        if (err.status === 422 && body?.code === 'FIELD_VALIDATION_FAILED') {

          // Case 1: Field validation errors (MethodArgumentNotValidException)
          if (body.errors && Object.keys(body.errors).length > 0) {
            console.log('Field validation errors:', body.errors);
            this.applyServerErrors(body);
            return;
          }

          // Case 2: Global validation error (ValidationException)
          this.error.set(body.message || 'Validation failed');
          return;
        }

        // Fallback (500, network, etc.)
        this.error.set(
          body?.message ?? 'Registration failed. Please try again.'
        );
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getPasswordStrength(): { label: string; level: 0 | 1 | 2 | 3 } {
    const val = this.password.value ?? '';
    if (val.length === 0) return { label: '', level: 0 };
    if (val.length < 6) return { label: 'Weak', level: 1 };
    if (val.length < 10) return { label: 'Fair', level: 2 };
    return { label: 'Strong', level: 3 };
  }
}