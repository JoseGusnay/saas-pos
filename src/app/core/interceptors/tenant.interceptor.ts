import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
    let tenantId = '';

    if (!environment.production) {
        // Entorno local: Usamos la variable explicitamente definida en environment.development.ts
        tenantId = (environment as any).devSubdomain || '';
    } else {
        // Entorno producción: Extraemos el subdominio desde el hostname
        // Ejemplo: tenant.osodreamer.lat -> parts = ['tenant', 'osodreamer', 'lat']
        const hostname = window.location.hostname;
        const parts = hostname.split('.');

        // Asume un dominio base de 2 partes (osodreamer.lat) o localhost
        if (parts.length >= 3 && parts[0] !== 'www') {
            tenantId = parts[0];
        } else {
            // Fallback si no extraemos nada válido (por ejemplo en el dominio raíz)
            tenantId = '';
        }
    }

    // Inyectar cabecera 'x-tenant-id' si logramos resolver el identificador
    if (tenantId) {
        const clonedReq = req.clone({
            setHeaders: {
                'x-tenant-id': tenantId,
            },
        });
        return next(clonedReq);
    }

    return next(req);
};
