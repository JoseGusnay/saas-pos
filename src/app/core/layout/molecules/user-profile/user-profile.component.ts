import { Component, input, inject } from '@angular/core';
import { LayoutService } from '../../services/layout.service';
import { IconComponent } from '../../atoms/icon/icon.component';

@Component({
    selector: 'app-user-profile',
    standalone: true,
    imports: [IconComponent],
    template: `
    <button class="user-profile" [class.user-profile--collapsed]="layout.isSidebarCollapsed()">
      <div class="user-profile__content">
        <img 
          [src]="avatarUrl()" 
          alt="Avatar de {{ name() }}" 
          class="user-profile__avatar"
        />
        
        <!-- Ocultamos los datos cuando el sidebar se hace pequeño (64px) -->
        @if (!layout.isSidebarCollapsed()) {
          <div class="user-profile__details">
            <span class="user-profile__name">{{ name() }}</span>
            <span class="user-profile__plan">{{ plan() }}</span>
          </div>
        }
      </div>
      
      <!-- Ocultamos las acciones del usuario (Tema y Ajustes) -->
      @if (!layout.isSidebarCollapsed()) {
        <div class="user-profile__actions">
          
          <!-- Botón de Alternar Modo Oscuro -->
          <button class="user-profile__action-btn" (click)="layout.toggleTheme(); $event.stopPropagation()">
            <!-- Mostramos Sol o Luna dinámicamente para dar feedback -->
            <app-icon [name]="layout.theme() === 'dark' ? 'lucideSun' : 'lucideMoon'"></app-icon>
          </button>

          <!-- Ajustes -->
          <button class="user-profile__action-btn">
            <app-icon name="lucideSettings"></app-icon>
          </button>
          
        </div>
      }
    </button>
  `,
    styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent {
    layout = inject(LayoutService);

    name = input.required<string>();
    plan = input.required<string>();

    protected avatarUrl = () => `https://ui-avatars.com/api/?name=${this.name()}&background=F5F5F5&color=171717`;
}
