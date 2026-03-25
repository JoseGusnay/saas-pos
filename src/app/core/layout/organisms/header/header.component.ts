import { Component, inject } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { LayoutService } from '../../services/layout.service';
import { BreadcrumbService, Breadcrumb } from '../../../services/breadcrumb.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <header class="header">
      
      <div class="header__left">
        <!-- Botón Hamburguesa Móvil (Visible solo < 768px) -->
        <button class="header__mobile-toggle" (click)="layout.toggleMobileMenu()">
          <app-icon name="lucidePanelLeftOpen"></app-icon>
        </button>

        <!-- Breadcrumbs -->
        <nav class="header__breadcrumbs">
          @for (bc of breadcrumbs.breadcrumbs(); track bc.url; let last = $last) {
            @if (!last) {
              <a [routerLink]="bc.url" class="header__breadcrumb-link">{{ bc.label }}</a>
              <app-icon name="lucideChevronRight" class="header__breadcrumb-separator"></app-icon>
            } @else {
              <span class="header__breadcrumb-current">{{ bc.label }}</span>
            }
          }
        </nav>
      </div>

      <div class="header__right">
        
        <!-- Search Input ⌘K -->
        <div class="header__search">
          <app-icon name="lucideSearch"></app-icon>
          <input type="text" placeholder="Buscar...">
          <kbd class="shortcut">⌘K</kbd>
        </div>

        <!-- Acciones -->
        <button class="header__action">
          <app-icon name="lucideBell"></app-icon>
          <!-- Puntito rojo simulando nueva notificación -->
          <span class="indicator"></span>
        </button>

      </div>

    </header>
  `,
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  layout = inject(LayoutService);
  breadcrumbs = inject(BreadcrumbService);
}
