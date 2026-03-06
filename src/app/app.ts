import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WorkspaceNotFoundComponent } from './core/tenant/workspace-not-found.component';
import { TenantIdentifierService } from './core/tenant/tenant-identifier.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, WorkspaceNotFoundComponent],
  template: `
    @if (tenantService.isTenantValid()) {
      <router-outlet />
    } @else if (tenantService.isTenantValid() === false) {
      <app-workspace-not-found />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  public tenantService = inject(TenantIdentifierService);
}
