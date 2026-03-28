import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { map, Observable } from 'rxjs';
import { ApiResponse } from '../../../../core/models/api.models';
import { CategoryRequest, CategoryResponse, ReorderRequest } from '../models/menu.models';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  private base = `${environment.apiUrl}/api/dashboard/categories`;

  constructor(private http: HttpClient) { }
 
  getAll(): Observable<CategoryResponse[]> {
    return this.http.get<ApiResponse<CategoryResponse[]>>(this.base)
      .pipe(map(r => r.data));
  }
 
  create(req: CategoryRequest): Observable<CategoryResponse> {
    return this.http.post<ApiResponse<CategoryResponse>>(this.base, req)
      .pipe(map(r => r.data));
  }
 
  update(id: string, req: CategoryRequest): Observable<CategoryResponse> {
    return this.http.put<ApiResponse<CategoryResponse>>(
      `${this.base}/${id}`, req).pipe(map(r => r.data));
  }
 
  uploadImage(id: string, file: File): Observable<CategoryResponse> {
    const fd = new FormData();
    fd.append('image', file);
    return this.http.post<ApiResponse<CategoryResponse>>(
      `${this.base}/${id}/image`, fd).pipe(map(r => r.data));
  }
 
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
 
  reorder(items: ReorderRequest[]): Observable<void> {
    return this.http.patch<void>(`${this.base}/reorder`, items);
  }
 
  toggleVisibility(id: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/visibility`, {});
  }

}
