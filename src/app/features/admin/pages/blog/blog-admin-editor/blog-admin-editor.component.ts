import {
  Component, inject, signal, computed,
  OnInit, AfterViewInit, OnDestroy,
  ViewChild, ElementRef, PLATFORM_ID,
  ChangeDetectorRef
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import Quill from 'quill';
import { BlogService } from '../../../../blog/services/blog.service';
import { BlogPostDetail, BlogPostRequest, BlogTag } from '../../../../blog/models/blog.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-blog-admin-editor',
  standalone: true,
  imports: [FormsModule, RouterLink, TitleCasePipe],
  templateUrl: './blog-admin-editor.component.html',
  styleUrl: './blog-admin-editor.component.scss'
})
export class BlogAdminEditorComponent implements OnInit, AfterViewInit, OnDestroy {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blogService = inject(BlogService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('quillContainer') quillContainer!: ElementRef<HTMLDivElement>;

  // ── Quill instance ─────────────────────────────────────────────────────────
  private quill: Quill | null = null;

  // ── Mode ───────────────────────────────────────────────────────────────────
  isEdit = signal(false);
  postId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  // ── Tab ────────────────────────────────────────────────────────────────────
  activeTab = signal<'content' | 'seo' | 'settings'>('content');

  // ── Tags ───────────────────────────────────────────────────────────────────
  allTags = signal<BlogTag[]>([]);
  newTagName = signal('');
  addingTag = signal(false);

  // ── Cover image ────────────────────────────────────────────────────────────
  coverImageFile = signal<File | null>(null);
  coverImagePreview = signal<string | null>(null);

  // ── SEO counters ───────────────────────────────────────────────────────────
  metaTitleLen = signal(0);
  metaDescLen = signal(0);

  // ── Form model ─────────────────────────────────────────────────────────────
  form = signal<BlogPostRequest>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImageUrl: '',
    coverImageAlt: '',
    authorName: '',
    authorAvatarUrl: '',
    status: 'DRAFT',
    featured: false,
    metaTitle: '',
    metaDescription: '',
    tagIds: []
  });

  // ── Computed ───────────────────────────────────────────────────────────────
  slugPreview = computed(() => this.form().slug || 'post-slug');
  serpTitle = computed(() => this.form().metaTitle || this.form().title || 'Post Title');
  serpDesc = computed(() => this.form().metaDescription || this.form().excerpt || 'Meta description will appear here...');

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.blogService.getAllTags().subscribe({
      next: tags => this.allTags.set(tags)
    });
    this.route.params.subscribe((params) => {
      const id = params['id'];
      console.log(id);
      if (id) {
        this.isEdit.set(true);
        this.postId.set(id);
        console.log(this.postId());
        this.loading.set(true);
        this.blogService.getPostByIdAdmin(id).subscribe({
          next: post => {
            this.patchForm(post);
            this.loading.set(false);
            this.cdr.detectChanges();
            setTimeout(() => this.initQuill(), 0);
            if (this.quill && post.content) {
              this.quill.clipboard.dangerouslyPasteHTML(post.content);
            }
          },
          error: () => {
            this.error.set('Failed to load post.');
            this.loading.set(false);
          }
        });
      }
    })

  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // setTimeout(0) ensures Angular finishes rendering @if(!loading()) before
    // Quill mounts — without it the ViewChild ref may not exist yet
    setTimeout(() => this.initQuill(), 0);
  }

  ngOnDestroy(): void {
    this.quill = null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUILL SETUP
  // ─────────────────────────────────────────────────────────────────────────
  private initQuill(): void {
    if (!this.quillContainer?.nativeElement) return;

    this.quill = new Quill(this.quillContainer.nativeElement, {
      theme: 'snow',
      placeholder: 'Write your article here…',
      modules: {
        toolbar: [
          [{ header: [2, 3, 4, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          ['link', 'image'],
          [{ align: [] }],
          ['clean']
        ]
      }
    });

    // Populate with existing content on edit
    const existing = this.form().content;
    if (existing) {
      this.quill.clipboard.dangerouslyPasteHTML(existing);
    }

    // Sync Quill HTML → form signal on every keystroke
    this.quill.on('text-change', () => {
      const editorEl = this.quillContainer.nativeElement.querySelector('.ql-editor');
      const html = editorEl?.innerHTML ?? '';
      // Quill emits '<p><br></p>' for an empty editor — normalise to ''
      this.patch({ content: html === '<p><br></p>' ? '' : html });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FORM HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  private patchForm(post: BlogPostDetail): void {
    this.form.set({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content || '',
      coverImageUrl: post.coverImageUrl || '',
      coverImageAlt: post.coverImageAlt || '',
      authorName: post.authorName || '',
      authorAvatarUrl: post.authorAvatarUrl || '',
      status: post.status,
      featured: post.featured,
      metaTitle: post.metaTitle || '',
      metaDescription: post.metaDescription || '',
      tagIds: post.tags.map(t => t.id)
    });
    this.metaTitleLen.set((post.metaTitle || '').length);
    this.metaDescLen.set((post.metaDescription || '').length);
    this.coverImagePreview.set(post.coverImageUrl || null);
  }

  patch(field: Partial<BlogPostRequest>): void {
    this.form.update(f => ({ ...f, ...field }));
  }

  onTitleChange(value: string): void {
    this.patch({ title: value });
    // Auto-generate slug only on create; never overwrite on edit
    if (!this.isEdit()) {
      this.patch({ slug: this.toSlug(value) });
    }
  }

  onMetaTitleChange(value: string): void {
    this.patch({ metaTitle: value });
    this.metaTitleLen.set(value.length);
  }

  onMetaDescChange(value: string): void {
    this.patch({ metaDescription: value });
    this.metaDescLen.set(value.length);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COVER IMAGE
  // ─────────────────────────────────────────────────────────────────────────
  onCoverImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('Image must be under 5 MB');
      return;
    }
    this.coverImageFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.coverImagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  onCoverDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('Image must be under 5 MB');
      return;
    }
    this.coverImageFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.coverImagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  clearCoverImage(): void {
    this.coverImageFile.set(null);
    // On edit restore saved URL; on create clear entirely
    this.coverImagePreview.set(
      this.isEdit() ? (this.form().coverImageUrl || null) : null
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TAGS
  // ─────────────────────────────────────────────────────────────────────────
  toggleTag(id: number): void {
    const current = this.form().tagIds;
    const updated = current.includes(id)
      ? current.filter(t => t !== id)
      : [...current, id];
    this.patch({ tagIds: updated });
  }

  isTagSelected(id: number): boolean {
    return this.form().tagIds.includes(id);
  }

  addTag(): void {
    const name = this.newTagName().trim();
    if (!name) return;
    this.addingTag.set(true);
    this.blogService.createTag(name).subscribe({
      next: tag => {
        this.allTags.update(tags => [...tags, tag]);
        this.patch({ tagIds: [...this.form().tagIds, tag.id] });
        this.newTagName.set('');
        this.addingTag.set(false);
      },
      error: () => this.addingTag.set(false)
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE — single multipart request (data + image)
  // ─────────────────────────────────────────────────────────────────────────
  save(status?: 'DRAFT' | 'PUBLISHED'): void {
    const payload = { ...this.form() };
    if (status) payload.status = status;

    if (!payload.title.trim()) {
      this.error.set('Title is required.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const file = this.coverImageFile() ?? undefined;

    const req$ = this.isEdit()
      ? this.blogService.updatePost(this.postId()!, payload, file)
      : this.blogService.createPost(payload, file);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/admin/blog']);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Failed to save. Please try again.');
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  private toSlug(input: string): string {
    return input.toLowerCase()
      .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}