import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from '../models/auth.models';
import { ApiResponse } from '../models/api.models';
import { LocalStorageService } from './local-storage.service';
import { TenantResponse } from '../models/tenant.models';
import { Observable } from 'rxjs';
import { StaffResponse } from '../../features/pos/models/pos.models';

@Injectable({ providedIn: 'root' })
export class AuthService {

    private readonly base = environment.apiUrl;
    private readonly storage = inject(LocalStorageService);

    // ── Signals ──────────────────────────────────────────────────────────────
    private _accessToken = signal<string | null>(this.storage.get('access_token'));
    private _refreshToken = signal<string | null>(this.storage.get('refresh_token'));
    private _user = signal<UserResponse | null>(this.storage.getJson('user'));
    private _tenant = signal<TenantResponse | null>(this.storage.getJson('tenant'));

    // Public readonly
    accessToken = this._accessToken.asReadonly();
    refreshToken = this._refreshToken.asReadonly();
    currentUser = this._user.asReadonly();
    currentTenant = this._tenant.asReadonly();
    isLoggedIn = computed(() => !!this._accessToken());

    constructor(private http: HttpClient, private router: Router) { }

    login(req: LoginRequest): Observable<ApiResponse<AuthResponse>> {
        return this.http
            .post<ApiResponse<AuthResponse>>(`${this.base}/api/auth/login`, req)
            .pipe(tap(res => this.storeSession(res.data)));
    }

    register(req: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
        return this.http
            .post<ApiResponse<AuthResponse>>(`${this.base}/api/auth/register`, req)
            .pipe(tap(res => this.storeSession(res.data)));
    }

    logout() {
        const token = this._refreshToken();
        if (token) {
            this.http.post(`${this.base}/api/auth/logout`,
                { refreshToken: token }).subscribe();
        }
        this.clearSession();
        this.router.navigate(['/auth/login']);
    }

    refreshTenant(t: TenantResponse) {
        this._tenant.set(t);
        this.storage.setJson('tenant', t);
    }

    // ── PIN login ───────────────────────────────────────────────────────────────

    staffLogin(staffId: string, pin: string): Observable<string> {
        return this.http
            .post<ApiResponse<string>>(
                `${this.base}/api/auth/staff-login`,
                { staffId, pin }
            )
            .pipe(
                map(r => {
                    const token = r.data;
                    this.storage.set('access_token', token);
                    this._accessToken.set(token);
                    return token;
                })
            );
    }

    // ── Staff card list (shown on login screen) ─────────────────────────────────
    // Public endpoint — no JWT required. Resolves tenant from X-Tenant-Subdomain.
    // Returns only id/name/color — nothing sensitive.

    getLoginCards(): Observable<StaffResponse[]> {
        return this.http
            .get<ApiResponse<StaffResponse[]>>(
                `${this.base}/api/pos/staff/cards`,
            )
            .pipe(map(r => r.data));
    }

    /** True when a valid, non-expired owner/admin token is present. */
    isOwner(): boolean {
        const token = this.storage.get('access_token');
        if (!token) return false;
        const payload = this.parseToken(token);
        if (!payload) return false;
        if (payload['exp'] * 1000 < Date.now()) return false;
        // Must NOT be a staff token
        const roles: string[] = Array.isArray(payload['roles']) ? payload['roles'] : [];
        return payload['tokenType'] !== 'STAFF'
            && !roles.includes('ROLE_STAFF');
    }

    /** True when a valid, non-expired staff PIN session (access_token) is present. */
    isStaffLoggedIn(): boolean {
        const token = this.storage.get('access_token');
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
        const token = this._accessToken();
        if (!token) return '';
        const payload = this.parseToken(token);
        return payload?.['name'] ?? '';
    }

    staffLogout(): void {
        this.clearSession();
        this.router.navigateByUrl('/pos/login');
    }

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


    private storeSession(data: AuthResponse): void {
        this.storage.set('access_token', data.accessToken);
        this.storage.set('refresh_token', data.refreshToken);
        this.storage.setJson('user', data.user);
        this.storage.setJson('tenant', data.tenant);
        this._accessToken.set(data.accessToken);
        this._refreshToken.set(data.refreshToken);
        this._user.set(data.user);
        this._tenant.set(data.tenant);
    }

    private clearSession(): void {
        this.storage.remove('access_token');
        this.storage.remove('refresh_token');
        this.storage.remove('user');
        this.storage.remove('tenant');
        this._accessToken.set(null);
        this._refreshToken.set(null);
        this._user.set(null);
        this._tenant.set(null);
    }
}