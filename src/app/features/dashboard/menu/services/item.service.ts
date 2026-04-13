import { Injectable, inject } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { Observable }         from 'rxjs';
import { map }                from 'rxjs/operators';
import {
  ItemResponse, ItemRequest,
  VariantGroupResponse, VariantGroupRequest,
  VariantRequest,
  ModifierGroupResponse, ModifierGroupRequest,
  ModifierRequest,
  ReorderRequest
} from '../models/menu.models';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class ItemService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/dashboard/items`;

  // ── Items ──────────────────────────────────────────────────────────────────

  getByCategory(categoryId: string): Observable<ItemResponse[]> {
    return this.http
      .get<ApiResponse<ItemResponse[]>>(
        `${this.base}/category/${categoryId}`)
      .pipe(map(r => r.data));
  }

  getById(id: string): Observable<ItemResponse> {
    return this.http
      .get<ApiResponse<ItemResponse>>(`${this.base}/${id}`)
      .pipe(map(r => r.data));
  }

  create(req: ItemRequest, image?: File): Observable<ItemResponse> {
    const fd = new FormData();
    fd.append('data', new Blob([JSON.stringify(req)],
      { type: 'application/json' }));
    if (image) fd.append('image', image);
    return this.http
      .post<ApiResponse<ItemResponse>>(this.base, fd)
      .pipe(map(r => r.data));
  }

  update(id: string, req: ItemRequest,
         image?: File): Observable<ItemResponse> {
    const fd = new FormData();
    fd.append('data', new Blob([JSON.stringify(req)],
      { type: 'application/json' }));
    if (image) fd.append('image', image);
    return this.http
      .put<ApiResponse<ItemResponse>>(`${this.base}/${id}`, fd)
      .pipe(map(r => r.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  toggleAvailability(id: string): Observable<void> {
    return this.http
      .patch<void>(`${this.base}/${id}/availability`, {});
  }

  reorder(requests: ReorderRequest[]): Observable<void> {
    return this.http
      .patch<void>(`${this.base}/reorder`, requests);
  }

  // ── Variant groups ─────────────────────────────────────────────────────────

  getVariantGroups(itemId: string): Observable<VariantGroupResponse[]> {
    return this.http
      .get<ApiResponse<VariantGroupResponse[]>>(
        `${this.base}/${itemId}/variant-groups`)
      .pipe(map(r => r.data));
  }

  createVariantGroup(itemId: string,
    req: VariantGroupRequest): Observable<VariantGroupResponse> {
    return this.http
      .post<ApiResponse<VariantGroupResponse>>(
        `${this.base}/${itemId}/variant-groups`, req)
      .pipe(map(r => r.data));
  }

  updateVariantGroup(itemId: string, groupId: string,
    req: VariantGroupRequest): Observable<VariantGroupResponse> {
    return this.http
      .put<ApiResponse<VariantGroupResponse>>(
        `${this.base}/${itemId}/variant-groups/${groupId}`, req)
      .pipe(map(r => r.data));
  }

  deleteVariantGroup(itemId: string, groupId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${itemId}/variant-groups/${groupId}`);
  }

  addVariant(itemId: string, groupId: string,
    req: VariantRequest): Observable<VariantGroupResponse> {
    return this.http
      .post<ApiResponse<VariantGroupResponse>>(
        `${this.base}/${itemId}/variant-groups/${groupId}/variants`, req)
      .pipe(map(r => r.data));
  }

  updateVariant(itemId: string, groupId: string, variantId: string,
    req: VariantRequest): Observable<VariantGroupResponse> {
    return this.http
      .put<ApiResponse<VariantGroupResponse>>(
        `${this.base}/${itemId}/variant-groups/${groupId}/variants/${variantId}`,
        req)
      .pipe(map(r => r.data));
  }

  deleteVariant(itemId: string, groupId: string,
    variantId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${itemId}/variant-groups/${groupId}/variants/${variantId}`);
  }

  // ── Modifier groups ────────────────────────────────────────────────────────

  getModifierGroups(itemId: string): Observable<ModifierGroupResponse[]> {
    return this.http
      .get<ApiResponse<ModifierGroupResponse[]>>(
        `${this.base}/${itemId}/modifier-groups`)
      .pipe(map(r => r.data));
  }

  createModifierGroup(itemId: string,
    req: ModifierGroupRequest): Observable<ModifierGroupResponse> {
    return this.http
      .post<ApiResponse<ModifierGroupResponse>>(
        `${this.base}/${itemId}/modifier-groups`, req)
      .pipe(map(r => r.data));
  }

  updateModifierGroup(itemId: string, groupId: string,
    req: ModifierGroupRequest): Observable<ModifierGroupResponse> {
    return this.http
      .put<ApiResponse<ModifierGroupResponse>>(
        `${this.base}/${itemId}/modifier-groups/${groupId}`, req)
      .pipe(map(r => r.data));
  }

  deleteModifierGroup(itemId: string, groupId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${itemId}/modifier-groups/${groupId}`);
  }

  addModifier(itemId: string, groupId: string,
    req: ModifierRequest): Observable<ModifierGroupResponse> {
    return this.http
      .post<ApiResponse<ModifierGroupResponse>>(
        `${this.base}/${itemId}/modifier-groups/${groupId}/modifiers`, req)
      .pipe(map(r => r.data));
  }

  updateModifier(itemId: string, groupId: string, modifierId: string,
    req: ModifierRequest): Observable<ModifierGroupResponse> {
    return this.http
      .put<ApiResponse<ModifierGroupResponse>>(
        `${this.base}/${itemId}/modifier-groups/${groupId}/modifiers/${modifierId}`,
        req)
      .pipe(map(r => r.data));
  }

  deleteModifier(itemId: string, groupId: string,
    modifierId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${itemId}/modifier-groups/${groupId}/modifiers/${modifierId}`);
  }
}