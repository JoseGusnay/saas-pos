import { ApplicationConfig } from "@angular/core";
import { provideHttpClient, withFetch, withInterceptorsFromDi, withInterceptors } from "@angular/common/http";
import { PreloadAllModules, Router, provideRouter, withPreloading } from "@angular/router";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";

import { routes } from "./app.routes";
import { APP_INITIALIZER } from "@angular/core";
import { AuthService } from "./core/services/auth.service";
import { firstValueFrom, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { tenantInterceptor } from "./core/interceptors/tenant.interceptor";
import { provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronUp,
  lucideChevronDown,
  lucideLayoutDashboard,
  lucideInbox,
  lucideUsers,
  lucideCreditCard,
  lucideBarChart2,
  lucideSettings,
  lucideShield,
  lucideChevronsUpDown,
  lucideHexagon,
  lucideTrendingUp,
  lucideActivity,
  lucideFileText,
  lucideTerminal,
  lucidePackage,
  lucideBanknote,
  lucideTags,
  lucideMoon,
  lucideSun,
  lucidePlus,
  lucideSearch,
  lucideFilter,
  lucideList,
  lucideGrid,
  lucideMoreVertical,
  lucideMapPin,
  lucidePhone,
  lucideUser,
  lucideCheck,
  lucideX,
  lucideMenu,
  lucideBell,
  lucideLogOut,
  lucideSave,
  lucideShieldCheck,
  lucideLayers,
  lucideTag,
  lucideBox,
  lucideArchive,
  lucidePercent,
  lucideWarehouse,
  lucideBuilding2,
  lucideShoppingCart,
  lucideClipboardList,
  lucideUpload,
  lucideCheckCircle2,
  lucideAlertTriangle,
  lucideRefreshCw,
  lucideInfo,
  lucideRuler,
} from '@ng-icons/lucide';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideAnimationsAsync(),
    provideHttpClient(withFetch(), withInterceptors([tenantInterceptor]), withInterceptorsFromDi()),
    {
      provide: APP_INITIALIZER,
      useFactory: (authService: AuthService, router: Router) => () => {
        return firstValueFrom(
          authService.getInitialContext().pipe(
            catchError(() => of(null)) // Manejamos errores de red o auth
          )
        ).then(ctx => {
          // Si el tenant no existe o no es operativo, mandamos al error
          if (!ctx?.tenant?.exists || !ctx?.tenant?.isOperational) {
            if (!window.location.pathname.includes('workspace-not-found')) {
              router.navigate(['/workspace-not-found']);
            }
          }
        });
      },
      multi: true,
      deps: [AuthService, Router]
    },
    provideIcons({
      lucideChevronLeft,
      lucideChevronRight,
      lucideChevronUp,
      lucideChevronDown,
      lucideLayoutDashboard,
      lucideInbox,
      lucideUsers,
      lucideCreditCard,
      lucideBarChart2,
      lucideSettings,
      lucideShield,
      lucideChevronsUpDown,
      lucideHexagon,
      lucideTrendingUp,
      lucideActivity,
      lucideFileText,
      lucideTerminal,
      lucidePackage,
      lucideBanknote,
      lucideTags,
      lucideMoon,
      lucideSun,
      lucidePlus,
      lucideSearch,
      lucideFilter,
      lucideList,
      lucideGrid,
      lucideMoreVertical,
      lucideMapPin,
      lucidePhone,
      lucideUser,
      lucideCheck,
      lucideX,
      lucideMenu,
      lucideBell,
      lucideLogOut,
      lucideSave,
      lucideShieldCheck,
      lucideLayers,
      lucideTag,
      lucideBox,
      lucideArchive,
      lucidePercent,
      lucideWarehouse,
      lucideBuilding2,
      lucideShoppingCart,
      lucideClipboardList,
      lucideUpload,
      lucideCheckCircle2,
      lucideAlertTriangle,
      lucideRefreshCw,
      lucideInfo,
      lucideRuler,
    })
  ],
};
