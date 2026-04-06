import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { Router }        from '@angular/router';
import { Subject } from 'rxjs';
import {
  AdminTenantResponse, AdminStatsResponse,
  AdminCreateTenantRequest, Plan, PLAN_META
} from '../models/admin.models';
import { AdminService } from '../services/admin.service';

type AdminView = 'tenants' | 'create';

@Component({
  selector:    'app-admin',
  standalone:  true,
  imports:     [CommonModule, FormsModule, DatePipe],
  templateUrl: './admin.component.html',
  styleUrls:   ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {

  private svc    = inject(AdminService);
  private router = inject(Router);

  // ── State ────────────────────────────────────────────────────────────────────
  view         = signal<AdminView>('tenants');
  stats        = signal<AdminStatsResponse | null>(null);
  tenants      = signal<AdminTenantResponse[]>([]);
  loading      = signal(true);
  error        = signal<string | null>(null);
  success      = signal<string | null>(null);

  // ── Search ───────────────────────────────────────────────────────────────────
  searchQuery  = signal('');
  private search$ = new Subject<string>();

  // ── Selected tenant (detail panel) ───────────────────────────────────────────
  selected     = signal<AdminTenantResponse | null>(null);
  extending    = signal(false);
  extendDays   = signal(14);
  changingPlan = signal(false);
  newPlan      = signal<Plan>('STARTER');
  actioning    = signal(false);

  // ── Impersonation ─────────────────────────────────────────────────────────────
  impersonating = signal(false);

  // ── Create form ───────────────────────────────────────────────────────────────
  saving       = signal(false);
  fName        = signal('');
  fSlug        = signal('');
  fSubdomain   = signal('');
  fOwnerName   = signal('');
  fOwnerEmail  = signal('');
  fOwnerPass   = signal('');
  fPlan        = signal<Plan>('STARTER');
  fTrialDays   = signal(14);
  formError    = signal<string | null>(null);

  // ── Constants ─────────────────────────────────────────────────────────────────
  readonly planMeta  = PLAN_META;
  readonly plans: Plan[] = ['STARTER', 'STANDARD', 'PREMIUM'];

  // ── Computed ──────────────────────────────────────────────────────────────────
  filteredTenants = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.tenants();
    return this.tenants().filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.ownerEmail?.toLowerCase().includes(q) ||
      t.subdomain.toLowerCase().includes(q)
    );
  });

  activeCount   = computed(() => this.tenants().filter(t => t.active).length);
  trialCount    = computed(() => this.tenants().filter(t => t.onTrial).length);
  expiredCount  = computed(() => this.tenants().filter(t => t.trialExpired).length);

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAll();

    // Auto-generate slug + subdomain from restaurant name
    // (handled in setName method)
  }

  private loadAll(): void {
    this.loading.set(true);
    this.svc.getStats().subscribe({
      next: s => this.stats.set(s),
      error: () => {}
    });
    this.svc.getTenants().subscribe({
      next: list => { this.tenants.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set('Failed to load tenants'); }
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────────
  showCreate(): void  { this.view.set('create'); this.resetForm(); }
  showTenants(): void { this.view.set('tenants'); }

  selectTenant(t: AdminTenantResponse): void {
    this.selected.set(t);
    this.newPlan.set(t.plan);
    this.extending.set(false);
    this.changingPlan.set(false);
  }

  closePanel(): void { this.selected.set(null); }

  // ── Search ────────────────────────────────────────────────────────────────────
  setSearch(v: string): void { this.searchQuery.set(v); }

  // ── Tenant actions ────────────────────────────────────────────────────────────
  toggleActive(t: AdminTenantResponse): void {
    const call$ = t.active ? this.svc.deactivate(t.id) : this.svc.activate(t.id);
    this.actioning.set(true);
    call$.subscribe({
      next: updated => {
        this.updateTenant(updated);
        if (this.selected()?.id === t.id) this.selected.set(updated);
        this.actioning.set(false);
        this.showSuccess(t.active ? 'Tenant deactivated' : 'Tenant activated');
      },
      error: () => { this.actioning.set(false); }
    });
  }

  submitExtend(): void {
    const t = this.selected();
    if (!t) return;
    this.actioning.set(true);
    this.svc.extendTrial(t.id, this.extendDays()).subscribe({
      next: updated => {
        this.updateTenant(updated);
        this.selected.set(updated);
        this.extending.set(false);
        this.actioning.set(false);
        this.showSuccess(`Trial extended by ${this.extendDays()} days`);
      },
      error: () => { this.actioning.set(false); }
    });
  }

  submitPlanChange(): void {
    const t = this.selected();
    if (!t) return;
    this.actioning.set(true);
    this.svc.changePlan(t.id, this.newPlan()).subscribe({
      next: updated => {
        this.updateTenant(updated);
        this.selected.set(updated);
        this.changingPlan.set(false);
        this.actioning.set(false);
        this.showSuccess('Plan updated');
      },
      error: () => { this.actioning.set(false); }
    });
  }

  // ── Impersonation ─────────────────────────────────────────────────────────────
  impersonate(t: AdminTenantResponse): void {
    if (!confirm(`Log in as the owner of "${t.name}"?`)) return;
    this.impersonating.set(true);
    this.svc.impersonate(t.id).subscribe({
      next: token => {
        // Save super admin token so we can restore it later
        const superToken = localStorage.getItem('accessToken');
        const superUser  = localStorage.getItem('currentUser');
        if (superToken) localStorage.setItem('superAdminToken', superToken);
        if (superUser)  localStorage.setItem('superAdminUser', superUser);

        // Switch to owner session
        localStorage.setItem('accessToken', token);
        this.impersonating.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: () => { this.impersonating.set(false); }
    });
  }

  // ── Create tenant ─────────────────────────────────────────────────────────────
  setName(v: string): void {
    this.fName.set(v);
    // Auto-generate slug and subdomain
    const slug = v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const sub  = v.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    this.fSlug.set(slug);
    this.fSubdomain.set(sub);
  }

  submitCreate(): void {
    if (!this.fName().trim() || !this.fOwnerEmail().trim() || !this.fOwnerPass().trim()) {
      this.formError.set('Please fill all required fields');
      return;
    }
    if (this.fOwnerPass().length < 8) {
      this.formError.set('Password must be at least 8 characters');
      return;
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
      next: t => {
        this.tenants.update(list => [t, ...list]);
        this.saving.set(false);
        this.view.set('tenants');
        this.showSuccess(`Tenant "${t.name}" created successfully`);
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'Failed to create tenant');
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  trialLabel(t: AdminTenantResponse): string {
    if (!t.trialEndsAt) return '—';
    if (t.trialExpired) return `Expired ${Math.abs(t.daysRemaining)}d ago`;
    if (t.onTrial)      return `${t.daysRemaining}d left`;
    return '—';
  }

  trialClass(t: AdminTenantResponse): string {
    if (t.trialExpired) return 'badge--danger';
    if (t.daysRemaining <= 3) return 'badge--warning';
    return 'badge--success';
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    this.router.navigateByUrl('/auth/login');
  }

  private updateTenant(updated: AdminTenantResponse): void {
    this.tenants.update(list => list.map(t => t.id === updated.id ? updated : t));
  }

  private resetForm(): void {
    this.fName.set(''); this.fSlug.set(''); this.fSubdomain.set('');
    this.fOwnerName.set(''); this.fOwnerEmail.set(''); this.fOwnerPass.set('');
    this.fPlan.set('STARTER'); this.fTrialDays.set(14);
    this.formError.set(null);
  }

  private showSuccess(msg: string): void {
    this.success.set(msg);
    setTimeout(() => this.success.set(null), 3500);
  }

  // Setters for template
  setSlug(v: string)      { this.fSlug.set(v); }
  setSubdomain(v: string) { this.fSubdomain.set(v); }
  setOwnerName(v: string) { this.fOwnerName.set(v); }
  setOwnerEmail(v: string){ this.fOwnerEmail.set(v); }
  setOwnerPass(v: string) { this.fOwnerPass.set(v); }
  setPlan(v: Plan)        { this.fPlan.set(v); }
  setTrialDays(v: string) { this.fTrialDays.set(+v || 14); }
  setExtendDays(v: string){ this.extendDays.set(+v || 7); }
  setNewPlan(v: Plan)     { this.newPlan.set(v); }
}