import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantUser } from '../../services/users.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideUser, 
  lucideMail, 
  lucideShield, 
  lucideMapPin, 
  lucideCalendar,
  lucideCheckCircle2,
  lucideXCircle,
  lucideClock
} from '@ng-icons/lucide';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ 
      lucideUser, 
      lucideMail, 
      lucideShield, 
      lucideMapPin, 
      lucideCalendar,
      lucideCheckCircle2,
      lucideXCircle,
      lucideClock
    })
  ],
  template: `
    <div class="user-detail">
      @if (user) {
        <!-- Header Info -->
        <div class="detail-section header">
          <div class="header-main">
            <div class="avatar-box">
              {{ (user.firstName ? user.firstName[0] : user.email[0]).toUpperCase() }}
            </div>
            <div class="header-text">
              <h2 class="user-name">{{ user.fullName || 'Usuario sin nombre' }}</h2>
              <p class="user-email">
                <ng-icon name="lucideMail"></ng-icon>
                {{ user.email }}
              </p>
            </div>
            <span class="status-badge" [ngClass]="user.isActive ? 'active' : 'inactive'">
              <ng-icon [name]="user.isActive ? 'lucideCheckCircle2' : 'lucideXCircle'"></ng-icon>
              {{ user.isActive ? 'Activa' : 'Inactiva' }}
            </span>
          </div>
        </div>

        <!-- KPIs Quick Stats -->
        <div class="detail-grid">
          <div class="kpi-card">
            <div class="kpi-icon shield">
              <ng-icon name="lucideShield"></ng-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">Roles Asignados</span>
              <span class="kpi-value">{{ user.roles.length || 0 }} Roles</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon location">
              <ng-icon name="lucideMapPin"></ng-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">Sucursales</span>
              <span class="kpi-value">{{ user.branches.length || 0 }} Sedes</span>
            </div>
          </div>
        </div>

        <!-- Assignments Section -->
        <div class="detail-section info">
          <h3 class="section-title">Roles y Permisos</h3>
          <div class="tags-list">
            @for (role of user.roles; track role.id) {
              <div class="tag-chip role">
                <ng-icon name="lucideShield"></ng-icon>
                {{ role.name }}
              </div>
            }
            @if (user.roles.length === 0) {
              <p class="empty-hint">Sin roles asignados.</p>
            }
          </div>
        </div>

        <div class="detail-section info">
          <h3 class="section-title">Sucursales de Acceso</h3>
          <div class="tags-list">
            @for (branch of user.branches; track branch.id) {
              <div class="tag-chip branch">
                <ng-icon name="lucideMapPin"></ng-icon>
                {{ branch.name }}
              </div>
            }
            @if (user.branches.length === 0) {
              <p class="empty-hint">Sin sucursales asignadas.</p>
            }
          </div>
        </div>

        <!-- Metadata -->
        <div class="detail-section meta">
          <h3 class="section-title">Datos de Cuenta</h3>
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Miembro desde</span>
              <span class="meta-text">
                <ng-icon name="lucideCalendar"></ng-icon>
                {{ user.createdAt | date:'longDate' }}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Última Conexión</span>
              <span class="meta-text">
                <ng-icon name="lucideClock"></ng-icon>
                {{ user.updatedAt | date:'short' }}
              </span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .user-detail {
      padding: 8px 4px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .detail-section {
      display: flex;
      flex-direction: column;
      gap: 16px;

      &.header {
        .header-main {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .avatar-box {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: var(--color-primary-subtle);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 800;
          border: 1px solid var(--color-border-subtle);
        }
        .header-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .user-name {
          font-size: 22px;
          font-weight: 800;
          color: var(--color-text-main);
          margin: 0;
          letter-spacing: -0.02em;
        }
        .user-email {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: var(--color-text-muted);
          margin: 0;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          
          &.active {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
          }
          &.inactive {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
          }
        }
      }
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-text-main);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--color-border-subtle);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .kpi-card {
      background: var(--color-bg-hover);
      border: 1px solid var(--color-border-subtle);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;

      .kpi-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;

        &.shield { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        &.location { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
      }

      .kpi-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        .kpi-label { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
        .kpi-value { font-size: 14px; font-weight: 700; color: var(--color-text-main); }
      }
    }

    .tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .tag-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid var(--color-border-subtle);
      background: var(--color-bg-surface);
      
      &.role { color: #3b82f6; border-color: rgba(59, 130, 246, 0.2); }
      &.branch { color: #8b5cf6; border-color: rgba(139, 92, 246, 0.2); }
      
      ng-icon { font-size: 14px; }
    }

    .empty-hint { font-size: 13px; color: var(--color-text-muted); font-style: italic; }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      .meta-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
        .meta-label { font-size: 11px; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; }
        .meta-text { 
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px; 
          color: var(--color-text-soft); 
          font-weight: 500;
          ng-icon { color: var(--color-text-muted); }
        }
      }
    }
  `]
})
export class UserDetailComponent {
  @Input() user!: TenantUser;
}
