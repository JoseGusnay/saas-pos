import { Routes } from '@angular/router';

export const CONFIGURACION_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'empresa-fiscal',
    pathMatch: 'full'
  },
  {
    path: 'empresa-fiscal',
    loadComponent: () => import('./pages/empresa-fiscal/empresa-fiscal.component').then(m => m.EmpresaFiscalComponent),
    data: { breadcrumb: 'Empresa Fiscal' }
  },
  {
    path: 'sucursales',
    loadComponent: () => import('../branches/pages/branches-list/branches-list.component').then(m => m.BranchesListComponent),
    data: { breadcrumb: 'Sucursales' }
  },
  {
    path: 'usuarios',
    loadChildren: () => import('../users/users.routes').then(m => m.USER_ROUTES),
    data: { breadcrumb: 'Usuarios' }
  },
  {
    path: 'impuestos',
    loadComponent: () => import('../inventory/pages/taxes-list/taxes-list.component').then(m => m.TaxesListComponent),
    data: { breadcrumb: 'Impuestos' }
  },
];
