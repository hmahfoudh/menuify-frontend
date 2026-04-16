import { Injectable, inject } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { Observable }         from 'rxjs';
import { map }                from 'rxjs/operators';
import {
  CategoryResponse, CategoryRequest,
  ReorderRequest
} from '../models/menu.models';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class CategoryService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/dashboard/categories`;

  getAll(): Observable<CategoryResponse[]> {
    return this.http
      .get<ApiResponse<CategoryResponse[]>>(this.base)
      .pipe(map(r => r.data));
  }

  create(req: CategoryRequest): Observable<CategoryResponse> {
    return this.http
      .post<ApiResponse<CategoryResponse>>(this.base, req)
      .pipe(map(r => r.data));
  }

  update(id: string, req: CategoryRequest): Observable<CategoryResponse> {
    return this.http
      .put<ApiResponse<CategoryResponse>>(`${this.base}/${id}`, req)
      .pipe(map(r => r.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  reorder(requests: ReorderRequest[]): Observable<void> {
    return this.http
      .patch<void>(`${this.base}/reorder`, requests);
  }

  toggleVisibility(id: string): Observable<CategoryResponse> {
    return this.http
      .patch<ApiResponse<CategoryResponse>>(
        `${this.base}/${id}/visibility`, {})
      .pipe(map(r => r.data));
  }

  uploadImage(id: string, file: File): Observable<CategoryResponse> {
    const fd = new FormData();
    fd.append('image', file);
    return this.http
      .post<ApiResponse<CategoryResponse>>(
        `${this.base}/${id}/image`, fd)
      .pipe(map(r => r.data));
  }
}