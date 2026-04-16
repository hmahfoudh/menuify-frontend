import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { ItemLikeDetailDto, ItemLikeLeaderboardDto, ItemLikeToggleResponse, ItemLikeTrendDto } from '../models/item-like.models';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ItemLikeService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/api/item-likes/items';
 
  /**
   * Toggle a like on an item (like → unlike → re-like).
   * Returns the new state: isNowLiked and newLikeCount.
   */
  toggleLike(itemId: string): Observable<ItemLikeToggleResponse> {
    return this.http.post<ApiResponse<ItemLikeToggleResponse>>(
      `${this.apiUrl}/${itemId}/toggle-like`,
      {}
    ).pipe(map(r => r.data));
  }
 
  /**
   * Get active likes for an item (for dashboard detail view).
   */
  getActiveLikes(itemId: number): Observable<ItemLikeDetailDto[]> {
    return this.http.get<ApiResponse<ItemLikeDetailDto[]>>(
      `${this.apiUrl}/${itemId}/likes`
    ).pipe(map(r => r.data));
  }
 
  /**
   * Get daily like trend for charting (date → count).
   */
  getLikeTrend(itemId: number): Observable<ItemLikeTrendDto[]> {
    return this.http.get<ApiResponse<ItemLikeTrendDto[]>>(
      `${this.apiUrl}/${itemId}/likes/trend`
    ).pipe(map(r => r.data));
  }
 
  /**
   * Get top items by likes for the current tenant (leaderboard).
   */
  getTopItemsByLikes(limit: number = 10): Observable<ItemLikeLeaderboardDto[]> {
    return this.http.get<ApiResponse<ItemLikeLeaderboardDto[]>>(
      `${this.apiUrl}/likes/top`,
      { params: { limit: limit.toString() } }
    ).pipe(map(r => r.data));
  }
}

