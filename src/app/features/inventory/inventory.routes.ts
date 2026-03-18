import { Routes } from '@angular/router';

export const INVENTORY_ROUTES: Routes = [
  {
    path: 'categorias',
    loadComponent: () => import('./pages/categories-list/categories-list.component').then(m => m.CategoriesListComponent),
    data: { breadcrumb: 'Categorías' }
  },
  {
    path: 'marcas',
    loadComponent: () => import('./pages/brands-list/brands-list.component').then(m => m.BrandsListComponent),
    data: { breadcrumb: 'Marcas' }
  }
];
