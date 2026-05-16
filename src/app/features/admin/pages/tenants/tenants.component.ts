import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  AdminTenantResponse, AdminStatsResponse,
  Plan, PLAN_META
} from '../../models/admin.models';
import { AdminService } from '../../services/admin.service';
import { LocalStorageService } from '../../../../core/services/local-storage.service';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.scss'
})
export class TenantsComponent implements OnInit {

  private svc          = inject(AdminService);
  private router       = inject(Router);
  private localStorage = inject(LocalStorageService);

  // ── State ──────────────────────────────────────────────────────────────────
  stats    = signal<AdminStatsResponse | null>(null);
  tenants  = signal<AdminTenantResponse[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  success  = signal<string | null>(null);

  // ── Search ─────────────────────────────────────────────────────────────────
  searchQuery = signal('');

  // ── Selected tenant (detail panel) ────────────────────────────────────────
  selected     = signal<AdminTenantResponse | null>(null);
  extending    = signal(false);
  extendDays   = signal(14);
  changingPlan = signal(false);
  newPlan      = signal<Plan>('STARTER');
  actioning    = signal(false);
  impersonating = signal(false);

  // ── Constants ──────────────────────────────────────────────────────────────
  readonly planMeta = PLAN_META;
  readonly plans: Plan[] = ['STARTER', 'STANDARD', 'PREMIUM'];

  // ── Computed ───────────────────────────────────────────────────────────────
  filteredTenants = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.tenants();
    return this.tenants().filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.ownerEmail?.toLowerCase().includes(q) ||
      t.subdomain.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.svc.getStats().subscribe({ next: s => this.stats.set(s) });
    this.svc.getTenants().subscribe({
      next: list => { this.tenants.set(list); this.loading.set(false); },
      error: ()   => { this.loading.set(false); this.error.set('Failed to load tenants'); }
    });
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  selectTenant(t: AdminTenantResponse): void {
    this.selected.set(t);
    this.newPlan.set(t.plan);
    this.extending.set(false);
    this.changingPlan.set(false);
  }

  closePanel(): void { this.selected.set(null); }

  // ── Actions ────────────────────────────────────────────────────────────────
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
      error: () => this.actioning.set(false)
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
      error: () => this.actioning.set(false)
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
      error: () => this.actioning.set(false)
    });
  }

  impersonate(t: AdminTenantResponse): void {
    if (!confirm(`Log in as the owner of "${t.name}"?`)) return;
    this.impersonating.set(true);
    this.svc.impersonate(t.id).subscribe({
      next: token => {
        const superToken = this.localStorage.get('access_token');
        const superUser  = this.localStorage.get('user');
        if (superToken) this.localStorage.set('superAdminToken', superToken);
        if (superUser)  this.localStorage.set('superAdminUser', superUser);
        this.localStorage.set('access_token', token);
        this.impersonating.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: () => this.impersonating.set(false)
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  trialLabel(t: AdminTenantResponse): string {
    if (!t.trialEndsAt)  return '—';
    if (t.trialExpired)  return `Expired ${Math.abs(t.daysRemaining)}d ago`;
    if (t.onTrial)       return `${t.daysRemaining}d left`;
    return '—';
  }

  trialClass(t: AdminTenantResponse): string {
    if (t.trialExpired)          return 'badge--danger';
    if (t.daysRemaining <= 3)    return 'badge--warning';
    return 'badge--success';
  }

  setSearch(v: string)    { this.searchQuery.set(v); }
  setExtendDays(v: string){ this.extendDays.set(+v || 7); }
  setNewPlan(v: Plan)     { this.newPlan.set(v); }

  private updateTenant(updated: AdminTenantResponse): void {
    this.tenants.update(list => list.map(t => t.id === updated.id ? updated : t));
  }

  private showSuccess(msg: string): void {
    this.success.set(msg);
    setTimeout(() => this.success.set(null), 3500);
  }
}