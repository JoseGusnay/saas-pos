import { Routes } from '@angular/router';
import { AppShellComponent } from './core/layout/templates/app-shell/app-shell.component';
import { authGuardFn } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
    },
    {
        path: 'pos',
        canActivate: [authGuardFn],
        loadChildren: () => import('./features/pos/pos.routes').then(m => m.POS_ROUTES),
    },
    {
        path: '',
        component: AppShellComponent,
        canActivate: [authGuardFn],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/branches/pages/branches-list/branches-list.component').then(m => m.BranchesListComponent),
                data: { breadcrumb: 'Dashboard' }
            },
            {
                path: 'inventario',
                loadChildren: () => import('./features/inventory/inventory.routes').then(m => m.INVENTORY_ROUTES),
                data: { breadcrumb: 'Inventario' }
            },
            {
                path: 'ventas',
                loadChildren: () => import('./features/sales/sales.routes').then(m => m.SALES_ROUTES),
                data: { breadcrumb: 'Ventas' }
            },
            {
                path: 'clientes',
                loadChildren: () => import('./features/customers/customers.routes').then(m => m.CUSTOMERS_ROUTES),
                data: { breadcrumb: 'Clientes' }
            },
            {
                path: 'configuracion',
                loadChildren: () => import('./features/configuracion/configuracion.routes').then(m => m.CONFIGURACION_ROUTES),
                data: { breadcrumb: 'Configuración' }
            },
            // Redirecciones de compatibilidad con rutas anteriores
            { path: 'sucursales', redirectTo: 'configuracion/sucursales', pathMatch: 'full' },
            { path: 'usuarios',   redirectTo: 'configuracion/usuarios',   pathMatch: 'full' },
        ]
    },
    {
        path: 'workspace-not-found',
        loadComponent: () => import('./features/error/pages/workspace-not-found-page/workspace-not-found-page.component').then(m => m.WorkspaceNotFoundPageComponent)
    }
];
