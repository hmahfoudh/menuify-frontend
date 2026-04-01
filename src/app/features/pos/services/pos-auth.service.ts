import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router }       from '@angular/router';
import { map }          from 'rxjs/operators';
import { Observable }   from 'rxjs';
import { environment }  from '../../../../environments/environment';
import { StaffResponse } from '../models/pos.models';
import { SubdomainService } from '../../../core/services/subdomain.service';
import { LocalStorageService } from '../../../core/services/local-storage.service';

interface ApiResponse<T> { success: boolean; data: T; message: string; }

/**
 * Handles POS authentication for both owner and staff sessions.
 *
 * - Owner: already authenticated via the main AuthService JWT.
 *   PosAuthService detects this and skips the staff login screen.
 *
 * - Staff: authenticate via PIN → receive a short-lived JWT stored
 *   separately as 'posToken'. The main 'accessToken' is NOT used for
 *   POS API calls so owner sessions are not affected.
 */
@Injectable({ providedIn: 'root' })
export class PosAuthService {

  private http      = inject(HttpClient);
  private router    = inject(Router);
  private subdomain = inject(SubdomainService);
  private localStorage = inject(LocalStorageService);
  private base      = environment.apiUrl;

  // ── State ───────────────────────────────────────────────────────────────────
  currentStaff = signal<StaffResponse | null>(this.loadStaff());
  staffToken   = signal<string | null>(this.localStorage.get('posToken'));

  // ── Staff card list (shown on login screen) ─────────────────────────────────
  // Public endpoint — no JWT required. Resolves tenant from X-Tenant-Subdomain.
  // Returns only id/name/color — nothing sensitive.

  getLoginCards(): Observable<StaffResponse[]> {
    const headers = new HttpHeaders({ 'X-Tenant-Subdomain': this.getTenantSubdomain() });
    return this.http
      .get<ApiResponse<StaffResponse[]>>(
        `${this.base}/api/pos/staff/cards`,
        { headers }
      )
      .pipe(map(r => r.data));
  }

  /**
   * Returns the tenant subdomain for use in X-Tenant-Subdomain headers.
   *
   * On blackrabbit.menuify.tn → SubdomainService returns 'blackrabbit' directly.
   * On app.menuify.tn (owner quick access) → falls back to localStorage.
   */
  getTenantSubdomain(): string {
    const fromUrl = this.subdomain.getSubdomain();
    // If we're on a tenant subdomain, use it directly — most reliable source
    if (fromUrl && !['app', 'dashboard', 'admin', 'localhost', ''].includes(fromUrl)) {
      return fromUrl;
    }
    // Fallback for app.menuify.tn: read from owner's localStorage
    try {
      const raw = this.localStorage.get('tenant');
      if (!raw) return '';
      return JSON.parse(raw)?.subdomain ?? '';
    } catch {
      return '';
    }
  }

  // ── PIN login ───────────────────────────────────────────────────────────────

  staffLogin(staffId: string, pin: string): Observable<string> {
    const headers = new HttpHeaders({
      'X-Tenant-Subdomain': this.getTenantSubdomain()
    });
    return this.http
      .post<ApiResponse<string>>(
        `${this.base}/api/auth/staff-login`,
        { staffId, pin },
        { headers }
      )
      .pipe(
        map(r => {
          const token = r.data;
          this.localStorage.set('posToken', token);
          this.staffToken.set(token);
          return token;
        })
      );
  }

  // ── Role detection ──────────────────────────────────────────────────────────

  /**
   * Parses a JWT payload safely. Returns null on any error.
   * Does NOT validate the signature — that's the backend's job.
   */
  private parseToken(token: string): Record<string, any> | null {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  /** True when a valid, non-expired owner/admin token is present. */
  isOwner(): boolean {
    const token = this.localStorage.get('access_token');
    if (!token) return false;
    const payload = this.parseToken(token);
    if (!payload) return false;
    if (payload['exp'] * 1000 < Date.now()) return false;
    // Must NOT be a staff token
    const roles: string[] = Array.isArray(payload['roles']) ? payload['roles'] : [];
    return payload['tokenType'] !== 'STAFF'
      && !roles.includes('ROLE_STAFF');
  }

  /** True when a valid, non-expired staff PIN session (posToken) is present. */
  isStaffLoggedIn(): boolean {
    const token = this.localStorage.get('posToken');
    if (!token) return false;
    const payload = this.parseToken(token);
    if (!payload) return false;
    return payload['exp'] * 1000 > Date.now();
  }

  /** True if either owner or staff can access the POS. */
  canAccessPOS(): boolean {
    return this.isOwner() || this.isStaffLoggedIn();
  }

  getStaffName(): string {
    const token = this.staffToken();
    if (!token) return '';
    const payload = this.parseToken(token);
    return payload?.['name'] ?? '';
  }

  /** The token to use for POS API calls — staff token takes priority */
  getPosToken(): string | null {
    return this.localStorage.get('posToken') ?? this.localStorage.get('access_token');
  }

  // ── Logout ──────────────────────────────────────────────────────────────────

  staffLogout(): void {
    this.localStorage.remove('posToken');
    this.staffToken.set(null);
    this.currentStaff.set(null);
    this.router.navigateByUrl('/pos/login');
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private loadStaff(): StaffResponse | null {
    const raw = this.localStorage.get('currentStaff');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
}