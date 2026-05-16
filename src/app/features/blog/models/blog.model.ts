export type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
}

export interface BlogPostSummary {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string;
  coverImageAlt: string;
  authorName: string;
  authorAvatarUrl: string;
  status: BlogStatus;
  featured: boolean;
  publishedAt: string;
  readingTimeMinutes: number;
  viewCount: number;
  tags: BlogTag[];
}

export interface BlogPostDetail extends BlogPostSummary {
  content: string;
  updatedAt: string;
  metaTitle: string | null;
  metaDescription: string | null;
}

export interface BlogPage {
  content: BlogPostSummary[];
  totalElements: number;
  totalPages: number;
  number: number;  // current page
  size: number;
}

export interface BlogPostRequest {
  title:             string;
  slug?:             string;
  excerpt?:          string;
  content?:          string;
  coverImageUrl?:    string;
  coverImageAlt?:    string;
  authorName?:       string;
  authorAvatarUrl?:  string;
  status:            BlogStatus;
  featured:          boolean;
  metaTitle?:        string;
  metaDescription?:  string;
  tagIds:            number[];
}
