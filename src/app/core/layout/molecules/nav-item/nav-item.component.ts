import { Component, input, output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-nav-item',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, BadgeComponent],
  template: `
    <!-- Inyectamos a :host el relative para controlar a sus absolutos como hermanos libres -->
    @if (route()) {
      <a 
        [routerLink]="route()" 
        [routerLinkActive]="'nav-item--active'"
        [routerLinkActiveOptions]="{ exact: exactMatch() }"
        class="nav-item"
        [class.nav-item--collapsed]="layout.isSidebarCollapsed()"
      >
        <app-icon [name]="icon()"></app-icon>
        
        <span class="nav-item__label">{{ label() }}</span>
        
        @if (badge() && !layout.isSidebarCollapsed()) {
          <app-badge [text]="badge()!" [variant]="badgeVariant()"></app-badge>
        }
      </a>
      
      <!-- Tooltip estilizado para estado colapsado (Afuera del ancla para esquivar el Text Truncate) -->
      @if (layout.isSidebarCollapsed()) {
        <div class="nav-item__tooltip">{{ label() }}</div>
      }
    } @else {
      <!-- Modo Botón (Usado por NavGroup para abrir submenús) -->
      <button 
        class="nav-item" 
        [class.nav-item--active]="isActive()"
        [class.nav-item--collapsed]="layout.isSidebarCollapsed()"
        (click)="onClick.emit()"
      >
        <app-icon [name]="icon()"></app-icon>
        <span class="nav-item__label">{{ label() }}</span>
        
        <!-- Chevron para acordeones, oculto al estar colapsado -->
        @if (!layout.isSidebarCollapsed()) {
          <app-icon 
            name="lucideChevronRight" 
            class="nav-item__chevron"
            [class.nav-item__chevron--rotated]="isExpanded()"
          ></app-icon>
        }
      </button>

      <!-- Tooltip estilizado para estado colapsado (Afuera del botón para esquivar el Text Truncate) -->
      @if (layout.isSidebarCollapsed()) {
        <div class="nav-item__tooltip">{{ label() }}</div>
      }
    }
  `,
  styleUrl: './nav-item.component.scss'
})
export class NavItemComponent {

  layout = inject(LayoutService);

  // Propiedades Básicas de un Link
  label = input.required<string>();
  icon = input.required<string>();
  route = input<string>();

  // Propiedades Avanzadas (Angular Router)
  exactMatch = input<boolean>(false);

  // Soporte para Badges Opcionales
  badge = input<string>();
  badgeVariant = input<'default' | 'success' | 'danger'>('default');

  // Soporte para Acordeones (NavGroup usa NavItem como Trigger)
  isActive = input<boolean>(false);     // Activa el resaltado si un hijo está activo
  isExpanded = input<boolean>(false);   // Controla si la flecha apunta arriba o abajo
  onClick = output<void>();             // Emite click para que el Padre (NavGroup) lo procese
}
