import { Component } from '@angular/core';
import { SidebarComponent } from '../../organisms/sidebar/sidebar.component';
import { HeaderComponent } from '../../organisms/header/header.component';
import { RouterOutlet } from '@angular/router';
import { LayoutService } from '../../services/layout.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [SidebarComponent, HeaderComponent, RouterOutlet],
  template: `
    <div class="app-shell">
      
      <!-- Backdrop Oscuro para cierre en Móviles -->
      <div 
        class="sidebar-backdrop" 
        [class.sidebar-backdrop--visible]="layout.isMobileMenuOpen()"
        (click)="layout.closeMobileMenu()"
      ></div>

      <!-- Lado Izquierdo Fijo -->
      <aside class="app-shell__sidebar" [class.app-shell__sidebar--mobile-open]="layout.isMobileMenuOpen()">
        <app-sidebar></app-sidebar>
      </aside>
      
      <!-- Wrapper Derecho (Header + Contenido) -->
      <div class="app-shell__wrapper">
        
        <header class="app-shell__header">
          <app-header></app-header>
        </header>
        
        <main class="app-shell__main">
          <!-- El Canvas Neo-minimalista -->
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  layout = inject(LayoutService);
}
