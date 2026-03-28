import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map }        from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  AnalyticsSummaryResponse, ApiResponse, Period
} from '../models/analytics.models';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/dashboard/analytics`;

  getSummary(period: Period): Observable<AnalyticsSummaryResponse> {
    const params = new HttpParams().set('period', period);
    return this.http
      .get<ApiResponse<AnalyticsSummaryResponse>>(this.base, { params })
      .pipe(map(r => r.data));
  }
}