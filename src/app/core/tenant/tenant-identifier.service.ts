import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class TenantIdentifierService {
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
