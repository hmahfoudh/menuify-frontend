import { Routes } from '@angular/router';

export const MENU_ROUTES: Routes = [
  {
    path:          '',
    loadComponent: () =>
      import('./menu-manager/menu-manager.component')
        .then(m => m.MenuManagerComponent),
  },
];