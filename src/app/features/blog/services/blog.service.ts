import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BlogPostSummary, BlogPostDetail, BlogTag, BlogPage, BlogPostRequest } from '../models/blog.model';
import { SSR_API_URL } from '../../../core/tokens/ssr-api-url.token';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BlogService {

  private http      = inject(HttpClient);
  private ssrApiUrl = inject(SSR_API_URL, { optional: true });

  // SSR → http://backend:8080  |  Browser → https://api.menuify.tn
  private get apiBase(): string {
    return (this.ssrApiUrl && this.ssrApiUrl !== '')
      ? this.ssrApiUrl
      : environment.apiUrl;
  }

  private get base(): string     { return `${this.apiBase}/api/public/blog`; }
  private get adminBase(): string { return `${this.apiBase}/api/blog`; }

  // ── Public ──────────────────────────────────────────────────────────────────
  getPublishedPosts(page = 0, size = 9): Observable<BlogPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<{ data: BlogPage }>(`${this.base}/posts`, { params })
      .pipe(map(r => r.data));
  }

  getPostsByTag(tagSlug: string, page = 0, size = 9): Observable<BlogPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<{ data: BlogPage }>(`${this.base}/posts/tag/${tagSlug}`, { params })
      .pipe(map(r => r.data));
  }

  getPostBySlug(slug: string): Observable<BlogPostDetail> {
    return this.http.get<{ data: BlogPostDetail }>(`${this.base}/posts/${slug}`)
      .pipe(map(r => r.data));
  }

  getFeaturedPost(): Observable<BlogPostSummary | null> {
    return this.http.get<{ data: BlogPostSummary | null }>(`${this.base}/featured`)
      .pipe(map(r => r.data));
  }

  getAllTags(): Observable<BlogTag[]> {
    return this.http.get<{ data: BlogTag[] }>(`${this.base}/tags`)
      .pipe(map(r => r.data));
  }

  incrementView(slug: string): void {
    this.http.post(`${this.base}/posts/${slug}/view`, {}).subscribe();
  }

  // ── Admin ───────────────────────────────────────────────────────────────────
  getAllPostsAdmin(status?: string, page = 0, size = 20): Observable<BlogPage> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) params = params.set('status', status);
    return this.http.get<{ data: BlogPage }>(`${this.adminBase}/posts`, { params })
      .pipe(map(r => r.data));
  }

  getPostByIdAdmin(id: number): Observable<BlogPostDetail> {
    return this.http.get<{ data: BlogPostDetail }>(`${this.adminBase}/posts/${id}`)
      .pipe(map(r => r.data));
  }

  createPost(req: BlogPostRequest, image?: File): Observable<BlogPostDetail> {
    const form = this.buildFormData(req, image);
    return this.http.post<{ data: BlogPostDetail }>(`${this.adminBase}/posts`, form)
      .pipe(map(r => r.data));
  }

  updatePost(id: number, req: BlogPostRequest, image?: File): Observable<BlogPostDetail> {
    const form = this.buildFormData(req, image);
    return this.http.put<{ data: BlogPostDetail }>(`${this.adminBase}/posts/${id}`, form)
      .pipe(map(r => r.data));
  }

  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminBase}/posts/${id}`);
  }

  createTag(name: string): Observable<BlogTag> {
    return this.http.post<{ data: BlogTag }>(`${this.adminBase}/tags`, { name })
      .pipe(map(r => r.data));
  }

  private buildFormData(req: BlogPostRequest, image?: File): FormData {
    const form = new FormData();
    form.append('data', new Blob([JSON.stringify(req)], { type: 'application/json' }));
    if (image) form.append('image', image);
    return form;
  }
}