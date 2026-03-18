import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Role } from '../../services/roles.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideShield, 
  lucideCheckCircle2, 
  lucideXCircle, 
  lucideCalendar, 
  lucideHash,
  lucideKey
} from '@ng-icons/lucide';

@Component({
  selector: 'app-role-detail',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ 
      lucideShield, 
      lucideCheckCircle2, 
      lucideXCircle, 
      lucideCalendar, 
      lucideHash,
      lucideKey
    })
  ],
  template: `
    <div class="role-detail">
      @if (role) {
        <!-- Header Info -->
        <div class="detail-section header">
          <div class="header-main">
            <h2 class="role-name">{{ role.name }}</h2>
            <span class="status-badge" [ngClass]="role.name === 'SUPER_ADMIN' ? 'system' : 'custom'">
              <ng-icon [name]="role.name === 'SUPER_ADMIN' ? 'lucideShield' : 'lucideCheckCircle2'"></ng-icon>
              {{ role.name === 'SUPER_ADMIN' ? 'Rol de Sistema' : 'Rol Personalizado' }}
            </span>
          </div>
          <p class="role-code">ID del Rol: #{{ role.id.split('-')[0].toUpperCase() }}</p>
        </div>

        <!-- KPIs Quick Stats -->
        <div class="detail-grid">
          <div class="kpi-card">
            <div class="kpi-icon shield">
              <ng-icon name="lucideShield"></ng-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">Nombre del Rol</span>
              <span class="kpi-value">{{ role.name }}</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon permissions">
              <ng-icon name="lucideKey"></ng-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">Permisos</span>
              <span class="kpi-value">
                {{ role.permissions?.length || 0 }} asignados
              </span>
            </div>
          </div>
        </div>

        <!-- Permissions Section -->
        <div class="detail-section info">
          <h3 class="section-title">Permisos del Sistema</h3>
          <div class="permissions-list">
            @for (perm of role.permissions; track perm.id) {
              <div class="permission-tag">
                <span class="dot"></span>
                {{ perm.name }}
              </div>
            }
            @if (!role.permissions || role.permissions.length === 0) {
              <p class="empty-hint">Este rol no tiene permisos asignados.</p>
            }
          </div>
        </div>

        <!-- Audit Metadata -->
        <div class="detail-section meta">
          <h3 class="section-title">Información de Auditoría</h3>
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">ID Completo</span>
              <code class="uuid-text">{{ role.id }}</code>
            </div>
            <div class="meta-item">
              <span class="meta-label">Fecha Registro</span>
              <span class="meta-text">{{ role.createdAt | date:'longDate' }}</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .role-detail {
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
        gap: 8px;
        .header-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .role-name {
          font-size: 24px;
          font-weight: 800;
          color: var(--color-text-main);
          margin: 0;
          letter-spacing: -0.02em;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          
          &.system {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
          }
          &.custom {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
          }
        }
        .role-code {
          font-size: 13px;
          color: var(--color-text-muted);
          margin: 0;
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
      transition: var(--transition-base);

      &:hover {
        border-color: var(--color-primary-subtle);
        background: var(--color-bg-surface);
        box-shadow: var(--shadow-sm);
      }

      .kpi-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;

        &.shield {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }
        &.permissions {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }
      }

      .kpi-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        .kpi-label {
          font-size: 11px;
          color: var(--color-text-muted);
          font-weight: 600;
        }
        .kpi-value {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-main);
        }
      }
    }

    .permissions-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .permission-tag {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: var(--color-bg-hover);
      border: 1px solid var(--color-border-subtle);
      border-radius: 8px;
      font-size: 13px;
      color: var(--color-text-soft);
      font-weight: 500;

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--color-primary);
      }
    }

    .empty-hint {
      font-size: 13px;
      color: var(--color-text-muted);
      font-style: italic;
    }

    .meta-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
      .meta-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
        .meta-label {
          font-size: 11px;
          color: var(--color-text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }
        .meta-text {
          font-size: 13px;
          color: var(--color-text-soft);
          font-weight: 500;
        }
        .uuid-text {
          font-size: 12px;
          color: var(--color-text-soft);
          background: var(--color-bg-hover);
          padding: 4px 8px;
          border-radius: 6px;
          font-family: var(--font-mono, monospace);
        }
      }
    }
  `]
})
export class RoleDetailComponent {
  @Input() role!: Role;
}
