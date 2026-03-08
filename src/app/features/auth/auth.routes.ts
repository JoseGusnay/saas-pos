import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    {
        path: 'login',
        loadComponent: () => import('./pages/login-page/login-page.component').then(m => m.LoginPageComponent)
    },
    {
        path: 'select-branch',
        loadComponent: () => import('./pages/select-branch-page/select-branch-page.component').then(m => m.SelectBranchPageComponent)
    },
    {
        path: 'recover-password',
        loadComponent: () => import('./pages/recover-password-page/recover-password-page.component').then(m => m.RecoverPasswordPageComponent)
    },
    {
        path: 'reset-password',
        loadComponent: () => import('./pages/reset-password-page/reset-password-page.component').then(m => m.ResetPasswordPageComponent)
    }
];
