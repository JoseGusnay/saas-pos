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
    path: 'unidades',
    loadComponent: () => import('./pages/units-list/units-list.component').then(m => m.UnitsListComponent),
    data: { breadcrumb: 'Unidades de Medida' }
  },
  {
    path: 'presentaciones',
    loadComponent: () => import('./pages/presentations-list/presentations-list.component').then(m => m.PresentationsListComponent),
    data: { breadcrumb: 'Presentaciones' }
  },
  {
    path: 'atributos',
    loadComponent: () => import('./pages/attribute-types-list/attribute-types-list.component').then(m => m.AttributeTypesListComponent),
    data: { breadcrumb: 'Tipos de Atributo' }
  },
  {
    path: 'impuestos',
    loadComponent: () => import('./pages/taxes-list/taxes-list.component').then(m => m.TaxesListComponent),
    data: { breadcrumb: 'Impuestos' }
  },
  {
    path: 'productos',
    loadComponent: () => import('./pages/products-list/products-list.component').then(m => m.ProductsListComponent),
    data: { breadcrumb: 'Catálogo de Productos' }
  },
  {
    path: 'productos/crear',
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
  },
  {
    path: 'stock',
    loadComponent: () => import('./pages/stock-list/stock-list.component').then(m => m.StockListComponent),
    data: { breadcrumb: 'Stock' }
  },
  {
    path: 'proveedores',
    loadComponent: () => import('./pages/suppliers-list/suppliers-list.component').then(m => m.SuppliersListComponent),
    data: { breadcrumb: 'Proveedores' }
  },
  {
    path: 'ordenes-compra',
    loadComponent: () => import('./pages/purchase-orders-list/purchase-orders-list.component').then(m => m.PurchaseOrdersListComponent),
    data: { breadcrumb: 'Órdenes de Compra' }
  },
  {
    path: 'ordenes-compra/nueva',
    loadComponent: () => import('./pages/purchase-order-form/purchase-order-form.component').then(m => m.PurchaseOrderFormComponent),
    data: { breadcrumb: 'Nueva Orden de Compra' }
  },
  {
    path: 'ordenes-compra/:id/editar',
    loadComponent: () => import('./pages/purchase-order-form/purchase-order-form.component').then(m => m.PurchaseOrderFormComponent),
    data: { breadcrumb: 'Editar Orden de Compra' }
  }
];

