import { Routes } from '@angular/router';

export const CUSTOMERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/customers-list/customers-list.component').then(m => m.CustomersListComponent),
    data: { breadcrumb: 'Clientes' }
  },
];
