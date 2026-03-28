import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ItemRequest, ItemResponse, ReorderRequest } from '../models/menu.models';
import { ApiResponse } from '../../../../core/models/api.models';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ItemService {

  private base = `${environment.apiUrl}/api/dashboard/items`;

  constructor(private http: HttpClient) { }
  
 
  getByCategory(categoryId: string): Observable<ItemResponse[]> {
    return this.http.get<ApiResponse<ItemResponse[]>>(
      `${this.base}/category/${categoryId}`).pipe(map(r => r.data));
  }
 
  getById(id: string): Observable<ItemResponse> {
    return this.http.get<ApiResponse<ItemResponse>>(
      `${this.base}/${id}`).pipe(map(r => r.data));
  }
 
  create(req: ItemRequest, image?: File): Observable<ItemResponse> {
    const fd = new FormData();
    fd.append('data', new Blob([JSON.stringify(req)],
      { type: 'application/json' }));
    if (image) fd.append('image', image);
    return this.http.post<ApiResponse<ItemResponse>>(this.base, fd)
      .pipe(map(r => r.data));
  }
 
  update(id: string, req: ItemRequest, image?: File): Observable<ItemResponse> {
    const fd = new FormData();
    fd.append('data', new Blob([JSON.stringify(req)],
      { type: 'application/json' }));
    if (image) fd.append('image', image);
    return this.http.put<ApiResponse<ItemResponse>>(
      `${this.base}/${id}`, fd).pipe(map(r => r.data));
  }
 
  toggleAvailability(id: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/availability`, {});
  }
 
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
 
  reorder(items: ReorderRequest[]): Observable<void> {
    return this.http.patch<void>(`${this.base}/reorder`, items);
  }
}
