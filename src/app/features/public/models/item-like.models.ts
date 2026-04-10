export interface ItemLikeToggleResponse {
  isNowLiked: boolean;
  newLikeCount: number;
  likeId: number;
}
 
export interface ItemLikeTrendDto {
  date: string;
  count: number;
}
 
export interface ItemLikeLeaderboardDto {
  itemId: number;
  itemName: string;
  likeCount: number;
}

export interface ItemLikeDetailDto{
    id: string;
    customerIp: string;
    likedAt: string;
    unlikedAt: string; // ISO date string
}