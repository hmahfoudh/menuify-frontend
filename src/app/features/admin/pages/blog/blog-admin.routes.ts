import { Routes } from '@angular/router';

export const BLOG_ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./blog-admin-list/blog-admin-list.component')
      .then(m => m.BlogAdminListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./blog-admin-editor/blog-admin-editor.component')
      .then(m => m.BlogAdminEditorComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./blog-admin-editor/blog-admin-editor.component')
      .then(m => m.BlogAdminEditorComponent)
  }
];