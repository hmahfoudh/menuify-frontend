import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { BlogPostDetail } from '../../models/blog.model';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { SafeHtmlPipe } from '../../../../shared/pipes/safe-html.pipe';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent, SafeHtmlPipe],
  templateUrl: './blog-post.component.html',
  styleUrl: './blog-post.component.scss'
})
export class BlogPostComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private meta       = inject(Meta);
  private title      = inject(Title);
  private document   = inject(DOCUMENT);

  // Data is available synchronously — no signal needed, no loading state
  post!: BlogPostDetail;

  ngOnInit(): void {
    // Resolver already resolved — data is here before the component inits
    this.post = this.route.snapshot.data['post'];
    this.applyMeta(this.post);
  }

  private applyMeta(post: BlogPostDetail): void {
    const metaTitle  = post.metaTitle       || post.title;
    const metaDesc   = post.metaDescription || post.excerpt || '';
    const canonical  = `https://menuify.tn/blog/${post.slug}`;
    const image      = post.coverImageUrl   || 'https://menuify.tn/assets/og-image.png';

    this.title.setTitle(`${metaTitle} – Menuify Blog`);

    this.meta.updateTag({ name: 'description',              content: metaDesc });
    this.meta.updateTag({ name: 'robots',                   content: 'index,follow' });
    this.meta.updateTag({ property: 'og:type',              content: 'article' });
    this.meta.updateTag({ property: 'og:title',             content: metaTitle });
    this.meta.updateTag({ property: 'og:description',       content: metaDesc });
    this.meta.updateTag({ property: 'og:image',             content: image });
    this.meta.updateTag({ property: 'og:url',               content: canonical });
    this.meta.updateTag({ property: 'article:published_time', content: post.publishedAt });
    this.meta.updateTag({ property: 'article:modified_time',  content: post.updatedAt });
    this.meta.updateTag({ name: 'twitter:card',             content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title',            content: metaTitle });
    this.meta.updateTag({ name: 'twitter:description',      content: metaDesc });
    this.meta.updateTag({ name: 'twitter:image',            content: image });

    if (post.tags.length > 0) {
      this.meta.updateTag({ property: 'article:tag', content: post.tags.map(t => t.name).join(', ') });
    }

    // Canonical — use DOCUMENT injection (SSR safe, not Meta.updateTag)
    let link = this.document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);

    // JSON-LD — remove previous and inject fresh
    this.document.querySelector('script[data-blog-schema]')?.remove();
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-blog-schema', '');
    script.textContent = JSON.stringify({
      '@context':   'https://schema.org',
      '@type':      'Article',
      headline:     metaTitle,
      description:  metaDesc,
      image,
      author:       { '@type': 'Person', name: post.authorName || 'Menuify Team' },
      publisher:    {
        '@type': 'Organization',
        name:    'Menuify',
        logo:    { '@type': 'ImageObject', url: 'https://menuify.tn/assets/logo.png' }
      },
      datePublished: post.publishedAt,
      dateModified:  post.updatedAt,
      url:           canonical,
      keywords:      post.tags.map(t => t.name).join(', ')
    });
    this.document.head.appendChild(script);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-TN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}