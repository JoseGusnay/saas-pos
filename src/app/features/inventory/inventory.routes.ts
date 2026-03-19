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
  },
  {
    path: 'presentaciones',
    loadComponent: () => import('./pages/presentations-list/presentations-list.component').then(m => m.PresentationsListComponent),
    data: { breadcrumb: 'Presentaciones' }
  },
  {
    path: 'productos',
    loadComponent: () => import('./pages/products-list/products-list.component').then(m => m.ProductsListComponent),
    data: { breadcrumb: 'Catálogo de Productos' }
  },
  {
    path: 'productos/nuevo',
    loadComponent: () => import('./pages/product-form-page/product-form-page.component').then(m => m.ProductFormPageComponent),
    data: { breadcrumb: 'Nuevo Producto' }
  },
  {
    path: 'productos/:id',
    loadComponent: () => import('./pages/product-detail-page/product-detail-page.component').then(m => m.ProductDetailPageComponent),
    data: { breadcrumb: 'Detalle de Producto' }
  },
  {
    path: 'productos/:id/editar',
    loadComponent: () => import('./pages/product-form-page/product-form-page.component').then(m => m.ProductFormPageComponent),
    data: { breadcrumb: 'Editar Producto' }
  }
];

