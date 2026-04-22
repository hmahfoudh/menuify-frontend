import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import {
  ItemPairingGroupResponse,
  ItemPairingGroupRequest,
  ItemPairingResponse,
  ItemPairingRequest,
  ItemSearchResult,
} from '../models/pairing.models';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../core/models/api.models';

@Injectable({ providedIn: 'root' })
export class PairingService {

  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Group endpoints ────────────────────────────────────────────────────────

  getGroups(itemId: string): Observable<ItemPairingGroupResponse[]> {
    return this.http.get<ItemPairingGroupResponse[]>(
      `${this.base}/api/dashboard/items/${itemId}/pairing-groups`
    );
  }

  createGroup(itemId: string, req: ItemPairingGroupRequest): Observable<ItemPairingGroupResponse> {
    return this.http.post<ItemPairingGroupResponse>(
      `${this.base}/api/dashboard/items/${itemId}/pairing-groups`, req
    );
  }

  updateGroup(itemId: string, groupId: string, req: ItemPairingGroupRequest): Observable<ItemPairingGroupResponse> {
    return this.http.put<ItemPairingGroupResponse>(
      `${this.base}/api/dashboard/items/${itemId}/pairing-groups/${groupId}`, req
    );
  }

  deleteGroup(itemId: string, groupId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/api/dashboard/items/${itemId}/pairing-groups/${groupId}`
    );
  }

  // ── Pairing endpoints ──────────────────────────────────────────────────────

  addPairing(groupId: string, req: ItemPairingRequest): Observable<ItemPairingResponse> {
    return this.http.post<ItemPairingResponse>(
      `${this.base}/api/dashboard/pairing-groups/${groupId}/pairings`, req
    );
  }

  updatePairing(pairingId: string, req: ItemPairingRequest): Observable<ItemPairingResponse> {
    return this.http.put<ItemPairingResponse>(
      `${this.base}/api/dashboard/pairings/${pairingId}`, req
    );
  }

  togglePairingAvailability(pairingId: string): Observable<ItemPairingResponse> {
    return this.http.patch<ItemPairingResponse>(
      `${this.base}/api/dashboard/pairings/${pairingId}/toggle-availability`, {}
    );
  }

  deletePairing(pairingId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/dashboard/pairings/${pairingId}`);
  }

  // ── Item search (for the search modal) ────────────────────────────────────

  searchItems(query: string, excludeIds: string[] = []): Observable<ItemSearchResult[]> {
    let params = new HttpParams().set('q', query);
    excludeIds.forEach(id => { params = params.append('exclude', id); });
    console.log("query",query);
    return this.http.get<ApiResponse<ItemSearchResult[]>>(`${this.base}/api/dashboard/items/search`, { params }).pipe(map(r => r.data));
  }
}