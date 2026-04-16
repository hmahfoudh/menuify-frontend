import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router }       from '@angular/router';
import { map }          from 'rxjs/operators';
import { Observable }   from 'rxjs';
import { environment }  from '../../../../environments/environment';
import { StaffResponse } from '../models/pos.models';
import { SubdomainService } from '../../../core/services/subdomain.service';
import { LocalStorageService } from '../../../core/services/local-storage.service';
import { ApiResponse } from '../../../core/models/api.models';


/**
 * Handles POS authentication for both owner and staff sessions.
 *
 * - Owner: already authenticated via the main AuthService JWT.
 *   PosAuthService detects this and skips the staff login screen.
 *
 * - Staff: authenticate via PIN → receive a short-lived JWT stored
 *   separately as 'access_token'. The main 'accessToken' is NOT used for
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
  staffToken   = signal<string | null>(this.localStorage.get('access_token'));


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

    /** The token to use for POS API calls — staff token takes priority */
  getPosToken(): string | null {
    return this.localStorage.get('access_token');
  }

  // ── Logout ──────────────────────────────────────────────────────────────────

  staffLogout(): void {
    this.localStorage.remove('access_token');
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