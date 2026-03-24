import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Modal } from './core/components/modal/modal';
import { ToastComponent } from './shared/components/ui/toast/toast.component';
import { ConfirmDialogComponent } from './core/components/confirm-dialog/confirm-dialog';
import { LayoutService } from './core/layout/services/layout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Modal, ToastComponent, ConfirmDialogComponent],
  template: `
      <router-outlet />
      <app-modal></app-modal>
      <app-toast></app-toast>
      <app-confirm-dialog></app-confirm-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private layoutService = inject(LayoutService);
}
