import { Component, inject, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BlogPostSummary, BlogTag, BlogPage } from '../../models/blog.model';
import { MetaTagsService } from '../../../../shared/services/meta-tags.service';
import { environment } from '../../../../../environments/environment';
import { BlogService } from '../../services/blog.service';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './blog-list.component.html',
  styleUrl: './blog-list.component.scss'
})
export class BlogListComponent implements OnInit {

  private blog = inject(BlogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private metaTags = inject(MetaTagsService);
  private platformId = inject(PLATFORM_ID);

  posts = signal<BlogPostSummary[]>([]);
  tags = signal<BlogTag[]>([]);
  featuredPost = signal<BlogPostSummary | null>(null);
  activeTag = signal<string | null>(null);
  loading = signal(true);
  totalPages = signal(0);
  currentPage = signal(0);

  readonly PAGE_SIZE = 9;

  ngOnInit(): void {
    this.loadTags();

    this.route.paramMap.subscribe(params => {
      const tag = params.get('tag');
      this.activeTag.set(tag);
      this.currentPage.set(0);
      this.loadPosts(0);
      this.setMeta(tag);
    });

    // Featured only on main /blog (no tag filter)
    if (!this.route.snapshot.paramMap.get('tag')) {
      this.loadFeatured();
    }
  }

  private loadPosts(page: number): void {
    this.loading.set(true);
    const tag = this.activeTag();
    const req$ = tag
      ? this.blog.getPostsByTag(tag, page, this.PAGE_SIZE)
      : this.blog.getPublishedPosts(page, this.PAGE_SIZE);

    req$.subscribe({
      next: data => {
        this.posts.set(data.content);
        this.totalPages.set(data.totalPages);
        this.currentPage.set(data.number);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }


  private loadFeatured(): void {
    this.blog.getFeaturedPost().subscribe({
      next: post => this.featuredPost.set(post)
    });
  }

  private loadTags(): void {
    this.blog.getAllTags().subscribe({
      next: tags => this.tags.set(tags)
    });
  }


  goToPage(page: number): void {
    this.loadPosts(page);
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  filterByTag(slug: string): void {
    this.router.navigate(['/blog/tag', slug]);
  }

  clearTag(): void {
    this.router.navigate(['/blog']);
  }

  private setMeta(tag: string | null): void {
    const title = tag ? `Posts about #${tag} – Menuify Blog` : 'Blog – Menuify';
    const description = tag
      ? `Articles and guides about ${tag} from the Menuify team.`
      : 'Restaurant management tips, digital menu guides, and industry insights from the Menuify team.';

    this.metaTags.setCustomMetaTags({
      title,
      description,
      ogType: 'website',
      ogTitle: title,
      ogDescription: description,
      robots: 'index,follow',
    });
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-TN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}