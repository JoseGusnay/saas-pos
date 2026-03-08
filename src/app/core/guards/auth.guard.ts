import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard funcional que protege rutas para asegurar que el usuario esté autenticado.
 * 
 * En Angular 18+, usamos funciones en lugar de clases inyectables para los guards.
 */
export const authGuardFn: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Verificamos si la señal indica que hay sesión
    if (authService.isAuthenticated()) {
        return true;
    }

    // Opcional: Podríamos verificar la existencia temporal de una cookie si no hay signal
    // pero dado que el backend usa HTTP-Only, la Signal reactiva es nuestra mejor fuente de verdad en mem.
    // Si no está auth, mandamos al login
    return router.parseUrl('/auth/login');
};
