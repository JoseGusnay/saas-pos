import { Routes } from '@angular/router';

export const USER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/users-list/users-list.component').then(m => m.UsersListComponent),
    data: { breadcrumb: 'Listado' }
  },
  {
    path: 'roles',
    loadComponent: () => import('./pages/roles-list/roles-list.component').then(m => m.RolesListComponent),
    data: { breadcrumb: 'Roles' }
  }
];
