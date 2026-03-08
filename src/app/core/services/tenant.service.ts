import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse, TenantValidationResponse } from '../models/auth.models';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class TenantService {
    private http = inject(HttpClient);

    // Estado del tenant
    private tenantData = signal<TenantValidationResponse | null>(null);
    readonly tenant = this.tenantData.asReadonly();

    private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl}/public/tenant` : '/public/tenant';

    /**
     * Extrae el subdominio de la URL actual o usa el de desarrollo.
     */
    get currentSubdomain(): string {
        if (!environment.production) {
            return environment.devSubdomain || 'osotest';
        }

        const hostname = window.location.hostname;
        const parts = hostname.split('.');

        // Si es subdominio.dominio.com -> subdominio
        if (parts.length >= 3) {
            return parts[0];
        }

        return '';
    }

    /**
     * Valida si el tenant actual existe y está operativo.
     */
    validateTenant(): Observable<boolean> {
        const subdomain = this.currentSubdomain;

        if (!subdomain) {
            return of(false);
        }

        return this.http.get<ApiResponse<TenantValidationResponse>>(`${this.baseUrl}/check/${subdomain}`)
            .pipe(
                map(res => res.data),
                tap(data => {
                    this.tenantData.set(data);
                }),
                map(data => data.exists && data.isOperational),
                catchError(() => {
                    this.tenantData.set(null);
                    return of(false);
                })
            );
    }
}
