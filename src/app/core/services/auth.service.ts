import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from '../models/auth.models';
import { ApiResponse } from '../models/api.models';
import { LocalStorageService } from './local-storage.service';
import { TenantResponse } from '../models/tenant.models';

@Injectable({ providedIn: 'root' })
export class AuthService {

    private readonly api = environment.apiUrl;
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

    login(req: LoginRequest) {
        return this.http
            .post<ApiResponse<AuthResponse>>(`${this.api}/api/auth/login`, req)
            .pipe(tap(res => this.storeSession(res.data)));
    }

    register(req: RegisterRequest) {
        return this.http
            .post<ApiResponse<AuthResponse>>(`${this.api}/api/auth/register`, req)
            .pipe(tap(res => this.storeSession(res.data)));
    }

    logout() {
        const token = this._refreshToken();
        if (token) {
            this.http.post(`${this.api}/api/auth/logout`,
                { refreshToken: token }).subscribe();
        }
        this.clearSession();
        this.router.navigate(['/auth/login']);
    }

    refreshTenant(t: TenantResponse) {
        this._tenant.set(t);
        this.storage.setJson('tenant', t);
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