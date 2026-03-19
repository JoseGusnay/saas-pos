import { Component, inject } from '@angular/core';
import { trigger, transition, style, animate, query } from '@angular/animations';
import { SidebarComponent } from '../../organisms/sidebar/sidebar.component';
import { HeaderComponent } from '../../organisms/header/header.component';
import { RouterOutlet, Router } from '@angular/router';
import { LayoutService } from '../../services/layout.service';

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
        
        <main class="app-shell__main" [@routeFade]="router.url">
          <!-- El Canvas Neo-minimalista -->
          <router-outlet #outlet="outlet"></router-outlet>
        </main>
      </div>
    </div>
  `,
  styleUrl: './app-shell.component.scss',
  animations: [
    trigger('routeFade', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0 }),
          animate('500ms ease-in-out', style({ opacity: 1 }))
        ], { optional: true })
      ])
    ])
  ]
})
export class AppShellComponent {
  layout = inject(LayoutService);
  router = inject(Router);
}
