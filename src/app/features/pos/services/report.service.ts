import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  XReportResponse,
  ZReportResponse,
  DailySummaryResponse,
  RangeSummaryResponse,
} from '../models/report.models';
import { ApiResponse } from '../../../core/models/api.models';
import { environment } from '../../../../environments/environment';
 
 
@Injectable({ providedIn: 'root' })
export class ReportService {
 
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl +'/api/pos/reports';
 
  /** Live X Report for the current open shift */
  getXReport(): Observable<ApiResponse<XReportResponse>> {
    return this.http.get<ApiResponse<XReportResponse>>(`${this.base}/x`);
  }
 
  /** Z Report for a specific closed shift */
  getZReport(shiftId: string): Observable<ApiResponse<ZReportResponse>> {
    return this.http.get<ApiResponse<ZReportResponse>>(`${this.base}/z/${shiftId}`);
  }
 
  /**
   * Daily summary for a given date.
   * date format: 'YYYY-MM-DD'
   */
  getDailySummary(
    date: string,
    timezone = 'Africa/Tunis'
  ): Observable<ApiResponse<DailySummaryResponse>> {
    const params = new HttpParams()
      .set('date', date)
      .set('timezone', timezone);
    return this.http.get<ApiResponse<DailySummaryResponse>>(
      `${this.base}/daily`, { params }
    );
  }
 
  /**
   * Revenue summary over a date range.
   * from/to format: 'YYYY-MM-DD'. Max 90 days.
   */
  getRangeSummary(
    from: string,
    to: string,
    timezone = 'Africa/Tunis'
  ): Observable<ApiResponse<RangeSummaryResponse>> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('timezone', timezone);
    return this.http.get<ApiResponse<RangeSummaryResponse>>(
      `${this.base}/range`, { params }
    );
  }
}
