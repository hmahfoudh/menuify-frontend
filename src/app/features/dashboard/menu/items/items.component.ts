import {
  Component, OnInit, signal, computed, inject, Input
} from '@angular/core';
import { CommonModule }        from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators
} from '@angular/forms';
import {
  ItemResponse, ItemRequest, CategoryResponse, DIETARY_FLAGS
} from '../models/menu.models';
import { ItemService } from '../services/item.service';
import { CategoryService } from '../services/category.service';

type PanelMode = 'create' | 'edit' | null;

@Component({
  selector:    'app-items',
  standalone:  true,
  imports:     [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './items.component.html',
  styleUrls:   ['./items.component.scss']
})
export class ItemsComponent implements OnInit {

  // ── State ───────────────────────────────────────────────────────────────────
  items        = signal<ItemResponse[]>([]);
  category     = signal<CategoryResponse | null>(null);
  allCategories= signal<CategoryResponse[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  deletingId   = signal<string | null>(null);
  panelMode    = signal<PanelMode>(null);
  editTarget   = signal<ItemResponse | null>(null);
  imagePreview = signal<string | null>(null);
  imageFile    = signal<File | null>(null);
  error        = signal<string | null>(null);

  // Drag state
  draggingId = signal<string | null>(null);
  dragOverId = signal<string | null>(null);

  categoryId = '';

  readonly dietaryFlags = DIETARY_FLAGS;

  availableItems   = computed(() => this.items().filter(i => i.available).length);
  unavailableItems = computed(() => this.items().filter(i => !i.available).length);

  // ── Form ────────────────────────────────────────────────────────────────────
  form: FormGroup = this.fb.group({
    categoryId:  ['', Validators.required],
    name:        ['', [Validators.required, Validators.maxLength(150)]],
    nameAr:      [''],
    nameFr:      [''],
    description: [''],
    basePrice:   [null],
    featured:    [false],
    available:   [true],
    vegetarian:  [false],
    vegan:       [false],
    glutenFree:  [false],
    spicy:       [false],
    tags:        ['']
  });

  constructor(private itemSvc: ItemService, private catSvc: CategoryService, private fb: FormBuilder, private route: ActivatedRoute) { }

  ngOnInit() {
    this.categoryId = this.route.snapshot.paramMap.get('categoryId') ?? '';
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);

    // Load categories for the "move to category" dropdown
    this.catSvc.getAll().subscribe(cats => {
      this.allCategories.set(cats);
      const current = cats.find(c => c.id === this.categoryId) ?? null;
      this.category.set(current);
    });

    this.itemSvc.getByCategory(this.categoryId).subscribe({
      next:  items => { this.items.set(items); this.loading.set(false); },
      error: ()    => { this.loading.set(false); this.error.set('Failed to load items'); }
    });
  }

  // ── Panel ────────────────────────────────────────────────────────────────────
  openCreate() {
    this.form.reset({
      categoryId: this.categoryId,
      available: true, featured: false,
      vegetarian: false, vegan: false, glutenFree: false, spicy: false
    });
    this.imagePreview.set(null);
    this.imageFile.set(null);
    this.editTarget.set(null);
    this.panelMode.set('create');
  }

  openEdit(item: ItemResponse) {
    this.form.patchValue({
      categoryId:  item.categoryId,
      name:        item.name,
      nameAr:      item.nameAr    ?? '',
      nameFr:      item.nameFr    ?? '',
      description: item.description ?? '',
      basePrice:   item.basePrice,
      featured:    item.featured,
      available:   item.available,
      vegetarian:  item.vegetarian,
      vegan:       item.vegan,
      glutenFree:  item.glutenFree,
      spicy:       item.spicy,
      tags:        item.tags ?? ''
    });
    this.imagePreview.set(item.imageUrl);
    this.imageFile.set(null);
    this.editTarget.set(item);
    this.panelMode.set('edit');
  }

  closePanel() {
    this.panelMode.set(null);
    this.editTarget.set(null);
    this.imagePreview.set(null);
    this.imageFile.set(null);
    this.form.reset();
  }

  // ── Image ────────────────────────────────────────────────────────────────────
  onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('Please select an image file'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('Image must be under 10MB'); return;
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

    const v    = this.form.value;
    const req: ItemRequest = {
      categoryId:   v.categoryId,
      name:         v.name.trim(),
      nameAr:       v.nameAr       || undefined,
      nameFr:       v.nameFr       || undefined,
      description:  v.description  || undefined,
      basePrice:    v.basePrice != null && v.basePrice !== '' ? +v.basePrice : null,
      featured:     v.featured,
      available:    v.available,
      vegetarian:   v.vegetarian,
      vegan:        v.vegan,
      glutenFree:   v.glutenFree,
      spicy:        v.spicy,
      tags:         v.tags || undefined
    };

    const mode   = this.panelMode();
    const target = this.editTarget();
    const image  = this.imageFile() ?? undefined;

    const action$ = mode === 'edit' && target
      ? this.itemSvc.update(target.id, req, image)
      : this.itemSvc.create(req, image);

    action$.subscribe({
      next: saved => {
        if (mode === 'edit') {
          this.items.update(items => items.map(i => i.id === saved.id ? saved : i));
        } else {
          this.items.update(items => [...items, saved]);
        }
        this.saving.set(false);
        this.closePanel();
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to save item');
        this.saving.set(false);
      }
    });
  }

  // ── Toggle availability ─────────────────────────────────────────────────────
  toggleAvailability(item: ItemResponse) {
    this.itemSvc.toggleAvailability(item.id).subscribe({
      next: () => this.items.update(items =>
        items.map(i => i.id === item.id ? { ...i, available: !i.available } : i)
      )
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  confirmDelete(item: ItemResponse) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    this.deletingId.set(item.id);
    this.itemSvc.delete(item.id).subscribe({
      next:  () => {
        this.items.update(items => items.filter(i => i.id !== item.id));
        this.deletingId.set(null);
        if (this.editTarget()?.id === item.id) this.closePanel();
      },
      error: () => { this.deletingId.set(null); this.error.set('Failed to delete'); }
    });
  }

  // ── Drag-to-reorder ─────────────────────────────────────────────────────────
  onDragStart(id: string) { this.draggingId.set(id); }
  onDragOver(e: DragEvent, id: string) { e.preventDefault(); this.dragOverId.set(id); }
  onDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = this.draggingId();
    if (!sourceId || sourceId === targetId) {
      this.draggingId.set(null); this.dragOverId.set(null); return;
    }
    const list    = [...this.items()];
    const fromIdx = list.findIndex(i => i.id === sourceId);
    const toIdx   = list.findIndex(i => i.id === targetId);
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    const reordered = list.map((i, pos) => ({ ...i, position: pos }));
    this.items.set(reordered);
    this.draggingId.set(null); this.dragOverId.set(null);
    this.itemSvc.reorder(reordered.map(i => ({ id: i.id, position: i.position })))
      .subscribe({ error: () => this.loadAll() });
  }
  onDragEnd() { this.draggingId.set(null); this.dragOverId.set(null); }

  get nameCtrl()  { return this.form.get('name')!;  }
  get priceCtrl() { return this.form.get('basePrice')!; }

  toggleFlag(key: string) {
  const currentValue = this.form.value[key];
  this.form.patchValue({
    [key]: !currentValue
  });
}
}