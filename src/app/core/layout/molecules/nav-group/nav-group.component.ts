import { Component, input, signal, inject } from '@angular/core';
import { NavItemComponent } from '../nav-item/nav-item.component';
import { LayoutService } from '../../services/layout.service';

export interface NavChild {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-nav-group',
  standalone: true,
  imports: [NavItemComponent],
  template: `
    <div class="nav-group">
      
      <!-- Trigger (El botón que expande/contrae) -->
      <app-nav-item 
        [label]="label()" 
        [icon]="icon()"
        [isExpanded]="isExpanded()"
        [isActive]="hasActiveChild()"
        (onClick)="toggleGroup()"
      ></app-nav-item>

      <!-- Children (Submenú animable) -->
      <!-- Usamos CSS Grid transition para cierre y apertura fluidos -->
      <div 
        class="nav-group__grid-transition"
        [class.nav-group__grid-transition--expanded]="isExpanded() && !layout.isSidebarCollapsed()"
      >
        <div class="nav-group__children">
          @for (child of children(); track child.route) {
            <app-nav-item
              [label]="child.label"
              [icon]="child.icon"
              [route]="child.route"
              [exactMatch]="true"
            ></app-nav-item>
          }
        </div>
      </div>

    </div>
  `,
  styleUrl: './nav-group.component.scss'
})
export class NavGroupComponent {

  layout = inject(LayoutService);

  // Inputs para el Parent Item
  label = input.required<string>();
  icon = input.required<string>();

  // Lista de sub-items
  children = input.required<NavChild[]>();

  // Estado local (usando signal en vez de boolean tradicional)
  isExpanded = signal<boolean>(false);
  hasActiveChild = signal<boolean>(false);

  toggleGroup() {
    // Regla Vercel: Al estar colapsado el sidebar, si tocan un grupo, lo expandimos todo
    if (this.layout.isSidebarCollapsed()) {
      this.layout.toggleSidebar();
      this.isExpanded.set(true);
      return;
    }
    this.isExpanded.update(current => !current);
  }
}
