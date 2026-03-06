import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TenantValidationResult {
    exists: boolean;
    isOperational?: boolean;
    status?: string;
    name?: string;
    locale?: string;
}

@Injectable({
    providedIn: 'root'
})
export class TenantIdentifierService {
    private readonly http = inject(HttpClient);

    // Estado global de validación (true = dibujar app, false = dibujar 404, null = cargando)
    private readonly _isTenantValid = signal<boolean | null>(null);
    public readonly isTenantValid = this._isTenantValid.asReadonly();

    // Metadata del tenant para personalizar la UI luego si se desea
    private readonly _tenantMetadata = signal<TenantValidationResult | null>(null);
    public readonly tenantMetadata = this._tenantMetadata.asReadonly();

    /**
     * Se ejecuta durante el APP_INITIALIZER de Angular para verificar directo en la base de datos maestra
     * si el dominio pertenece a un Tenant activo.
     */
    public async validateTenantOnLoad(): Promise<boolean> {
        const subdomain = this.getTenantSubdomain();

        // Si no detectamos subdominio pasamos directo (Probablemente login Maestro o localhost)
        if (!subdomain) {
            this._isTenantValid.set(true);
            return true;
        }

        try {
            const response = await firstValueFrom(
                this.http.get<{ data: TenantValidationResult }>(`${environment.apiUrl}/api/public/tenant/check/${subdomain}`)
            );

            const result = response.data;

            if (result && result.exists && result.isOperational) {
                this._isTenantValid.set(true);
                this._tenantMetadata.set(result);
                return true;
            }

            this._isTenantValid.set(false);
            return false;

        } catch (error: any) {
            // Un código 404 indicará que el espacio directamente no existe
            this._isTenantValid.set(false);
            return false;
        }
    }
    /**
     * Extrae el subdominio de la URL actual del navegador.
     * Ej: si estamos en `https://cliente1.osodreamer.lat/login`, retorna `cliente1`.
     * Si estamos en localhost directo, retornará cadena vacía o valores de dev.
     */
    public getTenantSubdomain(): string {
        const hostname = window.location.hostname;

        // Si estamos en entorno de desarrollo local (ej: localhost:4200)
        if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            // Retornar un tenant por defecto útil para pruebas
            return 'fast-food';
        }

        const segments = hostname.split('.');

        // Si la URL tiene estructura correcta con subdominio (ej: cliente.dominio.lat)
        if (segments.length >= 3) {
            const subdomain = segments[0];
            if (subdomain !== 'www' && subdomain !== 'api') {
                return subdomain;
            }
        }

        // Fallback si no hay subdominio claro
        return '';
    }
}
