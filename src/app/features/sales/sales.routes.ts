import { Routes } from '@angular/router';

export const SALES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/sales-list/sales-list.component').then(m => m.SalesListComponent),
    data: { breadcrumb: 'Historial de Ventas' },
  },
];
