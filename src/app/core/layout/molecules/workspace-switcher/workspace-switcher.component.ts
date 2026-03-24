import { Component, input, inject } from '@angular/core';
import { LayoutService } from '../../services/layout.service';
import { IconComponent } from '../../atoms/icon/icon.component';

@Component({
  selector: 'app-workspace-switcher',
  standalone: true,
  imports: [IconComponent],
  template: `
    <button class="workspace-switcher" [class.workspace-switcher--collapsed]="layout.isVisuallyCollapsed()">
      <!-- Logo genérico para Acme Corp -->
      <div class="workspace-switcher__logo">
        <app-icon name="lucideHexagon"></app-icon>
      </div>
      
      <!-- Se oculta en estado colapsado -->
      <span class="workspace-switcher__name">{{ workspaceName() }}</span>
      <app-icon class="workspace-switcher__chevron" name="lucideChevronsUpDown"></app-icon>

      <!-- Tooltip personalizado de Workspaces -->
      <div class="workspace-switcher__tooltip">{{ workspaceName() }}</div>
    </button>
  `,
  styleUrl: './workspace-switcher.component.scss'
})
export class WorkspaceSwitcherComponent {
  layout = inject(LayoutService);
  workspaceName = input.required<string>();
}
