import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Modal } from './core/components/modal/modal';
import { ToastComponent } from './shared/components/ui/toast/toast.component';
import { LayoutService } from './core/layout/services/layout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Modal, ToastComponent],
  template: ` 
   
      <router-outlet />
      <app-modal></app-modal>
      <app-toast></app-toast>
    
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private layoutService = inject(LayoutService);
}
