import { Component, inject } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IconComponent],
  template: `
    <header class="header">
      
      <div class="header__left">
        <!-- Botón Hamburguesa Móvil (Visible solo < 768px) -->
        <button class="header__mobile-toggle" (click)="layout.toggleMobileMenu()">
          <app-icon name="lucideMenu"></app-icon>
        </button>

        <!-- Breadcrumbs Minimalistas Premium -->
        <nav class="header__breadcrumbs">
          <a href="#" class="header__breadcrumb-link">Acme Corp</a>
          <span class="header__breadcrumb-separator">/</span>
          <a href="#" class="header__breadcrumb-link">Proyectos</a>
          <span class="header__breadcrumb-separator">/</span>
          <span class="header__breadcrumb-current">Dashboard</span>
        </nav>
      </div>

      <div class="header__right">
        
        <!-- Search Input ⌘K -->
        <div class="header__search">
          <app-icon name="search"></app-icon>
          <input type="text" placeholder="Buscar...">
          <kbd class="shortcut">⌘K</kbd>
        </div>

        <!-- Acciones -->
        <button class="header__action">
          <app-icon name="bell"></app-icon>
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
}
