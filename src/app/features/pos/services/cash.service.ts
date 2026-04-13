import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  CashDrawerState,
  CashOperation,
  OpenDrawerRequest,
  CashMovementRequest,
  CloseDrawerRequest,
} from '../models/cash.models';
import { ApiResponse } from '../../../core/models/api.models';
 
 
@Injectable({ providedIn: 'root' })
export class CashService {
 
  private readonly http = inject(HttpClient);
  private readonly base = '/api/pos/cash';
 
  // ── Signals ───────────────────────────────────────────────────────────────
 
  drawer = signal<CashDrawerState | null>(null);
 
  // ── HTTP calls ────────────────────────────────────────────────────────────
 
  loadDrawer(): Observable<ApiResponse<CashDrawerState>> {
    return this.http.get<ApiResponse<CashDrawerState>>(`${this.base}/drawer`).pipe(
      tap(res => { if (res.success) this.drawer.set(res.data); })
    );
  }
 
  openDrawer(req: OpenDrawerRequest): Observable<ApiResponse<CashDrawerState>> {
    return this.http.post<ApiResponse<CashDrawerState>>(`${this.base}/open`, req).pipe(
      tap(res => { if (res.success) this.drawer.set(res.data); })
    );
  }
 
  cashIn(req: CashMovementRequest): Observable<ApiResponse<CashOperation>> {
    return this.http.post<ApiResponse<CashOperation>>(`${this.base}/in`, req).pipe(
      tap(() => this.loadDrawer().subscribe())
    );
  }
 
  cashOut(req: CashMovementRequest): Observable<ApiResponse<CashOperation>> {
    return this.http.post<ApiResponse<CashOperation>>(`${this.base}/out`, req).pipe(
      tap(() => this.loadDrawer().subscribe())
    );
  }
 
  closeDrawer(req: CloseDrawerRequest): Observable<ApiResponse<CashOperation>> {
    return this.http.post<ApiResponse<CashOperation>>(`${this.base}/close`, req).pipe(
      tap(res => {
        if (res.success) this.drawer.update(d => d ? { ...d, open: false } : d);
      })
    );
  }
 
  getOperations(page = 0, size = 20): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.base}/operations?page=${page}&size=${size}`
    );
  }
 
  // ── Helpers ───────────────────────────────────────────────────────────────
 
  get isOpen(): boolean {
    return this.drawer()?.open ?? false;
  }
 
  get expectedBalance(): number {
    return this.drawer()?.expectedBalance ?? 0;
  }
}

