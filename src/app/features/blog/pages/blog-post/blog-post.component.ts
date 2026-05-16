import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { BlogPostDetail } from '../../models/blog.model';
import { environment } from '../../../../../environments/environment';
import { BlogService } from '../../services/blog.service';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './blog-post.component.html',
  styleUrl: './blog-post.component.scss'
})
export class BlogPostComponent implements OnInit {

  private blog = inject(BlogService);
  private route = inject(ActivatedRoute);
  private meta = inject(Meta);
  private title = inject(Title);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  post = signal<BlogPostDetail | null>(null);
  loading = signal(true);
  notFound = signal(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug')!;
      this.loadPost(slug);
    });
  }

  private loadPost(slug: string): void {
    this.loading.set(true);
    this.blog.getPostBySlug(slug).subscribe({
      next: post => {
        this.post.set(post);
        this.loading.set(false);
        this.applyMeta(post);
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      }
    });
  }

  private applyMeta(post: BlogPostDetail): void {
    const metaTitle = post.metaTitle || post.title;
    const metaDesc = post.metaDescription || post.excerpt || '';
    const canonical = `https://menuify.tn/blog/${post.slug}`;
    const image = post.coverImageUrl || 'https://menuify.tn/assets/og-image.png';

    // Title
    this.title.setTitle(`${metaTitle} – Menuify Blog`);

    // Basic
    this.meta.updateTag({ name: 'description', content: metaDesc });
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });

    // OG
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ property: 'og:title', content: metaTitle });
    this.meta.updateTag({ property: 'og:description', content: metaDesc });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'article:published_time', content: post.publishedAt });
    this.meta.updateTag({ property: 'article:modified_time', content: post.updatedAt });
    if (post.tags.length > 0) {
      this.meta.updateTag({ property: 'article:tag', content: post.tags.map(t => t.name).join(', ') });
    }

    // Twitter
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: metaTitle });
    this.meta.updateTag({ name: 'twitter:description', content: metaDesc });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    // Canonical (DOCUMENT injection — SSR safe)
    let link: HTMLLinkElement = this.document.querySelector("link[rel='canonical']")!;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);

    // Article JSON-LD structured data
    this.injectArticleSchema(post, metaTitle, metaDesc, image, canonical);
  }

  private injectArticleSchema(
    post: BlogPostDetail,
    metaTitle: string,
    metaDesc: string,
    image: string,
    canonical: string
  ): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: metaTitle,
      description: metaDesc,
      image,
      author: {
        '@type': 'Person',
        name: post.authorName || 'Menuify Team'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Menuify',
        logo: {
          '@type': 'ImageObject',
          url: 'https://menuify.tn/assets/logo.png'
        }
      },
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      url: canonical,
      keywords: post.tags.map(t => t.name).join(', ')
    };

    // Remove old script if navigating between posts
    const existing = this.document.querySelector('script[data-blog-schema]');
    if (existing) existing.remove();

    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-blog-schema', '');
    script.textContent = JSON.stringify(schema);
    this.document.head.appendChild(script);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-TN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}