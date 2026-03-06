import { Routes } from '@angular/router';
import { AppShellComponent } from './shared/ui/templates/app-shell/app-shell.component';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
    // ─── Public routes (no auth) ──────────────────────────────────────────────
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/login/login.component').then(m => m.LoginComponent),
    },
    {
        path: 'select-branch',
        loadComponent: () =>
            import('./features/auth/branch-select/branch-select.component').then(m => m.BranchSelectComponent),
    },

    // ─── Protected routes (auth required) ────────────────────────────────────
    {
        path: '',
        component: AppShellComponent,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full',
            },
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
            },
            {
                path: 'orders',
                loadComponent: () =>
                    import('./features/orders/orders.component').then(m => m.OrdersComponent),
            },
            {
                path: 'products',
                loadComponent: () =>
                    import('./features/products/products.component').then(m => m.ProductsComponent),
            },
            {
                path: 'inventory',
                loadComponent: () =>
                    import('./features/inventory/inventory.component').then(m => m.InventoryComponent),
            },
            {
                path: 'customers',
                loadComponent: () =>
                    import('./features/customers/customers.component').then(m => m.CustomersComponent),
            },
            {
                path: 'reports',
                loadComponent: () =>
                    import('./features/reports/reports.component').then(m => m.ReportsComponent),
            },
            {
                path: 'settings',
                loadComponent: () =>
                    import('./features/settings/settings.component').then(m => m.SettingsComponent),
            },
            {
                path: 'branches',
                loadComponent: () =>
                    import('./features/branches/branches.component').then(m => m.BranchesComponent),
            },
        ],
    },
    {
        path: '**',
        redirectTo: 'dashboard',
    },
];
