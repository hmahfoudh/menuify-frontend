import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AdminCreateTenantRequest, Plan, PLAN_META } from '../../models/admin.models';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-create-tenant',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './create-tenant.component.html',
  styleUrl: './create-tenant.component.scss'
})
export class CreateTenantComponent {

  private svc    = inject(AdminService);
  private router = inject(Router);

  saving    = signal(false);
  formError = signal<string | null>(null);

  fName      = signal('');
  fSlug      = signal('');
  fSubdomain = signal('');
  fOwnerName = signal('');
  fOwnerEmail = signal('');
  fOwnerPass = signal('');
  fPlan      = signal<Plan>('STARTER');
  fTrialDays = signal(14);

  readonly planMeta = PLAN_META;
  readonly plans: Plan[] = ['STARTER', 'STANDARD', 'PREMIUM'];

  setName(v: string): void {
    this.fName.set(v);
    this.fSlug.set(v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    this.fSubdomain.set(v.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''));
  }

  submit(): void {
    if (!this.fName().trim() || !this.fOwnerEmail().trim() || !this.fOwnerPass().trim()) {
      this.formError.set('Please fill all required fields'); return;
    }
    if (this.fOwnerPass().length < 8) {
      this.formError.set('Password must be at least 8 characters'); return;
    }

    this.saving.set(true);
    this.formError.set(null);

    const req: AdminCreateTenantRequest = {
      restaurantName: this.fName().trim(),
      slug:           this.fSlug().trim(),
      subdomain:      this.fSubdomain().trim(),
      ownerName:      this.fOwnerName().trim(),
      ownerEmail:     this.fOwnerEmail().trim(),
      ownerPassword:  this.fOwnerPass(),
      plan:           this.fPlan(),
      trialDays:      this.fTrialDays(),
    };

    this.svc.createTenant(req).subscribe({
      next: () => { this.saving.set(false); this.router.navigate(['/admin/tenants']); },
      error: err => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'Failed to create tenant');
      }
    });
  }

  setSlug(v: string)      { this.fSlug.set(v); }
  setSubdomain(v: string) { this.fSubdomain.set(v); }
  setOwnerName(v: string) { this.fOwnerName.set(v); }
  setOwnerEmail(v: string){ this.fOwnerEmail.set(v); }
  setOwnerPass(v: string) { this.fOwnerPass.set(v); }
  setPlan(v: Plan)        { this.fPlan.set(v); }
  setTrialDays(v: string) { this.fTrialDays.set(+v || 14); }
}