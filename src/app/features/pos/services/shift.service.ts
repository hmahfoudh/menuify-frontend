import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Shift, OpenShiftRequest, CloseShiftRequest } from '../models/shift.models';
import { ApiResponse, PageResponse } from '../../../core/models/api.models';
 
 
@Injectable({ providedIn: 'root' })
export class ShiftService {
 
  private readonly http = inject(HttpClient);
  private readonly base = '/api/pos/shifts';
 
  /** Currently open shift — null if no shift is open */
  currentShift = signal<Shift | null>(null);
 
  // ── HTTP calls ────────────────────────────────────────────────────────────
 
  openShift(req: OpenShiftRequest): Observable<ApiResponse<Shift>> {
    return this.http.post<ApiResponse<Shift>>(`${this.base}/open`, req).pipe(
      tap(res => { if (res.success) this.currentShift.set(res.data); })
    );
  }
 
  closeShift(req: CloseShiftRequest): Observable<ApiResponse<Shift>> {
    return this.http.post<ApiResponse<Shift>>(`${this.base}/close`, req).pipe(
      tap(res => { if (res.success) this.currentShift.set(null); })
    );
  }
 
  /**
   * Load the current open shift with live totals (X Report).
   * Call on POS init and poll every 60s.
   * Sets currentShift signal — null if 404 (no open shift).
   */
  loadCurrentShift(): Observable<ApiResponse<Shift>> {
    return this.http.get<ApiResponse<Shift>>(`${this.base}/current`).pipe(
      tap(res => { if (res.success) this.currentShift.set(res.data); })
    );
  }
 
  getShifts(page = 0, size = 20): Observable<ApiResponse<PageResponse<Shift>>> {
    return this.http.get<ApiResponse<PageResponse<Shift>>>(
      `${this.base}?page=${page}&size=${size}`
    );
  }
 
  getShift(id: string): Observable<ApiResponse<Shift>> {
    return this.http.get<ApiResponse<Shift>>(`${this.base}/${id}`);
  }
 
  // ── Helpers ───────────────────────────────────────────────────────────────
 
  get isShiftOpen(): boolean {
    return this.currentShift()?.status === 'OPEN';
  }
 
  get liveRevenue(): number {
    return this.currentShift()?.totalRevenue ?? 0;
  }
}
