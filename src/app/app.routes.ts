import { Routes } from '@angular/router';
import { AppShellComponent } from './core/layout/templates/app-shell/app-shell.component';
import { authGuardFn } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
    },
    {
        path: '',
        component: AppShellComponent,
        canActivate: [authGuardFn],
        children: [
            { path: '', redirectTo: 'sucursales', pathMatch: 'full' },
            {
                path: 'sucursales',
                loadComponent: () => import('./features/branches/pages/branches-list/branches-list.component').then(m => m.BranchesListComponent)
            }
        ]
    },
    {
        path: 'workspace-not-found',
        loadComponent: () => import('./features/error/pages/workspace-not-found-page/workspace-not-found-page.component').then(m => m.WorkspaceNotFoundPageComponent)
    }
];
