import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { CommonModule }        from '@angular/common';
import { RouterLink }          from '@angular/router';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators
} from '@angular/forms';
import { CategoryResponse, CategoryRequest } from '../models/menu.models';
import { CategoryService } from '../services/category.service';

type PanelMode = 'create' | 'edit' | null;

@Component({
  selector:    'app-categories',
  standalone:  true,
  imports:     [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './categories.component.html',
  styleUrls:   ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {

  // ── State ──────────────────────────────────────────────────────────────────
  categories   = signal<CategoryResponse[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  deletingId   = signal<string | null>(null);
  panelMode    = signal<PanelMode>(null);
  editTarget   = signal<CategoryResponse | null>(null);
  imagePreview = signal<string | null>(null);
  imageFile    = signal<File | null>(null);
  error        = signal<string | null>(null);

  // Drag-to-reorder state
  draggingId   = signal<string | null>(null);
  dragOverId   = signal<string | null>(null);

  totalItems = computed(() =>
    this.categories().reduce((s, c) => s + c.itemCount, 0));

  // ── Form ────────────────────────────────────────────────────────────────────
  form: FormGroup = this.fb.group({
    name:    ['', [Validators.required, Validators.maxLength(100)]],
    nameAr:  [''],
    nameFr:  [''],
    icon:    [''],
    visible: [true]
  });

  // Popular emoji icons for quick picking
  readonly quickIcons = [
    '☕','🧃','🍹','🧊','🍵','🍫','🥤',
    '🥞','🧇','🍳','🥐','🥗','🍔','🌮',
    '🍕','🍝','🥩','🍱','🍰','🧁','🍮',
    '🎂','🍭','🫖','🥗','✨','🎯','🌟'
  ];

  constructor(private svc: CategoryService, private fb: FormBuilder) { }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next:  cats => { this.categories.set(cats); this.loading.set(false); },
      error: ()   => { this.loading.set(false); this.error.set('Failed to load categories'); }
    });
  }

  // ── Panel ───────────────────────────────────────────────────────────────────
  openCreate() {
    this.form.reset({ visible: true, icon: '' });
    this.imagePreview.set(null);
    this.imageFile.set(null);
    this.editTarget.set(null);
    this.panelMode.set('create');
  }

  openEdit(cat: CategoryResponse) {
    this.form.patchValue({
      name:    cat.name,
      nameAr:  cat.nameAr  ?? '',
      nameFr:  cat.nameFr  ?? '',
      icon:    cat.icon    ?? '',
      visible: cat.visible
    });
    this.imagePreview.set(cat.imageUrl);
    this.imageFile.set(null);
    this.editTarget.set(cat);
    this.panelMode.set('edit');
  }

  closePanel() {
    this.panelMode.set(null);
    this.editTarget.set(null);
    this.imagePreview.set(null);
    this.imageFile.set(null);
    this.form.reset({ visible: true });
  }

  pickIcon(emoji: string) {
    this.form.patchValue({ icon: emoji });
  }

  // ── Image ───────────────────────────────────────────────────────────────────
  onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('Please select an image file'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('Image must be under 5MB'); return;
    }
    this.imageFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  clearImage() {
    this.imageFile.set(null);
    this.imagePreview.set(null);
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set(null);

    const req: CategoryRequest = {
      name:    this.form.value.name.trim(),
      nameAr:  this.form.value.nameAr  || undefined,
      nameFr:  this.form.value.nameFr  || undefined,
      icon:    this.form.value.icon    || undefined,
      visible: this.form.value.visible
    };

    const mode   = this.panelMode();
    const target = this.editTarget();

    const action$ = mode === 'edit' && target
      ? this.svc.update(target.id, req)
      : this.svc.create(req);

    action$.subscribe({
      next: saved => {
        if (mode === 'edit' && target) {
          // If there's a new image, upload it
          const file = this.imageFile();
          if (file) {
            this.svc.uploadImage(saved.id, file).subscribe({
              next: withImg => this.replaceInList(withImg),
              error: () => { this.replaceInList(saved); this.saving.set(false); }
            });
          } else {
            this.replaceInList(saved);
            this.saving.set(false);
          }
        } else {
          // Upload image for new category
          const file = this.imageFile();
          if (file) {
            this.svc.uploadImage(saved.id, file).subscribe({
              next: withImg => {
                this.categories.update(cats => [...cats, withImg]);
                this.saving.set(false);
                this.closePanel();
              },
              error: () => {
                this.categories.update(cats => [...cats, saved]);
                this.saving.set(false);
                this.closePanel();
              }
            });
          } else {
            this.categories.update(cats => [...cats, saved]);
            this.saving.set(false);
            this.closePanel();
          }
        }
        if (mode === 'edit') {
          this.saving.set(false);
          this.closePanel();
        }
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to save category');
        this.saving.set(false);
      }
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  confirmDelete(cat: CategoryResponse) {
    if (!confirm(`Delete "${cat.name}"? All items inside will also be deleted.`)) return;
    this.deletingId.set(cat.id);
    this.svc.delete(cat.id).subscribe({
      next:  () => {
        this.categories.update(cats => cats.filter(c => c.id !== cat.id));
        this.deletingId.set(null);
        if (this.editTarget()?.id === cat.id) this.closePanel();
      },
      error: () => { this.deletingId.set(null); this.error.set('Failed to delete'); }
    });
  }

  // ── Visibility toggle ───────────────────────────────────────────────────────
  toggleVisibility(cat: CategoryResponse) {
    this.svc.toggleVisibility(cat.id).subscribe({
      next: () => this.categories.update(cats =>
        cats.map(c => c.id === cat.id ? { ...c, visible: !c.visible } : c)
      )
    });
  }

  // ── Drag-to-reorder ─────────────────────────────────────────────────────────
  onDragStart(id: string) { this.draggingId.set(id); }
  onDragOver(event: DragEvent, id: string) {
    event.preventDefault();
    this.dragOverId.set(id);
  }
  onDrop(event: DragEvent, targetId: string) {
    event.preventDefault();
    const sourceId = this.draggingId();
    if (!sourceId || sourceId === targetId) {
      this.draggingId.set(null); this.dragOverId.set(null); return;
    }

    const cats     = [...this.categories()];
    const fromIdx  = cats.findIndex(c => c.id === sourceId);
    const toIdx    = cats.findIndex(c => c.id === targetId);
    const [moved]  = cats.splice(fromIdx, 1);
    cats.splice(toIdx, 0, moved);

    const reordered = cats.map((c, i) => ({ ...c, position: i }));
    this.categories.set(reordered);
    this.draggingId.set(null);
    this.dragOverId.set(null);

    this.svc.reorder(reordered.map(c => ({ id: c.id, position: c.position })))
      .subscribe({ error: () => this.load() }); // rollback on error
  }
  onDragEnd() { this.draggingId.set(null); this.dragOverId.set(null); }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  private replaceInList(cat: CategoryResponse) {
    this.categories.update(cats =>
      cats.map(c => c.id === cat.id ? cat : c));
  }

  get nameCtrl()  { return this.form.get('name')!; }
}