import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { BlogService } from '../../../../blog/services/blog.service';
import { BlogPostSummary, BlogStatus } from '../../../../blog/models/blog.model';

@Component({
  selector: 'app-blog-admin-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './blog-admin-list.component.html',
  styleUrl: './blog-admin-list.component.scss'
})
export class BlogAdminListComponent implements OnInit {
  private blogService = inject(BlogService);
  private router      = inject(Router);

  posts       = signal<BlogPostSummary[]>([]);
  loading     = signal(true);
  deleting    = signal<number | null>(null);
  filterStatus = signal<string>('');
  totalPages  = signal(0);
  currentPage = signal(0);

  readonly PAGE_SIZE = 20;

  ngOnInit(): void {
    this.load();
  }

  load(page = 0): void {
    this.loading.set(true);
    const status = this.filterStatus() || undefined;
    this.blogService.getAllPostsAdmin(status, page, this.PAGE_SIZE).subscribe({
      next: data => {
        this.posts.set(data.content);
        this.totalPages.set(data.totalPages);
        this.currentPage.set(data.number);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onStatusFilter(status: string): void {
    this.filterStatus.set(status);
    this.load(0);
  }

  edit(id: number): void {
    this.router.navigate(['/admin/blog', id, 'edit']);
  }

  delete(id: number): void {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    this.deleting.set(id);
    this.blogService.deletePost(id).subscribe({
      next: () => {
        this.posts.update(list => list.filter(p => p.id !== id));
        this.deleting.set(null);
      },
      error: () => this.deleting.set(null)
    });
  }

  statusClass(status: BlogStatus): string {
    return { PUBLISHED: 'badge--green', DRAFT: 'badge--gray', ARCHIVED: 'badge--yellow' }[status];
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  }
}