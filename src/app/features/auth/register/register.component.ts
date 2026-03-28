import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl
} from '@angular/forms';

type Step = 1 | 2;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {

  step     = signal<Step>(1);
  loading  = signal(false);
  error    = signal<string | null>(null);
  showPass = signal(false);

  // Step 1: account credentials
  accountForm: FormGroup;

  // Step 2: restaurant info
  restaurantForm: FormGroup;

  stepLabel = computed(() =>
    this.step() === 1 ? 'Your account' : 'Your restaurant'
  );

  constructor(private fb: FormBuilder, private router: Router) {

    this.accountForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    this.restaurantForm = this.fb.group({
      name:       ['', [Validators.required, Validators.minLength(2)]],
      slug:       ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      ]],
      subdomain:  ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[a-z0-9]+$/)
      ]],
      whatsappNumber: [''],
      city:           ['']
    });

    // Auto-generate slug and subdomain from name
    this.restaurantForm.get('name')!.valueChanges.subscribe((name: string) => {
      if (!name) return;
      const slug      = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const subdomain = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
      this.restaurantForm.patchValue({ slug, subdomain }, { emitEvent: false });
    });
  }

  get fullName()  { return this.accountForm.get('fullName')!;  }
  get email()     { return this.accountForm.get('email')!;     }
  get password()  { return this.accountForm.get('password')!;  }
  get name()      { return this.restaurantForm.get('name')!;   }
  get slug()      { return this.restaurantForm.get('slug')!;   }
  get subdomain() { return this.restaurantForm.get('subdomain')!; }

  togglePassword() { this.showPass.update(v => !v); }

  nextStep() {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.step.set(2);
  }

  prevStep() {
    this.step.set(1);
    this.error.set(null);
  }

  onSubmit() {
    if (this.restaurantForm.invalid) {
      this.restaurantForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const payload = {
      ...this.accountForm.value,
      tenant: this.restaurantForm.value
    };

    // TODO: inject AuthService and call authService.register(payload)
    console.log('Register payload:', payload);
    setTimeout(() => {
      this.loading.set(false);
      this.router.navigate(['/dashboard']);
    }, 1400);
  }

  getPasswordStrength(): { label: string; level: 0|1|2|3 } {
    const val = this.password.value ?? '';
    if (val.length === 0)  return { label: '',        level: 0 };
    if (val.length < 6)    return { label: 'Weak',    level: 1 };
    if (val.length < 10)   return { label: 'Fair',    level: 2 };
    return                        { label: 'Strong',  level: 3 };
  }
}