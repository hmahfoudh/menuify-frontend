import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BlogPostSummary, BlogPostDetail, BlogTag, BlogPage, BlogPostRequest } from '../models/blog.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BlogService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/public/blog`;
  private adminBase = `${environment.apiUrl}/api/blog`;

  // ── Posts ─────────────────────────────────────────────────

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

  // ── Tags ──────────────────────────────────────────────────

  getAllTags(): Observable<BlogTag[]> {
    return this.http.get<{ data: BlogTag[] }>(`${this.base}/tags`)
      .pipe(map(r => r.data));
  }

  // ── Admin ──────────────────────────

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
    // Spring reads this as @RequestPart("data") with content-type application/json
    form.append('data', new Blob([JSON.stringify(req)], { type: 'application/json' }));
    if (image) {
      form.append('image', image);
    }
    return form;
  }

}