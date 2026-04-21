import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CategoryResponse, CategoryRequest,
  ItemResponse, ItemRequest,
  VariantGroupResponse, VariantGroupRequest, VariantRequest,
  ModifierGroupResponse, ModifierGroupRequest, ModifierRequest,
  ReorderRequest, PanelMode, COMMON_ICONS
} from '../models/menu.models';
import { CategoryService } from '../services/category.service';
import { ItemService } from '../services/item.service';
import { TranslatePipe } from '@ngx-translate/core';

type ActivePanel = 'none' | 'category' | 'item' | 'variantGroup' | 'modifierGroup';

@Component({
  selector: 'app-menu-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './menu-manager.component.html',
  styleUrls: ['./menu-manager.component.scss']
})
export class MenuManagerComponent implements OnInit {

  private catSvc = inject(CategoryService);
  private itemSvc = inject(ItemService);

  // ── Data state ───────────────────────────────────────────────────────────
  categories = signal<CategoryResponse[]>([]);
  items = signal<ItemResponse[]>([]);
  selectedCatId = signal<string | null>(null);
  loadingCats = signal(true);
  loadingItems = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  saving = signal(false);
  deletingId = signal<string | null>(null);
  removingImage = signal(false);


  // ── Panel state ──────────────────────────────────────────────────────────
  activePanel = signal<ActivePanel>('none');
  panelMode = signal<PanelMode>('create');

  // ── Category form ────────────────────────────────────────────────────────
  editingCat = signal<CategoryResponse | null>(null);
  catName = signal('');
  catIcon = signal('');
  catVisible = signal(true);
  showIconPicker = signal(false);
  customIconInput = signal('');

  // ── Item form ────────────────────────────────────────────────────────────
  editingItem = signal<ItemResponse | null>(null);
  itemName = signal('');
  itemDesc = signal('');
  itemPrice = signal<number | null>(null);
  itemFeatured = signal(false);
  itemAvailable = signal(true);
  itemVeg = signal(false);
  itemVegan = signal(false);
  itemGluten = signal(false);
  itemSpicy = signal(false);
  itemTags = signal('');
  itemImageFile = signal<File | null>(null);
  itemImagePreview = signal<string | null>(null);

  // ── Variant / Modifier group form ─────────────────────────────────────────
  editingVGroup = signal<VariantGroupResponse | null>(null);
  vgName = signal('');
  vgRequired = signal(true);
  vgUiType = signal<'pills' | 'dropdown' | 'cards'>('pills');

  editingMGroup = signal<ModifierGroupResponse | null>(null);
  mgName = signal('');
  mgDesc = signal('');
  mgRequired = signal(false);
  mgMin = signal(0);
  mgMax = signal(3);
  mgUiType = signal<'checkbox' | 'radio' | 'stepper'>('checkbox');

  // ── Inline variant/modifier editing ──────────────────────────────────────
  newVariantName = signal('');
  newVariantPrice = signal(0);
  newVariantDefault = signal(false);
  newModName = signal('');
  newModPrice = signal(0);
  newModDefault = signal(false);

  // ── Drag-to-reorder ───────────────────────────────────────────────────────
  dragIndex = signal<number | null>(null);

  // ── Constants ─────────────────────────────────────────────────────────────
  readonly commonIcons = COMMON_ICONS;

  // ── Computed ──────────────────────────────────────────────────────────────
  selectedCategory = computed(() =>
    this.categories().find(c => c.id === this.selectedCatId()) ?? null);

  visibleCount = computed(() =>
    this.categories().filter(c => c.visible).length);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() { this.loadCategories(); }

  // ── Category CRUD ─────────────────────────────────────────────────────────
  loadCategories() {
    this.loadingCats.set(true);
    this.catSvc.getAll().subscribe({
      next: cats => {
        this.categories.set(cats);
        this.loadingCats.set(false);
        if (cats.length && !this.selectedCatId()) {
          this.selectCategory(cats[0].id);
        }
      },
      error: () => {
        this.loadingCats.set(false);
        this.error.set('Failed to load categories');
      }
    });
  }

  selectCategory(id: string) {
    this.selectedCatId.set(id);
    this.closePanel();
    this.loadItems(id);
  }

  loadItems(catId: string) {
    this.loadingItems.set(true);
    this.itemSvc.getByCategory(catId).subscribe({
      next: items => { this.items.set(items); this.loadingItems.set(false); },
      error: () => { this.loadingItems.set(false); }
    });
  }

  openCreateCategory() {
    this.panelMode.set('create');
    this.editingCat.set(null);
    this.catName.set('');
    this.catIcon.set('');
    this.catVisible.set(true);
    this.showIconPicker.set(false);
    this.activePanel.set('category');
  }

  openEditCategory(cat: CategoryResponse) {
    this.panelMode.set('edit');
    this.editingCat.set(cat);
    this.catName.set(cat.name);
    this.catIcon.set(cat.icon ?? '');
    this.catVisible.set(cat.visible);
    this.showIconPicker.set(false);
    this.activePanel.set('category');
  }

  saveCategory() {
    if (!this.catName().trim()) return;
    this.saving.set(true);

    const req: CategoryRequest = {
      name: this.catName().trim(),
      icon: this.catIcon() || undefined,
      visible: this.catVisible(),
    };

    const action$ = this.panelMode() === 'create'
      ? this.catSvc.create(req)
      : this.catSvc.update(this.editingCat()!.id, req);

    action$.subscribe({
      next: cat => {
        if (this.panelMode() === 'create') {
          this.categories.update(list => [...list, cat]);
          this.selectCategory(cat.id);
        } else {
          this.categories.update(list =>
            list.map(c => c.id === cat.id ? cat : c));
        }
        this.saving.set(false);
        this.closePanel();
        this.showSuccess('Category saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to save category');
      }
    });
  }

  deleteCategory(cat: CategoryResponse) {
    if (!confirm(`Delete "${cat.name}"? All items will be removed.`)) return;
    this.deletingId.set(cat.id);
    this.catSvc.delete(cat.id).subscribe({
      next: () => {
        this.categories.update(list => list.filter(c => c.id !== cat.id));
        if (this.selectedCatId() === cat.id) {
          const remaining = this.categories();
          if (remaining.length) this.selectCategory(remaining[0].id);
          else { this.selectedCatId.set(null); this.items.set([]); }
        }
        this.deletingId.set(null);
        this.showSuccess('Category deleted');
      },
      error: () => {
        this.deletingId.set(null);
        this.error.set('Failed to delete category');
      }
    });
  }

  toggleCategoryVisibility(cat: CategoryResponse) {
    this.catSvc.toggleVisibility(cat.id).subscribe({
      next: updated => {
        this.categories.update(list =>
          list.map(c => c.id === updated.id ? updated : c));
      }
    });
  }

  pickIcon(icon: string) {
    this.catIcon.set(icon);
    this.showIconPicker.set(false);
    this.customIconInput.set('');
  }

  toggleIconPicker() {
    this.showIconPicker.update(v => !v);
    if (!this.showIconPicker()) this.customIconInput.set('');
  }

  confirmCustomIcon() {
    const v = this.customIconInput().trim();
    if (v) this.pickIcon(v);
  }

  // ── Drag-to-reorder categories ────────────────────────────────────────────
  onDragStart(index: number) { this.dragIndex.set(index); }

  onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    const from = this.dragIndex();
    if (from === null || from === index) return;

    const list = [...this.categories()];
    const item = list.splice(from, 1)[0];
    list.splice(index, 0, item);
    this.categories.set(list);
    this.dragIndex.set(index);
  }

  onDragEnd() {
    this.dragIndex.set(null);
    const requests: ReorderRequest[] = this.categories()
      .map((c, i) => ({ id: c.id, position: i }));
    this.catSvc.reorder(requests).subscribe();
  }

  // ── Item CRUD ─────────────────────────────────────────────────────────────
  openCreateItem() {
    const catId = this.selectedCatId();
    if (!catId) return;
    this.panelMode.set('create');
    this.editingItem.set(null);
    this.resetItemForm();
    this.activePanel.set('item');
  }

  openEditItem(item: ItemResponse) {
    // Open the panel immediately with card data — no loading wait
    this.panelMode.set('edit');
    this.editingItem.set(item);
    this.itemName.set(item.name);
    this.itemDesc.set(item.description ?? '');
    this.itemPrice.set(item.basePrice);
    this.itemFeatured.set(item.featured);
    this.itemAvailable.set(item.available);
    this.itemVeg.set(item.vegetarian);
    this.itemVegan.set(item.vegan);
    this.itemGluten.set(item.glutenFree);
    this.itemSpicy.set(item.spicy);
    this.itemTags.set(item.tags ?? '');
    this.itemImageFile.set(null);
    this.itemImagePreview.set(item.imageUrl);
    this.activePanel.set('item');

    // Fetch the full item (includes variantGroups + modifierGroups)
    // and update editingItem so the Options section populates
    this.itemSvc.getById(item.id).subscribe({
      next: fullItem => {
        // Only update if the user is still viewing this item
        if (this.editingItem()?.id === item.id) {
          this.editingItem.set(fullItem);
        }
      },
      error: () => {
        this.error.set('Could not load variant and modifier groups');
      }
    });
  }

  private resetItemForm() {
    this.itemName.set('');
    this.itemDesc.set('');
    this.itemPrice.set(null);
    this.itemFeatured.set(false);
    this.itemAvailable.set(true);
    this.itemVeg.set(false);
    this.itemVegan.set(false);
    this.itemGluten.set(false);
    this.itemSpicy.set(false);
    this.itemTags.set('');
    this.itemImageFile.set(null);
    this.itemImagePreview.set(null);
  }

  onItemImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('Image must be under 5MB'); return;
    }
    this.itemImageFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.itemImagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  clearItemImage() {
    this.itemImageFile.set(null);
    this.itemImagePreview.set(
      this.panelMode() === 'edit'
        ? this.editingItem()?.imageUrl ?? null
        : null
    );
  }

  removeItemImage() {
    const item = this.editingItem();
    if (!item?.imageUrl) return;
    if (!confirm('Remove this image?')) return;

    this.removingImage.set(true);
    this.itemSvc.removeImage(item.id).subscribe({
      next: () => {
        // Clear preview and sync state
        this.itemImageFile.set(null);
        this.itemImagePreview.set(null);
        const updated = { ...item, imageUrl: null };
        this.editingItem.set(updated as any);
        this.items.update(list =>
          list.map(i => i.id === item.id ? { ...i, imageUrl: null } as any : i));
        this.removingImage.set(false);
        this.showSuccess('Image removed');
      },
      error: () => {
        this.removingImage.set(false);
        this.error.set('Failed to remove image');
      }
    });
  }

  saveItem() {
    const catId = this.selectedCatId();
    if (!this.itemName().trim() || !catId) return;
    this.saving.set(true);

    const req: ItemRequest = {
      categoryId: catId,
      name: this.itemName().trim(),
      description: this.itemDesc() || undefined,
      basePrice: this.itemPrice() ?? undefined,
      featured: this.itemFeatured(),
      available: this.itemAvailable(),
      vegetarian: this.itemVeg(),
      vegan: this.itemVegan(),
      glutenFree: this.itemGluten(),
      spicy: this.itemSpicy(),
      tags: this.itemTags() || undefined,
    };

    const image = this.itemImageFile() ?? undefined;

    const action$ = this.panelMode() === 'create'
      ? this.itemSvc.create(req, image)
      : this.itemSvc.update(this.editingItem()!.id, req, image);

    action$.subscribe({
      next: item => {
        if (this.panelMode() === 'create') {
          this.items.update(list => [...list, item]);
          this.categories.update(list =>
            list.map(c => c.id === catId
              ? { ...c, itemCount: c.itemCount + 1 } : c));
        } else {
          this.items.update(list =>
            list.map(i => i.id === item.id ? item : i));
          this.editingItem.set(item);
        }
        this.saving.set(false);
        this.showSuccess('Item saved');
        if (this.panelMode() === 'create') this.closePanel();
        else this.panelMode.set('edit'); // stay open for variants
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to save item');
      }
    });
  }

  deleteItem(item: ItemResponse) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    this.deletingId.set(item.id);
    this.itemSvc.delete(item.id).subscribe({
      next: () => {
        const catId = this.selectedCatId()!;
        this.items.update(list => list.filter(i => i.id !== item.id));
        this.categories.update(list =>
          list.map(c => c.id === catId
            ? { ...c, itemCount: Math.max(0, c.itemCount - 1) } : c));
        this.deletingId.set(null);
        if (this.editingItem()?.id === item.id) this.closePanel();
        this.showSuccess('Item deleted');
      },
      error: () => {
        this.deletingId.set(null);
        this.error.set('Failed to delete item');
      }
    });
  }

  toggleItemAvailability(item: ItemResponse) {
    this.itemSvc.toggleAvailability(item.id).subscribe({
      next: () => {
        this.items.update(list =>
          list.map(i => i.id === item.id
            ? { ...i, available: !i.available } : i));
        if (this.editingItem()?.id === item.id) {
          this.editingItem.update(i =>
            i ? { ...i, available: !i.available } : null);
        }
      }
    });
  }

  // ── Variant groups ────────────────────────────────────────────────────────
  openAddVariantGroup() {
    this.panelMode.set('create');
    this.editingVGroup.set(null);
    this.vgName.set('');
    this.vgRequired.set(true);
    this.vgUiType.set('pills');
    this.newVariantName.set('');
    this.newVariantPrice.set(0);
    this.newVariantDefault.set(false);
    this.activePanel.set('variantGroup');
  }

  openEditVariantGroup(g: VariantGroupResponse) {
    this.panelMode.set('edit');
    this.editingVGroup.set(g);
    this.vgName.set(g.name);
    this.vgRequired.set(g.required);
    this.vgUiType.set(g.uiType);
    this.activePanel.set('variantGroup');
  }

  saveVariantGroup() {
    const itemId = this.editingItem()?.id;
    if (!itemId || !this.vgName().trim()) return;
    this.saving.set(true);
    this.error.set(null);

    const req: VariantGroupRequest = {
      name: this.vgName().trim(),
      required: this.vgRequired(),
      uiType: this.vgUiType(),
    };

    const isCreating = this.panelMode() === 'create';

    const action$ = isCreating
      ? this.itemSvc.createVariantGroup(itemId, req)
      : this.itemSvc.updateVariantGroup(itemId, this.editingVGroup()!.id, req);

    action$.subscribe({
      next: group => {
        // 1. Stop spinner — always first
        this.saving.set(false);

        // 2. Set editingVGroup BEFORE switching panelMode so the template
        //    finds it immediately when it re-renders in edit mode
        this.editingVGroup.set(group);
        this.panelMode.set('edit');

        // 3. Sync into the editingItem so the item panel shows the group
        //    when the user navigates back with the Back button
        this.editingItem.update(item => {
          if (!item) return item;
          const exists = item.variantGroups.some(g => g.id === group.id);
          return {
            ...item,
            hasVariants: true,
            variantGroups: exists
              ? item.variantGroups.map(g => g.id === group.id ? group : g)
              : [...item.variantGroups, group],
          };
        });

        // 4. Sync into the items grid list
        this.items.update(list => list.map(i => {
          if (i.id !== itemId) return i;
          const exists = i.variantGroups.some(g => g.id === group.id);
          return {
            ...i,
            hasVariants: true,
            variantGroups: exists
              ? i.variantGroups.map(g => g.id === group.id ? group : g)
              : [...i.variantGroups, group],
          };
        }));

        this.showSuccess(isCreating
          ? 'Variant group created — add variants below'
          : 'Variant group saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to save variant group');
      }
    });
  }

  deleteVariantGroup(itemId: string, groupId: string) {
    if (!confirm('Remove this variant group?')) return;
    this.itemSvc.deleteVariantGroup(itemId, groupId).subscribe({
      next: () => {
        this.items.update(list => list.map(i =>
          i.id === itemId
            ? { ...i, variantGroups: i.variantGroups.filter(g => g.id !== groupId) }
            : i
        ));
        if (this.editingItem()?.id === itemId) {
          this.editingItem.update(i =>
            i ? { ...i, variantGroups: i.variantGroups.filter(g => g.id !== groupId) } : null);
        }
        if (this.editingVGroup()?.id === groupId) this.activePanel.set('item');
      }
    });
  }

  addVariant() {
    const itemId = this.editingItem()?.id;
    const groupId = this.editingVGroup()?.id;
    if (!itemId || !groupId || !this.newVariantName().trim()) return;

    const req: VariantRequest = {
      name: this.newVariantName().trim(),
      price: this.newVariantPrice(),
      available: true,
      isDefault: this.newVariantDefault(),
    };

    this.itemSvc.addVariant(itemId, groupId, req).subscribe({
      next: group => {
        this.updateItemVariantGroup(itemId, group);
        this.editingVGroup.set(group);
        this.newVariantName.set('');
        this.newVariantPrice.set(0);
        this.newVariantDefault.set(false);
      }
    });
  }

  deleteVariant(itemId: string, groupId: string, variantId: string) {
    this.itemSvc.deleteVariant(itemId, groupId, variantId).subscribe({
      next: () => {
        this.editingVGroup.update(g =>
          g ? { ...g, variants: g.variants.filter(v => v.id !== variantId) } : null);
        this.updateItemVariantGroupFromEditing(itemId);
      }
    });
  }

  // ── Modifier groups ───────────────────────────────────────────────────────
  openAddModifierGroup() {
    this.panelMode.set('create');
    this.editingMGroup.set(null);
    this.mgName.set('');
    this.mgDesc.set('');
    this.mgRequired.set(false);
    this.mgMin.set(0);
    this.mgMax.set(3);
    this.mgUiType.set('checkbox');
    this.newModName.set('');
    this.newModPrice.set(0);
    this.newModDefault.set(false);
    this.activePanel.set('modifierGroup');
  }

  openEditModifierGroup(g: ModifierGroupResponse) {
    this.panelMode.set('edit');
    this.editingMGroup.set(g);
    this.mgName.set(g.name);
    this.mgDesc.set(g.description ?? '');
    this.mgRequired.set(g.required);
    this.mgMin.set(g.minSelect);
    this.mgMax.set(g.maxSelect);
    this.mgUiType.set(g.uiType);
    this.activePanel.set('modifierGroup');
  }

  saveModifierGroup() {
    const itemId = this.editingItem()?.id;
    if (!itemId || !this.mgName().trim()) return;
    this.saving.set(true);
    this.error.set(null);

    const req: ModifierGroupRequest = {
      name: this.mgName().trim(),
      description: this.mgDesc() || undefined,
      required: this.mgRequired(),
      minSelect: this.mgMin(),
      maxSelect: this.mgMax(),
      uiType: this.mgUiType(),
    };

    const isCreating = this.panelMode() === 'create';

    const action$ = isCreating
      ? this.itemSvc.createModifierGroup(itemId, req)
      : this.itemSvc.updateModifierGroup(itemId, this.editingMGroup()!.id, req);

    action$.subscribe({
      next: group => {
        // 1. Stop spinner — always first
        this.saving.set(false);

        // 2. Set editingMGroup BEFORE switching panelMode
        this.editingMGroup.set(group);
        this.panelMode.set('edit');

        // 3. Sync into editingItem
        this.editingItem.update(item => {
          if (!item) return item;
          const exists = item.modifierGroups.some(g => g.id === group.id);
          return {
            ...item,
            modifierGroups: exists
              ? item.modifierGroups.map(g => g.id === group.id ? group : g)
              : [...item.modifierGroups, group],
          };
        });

        // 4. Sync into items grid
        this.items.update(list => list.map(i => {
          if (i.id !== itemId) return i;
          const exists = i.modifierGroups.some(g => g.id === group.id);
          return {
            ...i,
            modifierGroups: exists
              ? i.modifierGroups.map(g => g.id === group.id ? group : g)
              : [...i.modifierGroups, group],
          };
        }));

        this.showSuccess(isCreating
          ? 'Modifier group created — add modifiers below'
          : 'Modifier group saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to save modifier group');
      }
    });
  }

  deleteModifierGroup(itemId: string, groupId: string) {
    if (!confirm('Remove this modifier group?')) return;
    this.itemSvc.deleteModifierGroup(itemId, groupId).subscribe({
      next: () => {
        this.items.update(list => list.map(i =>
          i.id === itemId
            ? { ...i, modifierGroups: i.modifierGroups.filter(g => g.id !== groupId) }
            : i
        ));
        if (this.editingItem()?.id === itemId) {
          this.editingItem.update(i =>
            i ? { ...i, modifierGroups: i.modifierGroups.filter(g => g.id !== groupId) } : null);
        }
        if (this.editingMGroup()?.id === groupId) this.activePanel.set('item');
      }
    });
  }

  addModifier() {
    const itemId = this.editingItem()?.id;
    const groupId = this.editingMGroup()?.id;
    if (!itemId || !groupId || !this.newModName().trim()) return;

    const req: ModifierRequest = {
      name: this.newModName().trim(),
      priceDelta: this.newModPrice(),
      available: true,
      isDefault: this.newModDefault(),
    };

    this.itemSvc.addModifier(itemId, groupId, req).subscribe({
      next: group => {
        this.updateItemModifierGroup(itemId, group);
        this.editingMGroup.set(group);
        this.newModName.set('');
        this.newModPrice.set(0);
        this.newModDefault.set(false);
      }
    });
  }

  deleteModifier(itemId: string, groupId: string, modId: string) {
    this.itemSvc.deleteModifier(itemId, groupId, modId).subscribe({
      next: () => {
        this.editingMGroup.update(g =>
          g ? { ...g, modifiers: g.modifiers.filter(m => m.id !== modId) } : null);
        this.updateItemModifierGroupFromEditing(itemId);
      }
    });
  }

  // ── Panel navigation ──────────────────────────────────────────────────────
  closePanel() {
    this.activePanel.set('none');
    this.editingItem.set(null);
    this.editingCat.set(null);
    this.editingVGroup.set(null);
    this.editingMGroup.set(null);
    this.showIconPicker.set(false);
  }

  backToItem() {
    this.editingVGroup.set(null);
    this.editingMGroup.set(null);
    this.activePanel.set('item');
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private updateItemVariantGroup(itemId: string, group: VariantGroupResponse) {
    const updater = (i: ItemResponse): ItemResponse => {
      const exists = i.variantGroups.some(g => g.id === group.id);
      return {
        ...i,
        variantGroups: exists
          ? i.variantGroups.map(g => g.id === group.id ? group : g)
          : [...i.variantGroups, group]
      };
    };
    this.items.update(list => list.map(i => i.id === itemId ? updater(i) : i));
    this.editingItem.update(i => i?.id === itemId ? updater(i) : i);
  }

  private updateItemVariantGroupFromEditing(itemId: string) {
    const g = this.editingVGroup();
    if (!g) return;
    this.updateItemVariantGroup(itemId, g);
  }

  private updateItemModifierGroup(itemId: string, group: ModifierGroupResponse) {
    const updater = (i: ItemResponse): ItemResponse => {
      const exists = i.modifierGroups.some(g => g.id === group.id);
      return {
        ...i,
        modifierGroups: exists
          ? i.modifierGroups.map(g => g.id === group.id ? group : g)
          : [...i.modifierGroups, group]
      };
    };
    this.items.update(list => list.map(i => i.id === itemId ? updater(i) : i));
    this.editingItem.update(i => i?.id === itemId ? updater(i) : i);
  }

  private updateItemModifierGroupFromEditing(itemId: string) {
    const g = this.editingMGroup();
    if (!g) return;
    this.updateItemModifierGroup(itemId, g);
  }

  private showSuccess(msg: string) {
    this.success.set(msg);
    setTimeout(() => this.success.set(null), 3000);
  }

  // ── Template helpers ──────────────────────────────────────────────────────
  formatPrice(p: number | null): string {
    if (p == null) return '';
    return p.toFixed(3) + ' DT';
  }

  setCatName(v: string) { this.catName.set(v); }
  setCatIcon(v: string) { this.catIcon.set(v); }
  setCustomIconInput(v: string) { this.customIconInput.set(v); }
  toggleCatVisible() { this.catVisible.update(v => !v); }
  setItemName(v: string) { this.itemName.set(v); }
  setItemDesc(v: string) { this.itemDesc.set(v); }
  setItemPrice(v: string) { this.itemPrice.set(v ? +v : null); }
  toggleFeatured() { this.itemFeatured.update(v => !v); }
  toggleAvailable() { this.itemAvailable.update(v => !v); }
  toggleVeg() { this.itemVeg.update(v => !v); }
  toggleVegan() { this.itemVegan.update(v => !v); }
  toggleGluten() { this.itemGluten.update(v => !v); }
  toggleSpicy() { this.itemSpicy.update(v => !v); }
  setItemTags(v: string) { this.itemTags.set(v); }
  setVgName(v: string) { this.vgName.set(v); }
  toggleVgRequired() { this.vgRequired.update(v => !v); }
  setVgUiType(v: string) { this.vgUiType.set(v as any); }
  setMgName(v: string) { this.mgName.set(v); }
  setMgDesc(v: string) { this.mgDesc.set(v); }
  toggleMgRequired() { this.mgRequired.update(v => !v); }
  setMgMin(v: string) { this.mgMin.set(+v); }
  setMgMax(v: string) { this.mgMax.set(+v); }
  setMgUiType(v: string) { this.mgUiType.set(v as any); }
  setNewVarName(v: string) { this.newVariantName.set(v); }
  setNewVarPrice(v: string) { this.newVariantPrice.set(+v); }
  toggleNewVarDefault() { this.newVariantDefault.update(v => !v); }
  setNewModName(v: string) { this.newModName.set(v); }
  setNewModPrice(v: string) { this.newModPrice.set(+v); }
  toggleNewModDefault() { this.newModDefault.update(v => !v); }
}