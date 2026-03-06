import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TenantIdentifierService } from '../tenant/tenant-identifier.service';

/**
 * AuthInterceptor — Functional HTTP interceptor.
 * 1. Attaches Bearer token to every outgoing request (except /login).
 * 2. On 401 response: attempts one silent refresh. If refresh fails → logout.
 */
export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn,
) => {
    const auth = inject(AuthService);
    const tenantIdentifier = inject(TenantIdentifierService);

    // Skip adding token ONLY to the initial login (user has no token yet)
    const isLoginEndpoint = req.url.includes('/auth/login');

    const token = auth.getToken();
    const subdomain = tenantIdentifier.getTenantSubdomain();

    let headers = req.headers;

    if (token && !isLoginEndpoint) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }

    if (subdomain) {
        headers = headers.set('x-tenant-id', subdomain);
    }

    const authReq = req.clone({ headers });

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 && !isLoginEndpoint) {
                // Attempt silent refresh
                return auth.refresh().pipe(
                    switchMap(() => {
                        const newToken = auth.getToken();
                        const retryReq = newToken
                            ? req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
                            : req;
                        return next(retryReq);
                    }),
                    catchError((refreshError) => {
                        // Refresh also failed → force logout
                        auth.logout();
                        return throwError(() => refreshError);
                    }),
                );
            }
            return throwError(() => error);
        }),
    );
};
