import { Injectable, inject } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { Observable }         from 'rxjs';
import { map }                from 'rxjs/operators';
import { environment }        from '../../../../../environments/environment';
import {
  QrCodeResponse, QrCodeRequest
} from '../models/qr.models';
import { ApiResponse } from '../../../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class QrCodeService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/dashboard/qr`;

  getAll(): Observable<QrCodeResponse[]> {
    return this.http
      .get<ApiResponse<QrCodeResponse[]>>(this.base)
      .pipe(map(r => r.data));
  }

  create(req: QrCodeRequest): Observable<QrCodeResponse> {
    return this.http
      .post<ApiResponse<QrCodeResponse>>(this.base, req)
      .pipe(map(r => r.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}