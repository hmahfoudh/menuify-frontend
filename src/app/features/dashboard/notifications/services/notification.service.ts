import { Injectable, inject } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { Observable }         from 'rxjs';
import { map }                from 'rxjs/operators';
import { environment }        from '../../../../../environments/environment';
import { NotificationResponse, ApiResponse } from '../models/notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/dashboard/notifications`;

  getUnread(): Observable<NotificationResponse[]> {
    return this.http
      .get<ApiResponse<NotificationResponse[]>>(this.base)
      .pipe(map(r => r.data));
  }

  markRead(id: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.patch<void>(`${this.base}/read-all`, {});
  }
}