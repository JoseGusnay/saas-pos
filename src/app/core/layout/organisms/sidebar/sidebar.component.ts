import { Component, inject } from '@angular/core';
import { WorkspaceSwitcherComponent } from '../../molecules/workspace-switcher/workspace-switcher.component';
import { NavItemComponent } from '../../molecules/nav-item/nav-item.component';
import { NavGroupComponent, NavChild } from '../../molecules/nav-group/nav-group.component';
import { UserProfileComponent } from '../../molecules/user-profile/user-profile.component';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../../services/auth.service';
import { NavigationService } from '../../../services/navigation.service';
import { IconComponent } from '../../atoms/icon/icon.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
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
      <app-workspace-switcher 
        [workspaceName]="auth.tenant()?.name || 'Cargando...'"
      ></app-workspace-switcher>

      <!-- Middle: Navigation Area -->
      <nav class="sidebar__nav">
        
        @for (item of navigation.sidebarMenu(); track $index) {
          @if (item.type === 'section') {
            <div class="sidebar__section-title">{{ item.label }}</div>
          } @else if (item.type === 'group') {
             <app-nav-group 
               [label]="item.label" 
               [icon]="item.icon"
               [children]="item.children">
             </app-nav-group>
          } @else if (item.type === 'item') {
            <app-nav-item 
              [label]="item.label" 
              [icon]="item.icon" 
              [route]="item.route" 
              [exactMatch]="item.exactMatch || false"
              [badge]="item.badge"
              [badgeVariant]="item.badgeVariant || 'default'"
            ></app-nav-item>
          }
        }

      </nav>

      <!-- Bottom: User Profile -->
      <app-user-profile 
        [name]="auth.user()?.firstName || 'Administrador'" 
        [plan]="'Pro Plan'"
      ></app-user-profile>

    </aside>
  `,
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  layout = inject(LayoutService);
  auth = inject(AuthService);
  navigation = inject(NavigationService);
}
