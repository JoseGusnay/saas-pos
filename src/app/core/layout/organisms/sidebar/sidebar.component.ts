import { Component, inject } from '@angular/core';
import { WorkspaceSwitcherComponent } from '../../molecules/workspace-switcher/workspace-switcher.component';
import { NavItemComponent } from '../../molecules/nav-item/nav-item.component';
import { NavGroupComponent, NavChild } from '../../molecules/nav-group/nav-group.component';
import { UserProfileComponent } from '../../molecules/user-profile/user-profile.component';
import { LayoutService } from '../../services/layout.service';
import { IconComponent } from '../../atoms/icon/icon.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    WorkspaceSwitcherComponent,
    NavItemComponent,
    NavGroupComponent,
    UserProfileComponent,
    IconComponent
  ],
  template: `
    <aside 
      class="sidebar" 
      [class.sidebar--collapsed]="layout.isSidebarCollapsed()"
      [class.sidebar--mobile-open]="layout.isMobileMenuOpen()"
    >
      
      <!-- Toggle Button Flotante -->
      <button 
        class="sidebar__toggle" 
        [class.sidebar__toggle--rotated]="layout.isSidebarCollapsed()"
        (click)="layout.toggleSidebar()"
      >
        <app-icon name="lucideChevronLeft"></app-icon>
      </button>

      <!-- Top: Workspace Selector -->
      <app-workspace-switcher workspaceName="Acme Corp"></app-workspace-switcher>

      <!-- Middle: Navigation Area -->
      <nav class="sidebar__nav">
        
        <!-- Primary Links -->
        <app-nav-item label="Dashboard" icon="lucideLayoutDashboard" route="/dashboard" [exactMatch]="true"></app-nav-item>
        <app-nav-item label="Inbox" icon="lucideInbox" route="/inbox" badge="14" badgeVariant="danger"></app-nav-item>
        <app-nav-item label="Clientes" icon="lucideUsers" route="/clients"></app-nav-item>

        <!-- Section 2: Operaciones POS -->
        <div class="sidebar__section-title">Operaciones</div>
        <app-nav-item label="Punto de Venta" icon="lucideTerminal" route="/pos" badge="Hot" badgeVariant="success"></app-nav-item>
        <app-nav-item label="Productos" icon="lucidePackage" route="/products"></app-nav-item>
        <app-nav-item label="Caja Registradora" icon="lucideBanknote" route="/cash-register"></app-nav-item>
        <app-nav-item label="Promociones" icon="lucideTags" route="/promotions"></app-nav-item>

        <!-- Section 3: Finanzas -->
        <div class="sidebar__section-title">Finanzas</div>
        <app-nav-item label="Facturación" icon="lucideCreditCard" route="/billing"></app-nav-item>
        
        <app-nav-group 
          label="Reportes" 
          icon="lucideBarChart2"
          [children]="reportesMenu">
        </app-nav-group>

        <!-- Section 4: Ajustes -->
        <div class="sidebar__section-title">Ajustes</div>
        <app-nav-item label="Configuración" icon="lucideSettings" route="/settings"></app-nav-item>
        <app-nav-item label="Seguridad" icon="lucideShield" route="/security"></app-nav-item>

      </nav>

      <!-- Bottom: User Profile -->
      <app-user-profile name="Admin" plan="Pro Plan"></app-user-profile>

    </aside>
  `,
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {

  // Inyección del estado global
  layout = inject(LayoutService);

  // Mock de datos para el NavGroup
  reportesMenu: NavChild[] = [
    { label: 'Ventas Anuales', route: '/reports/sales', icon: 'lucideTrendingUp' },
    { label: 'Rendimiento', route: '/reports/performance', icon: 'lucideActivity' },
    { label: 'Impuestos', route: '/reports/taxes', icon: 'lucideFileText' }
  ];

}
