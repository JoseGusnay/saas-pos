import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withFetch,
} from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { TenantIdentifierService } from './core/tenant/tenant-identifier.service';

export function initializeTenant(tenantService: TenantIdentifierService) {
  return () => tenantService.validateTenantOnLoad();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor]),
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTenant,
      deps: [TenantIdentifierService],
      multi: true,
    },
  ],
};
