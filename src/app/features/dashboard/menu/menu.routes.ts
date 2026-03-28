import { Routes } from '@angular/router';

export const MENU_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./categories/categories.component')
        .then(m => m.CategoriesComponent)
  },
  {
    path: 'items/:categoryId',
    loadComponent: () =>
      import('./items/items.component')
        .then(m => m.ItemsComponent)
  }
];