import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Branch } from '../../../../core/models/branch.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideMapPin, 
  lucidePhone, 
  lucideMail, 
  lucideUser, 
  lucideDollarSign, 
  lucideHistory,
  lucidePencil,
  lucideExternalLink
} from '@ng-icons/lucide';

@Component({
  selector: 'app-branch-detail',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ 
      lucideMapPin, 
      lucidePhone, 
      lucideMail, 
      lucideUser, 
      lucideDollarSign, 
      lucideHistory,
      lucidePencil,
      lucideExternalLink
    })
  ],
  template: `
    <div class="branch-detail">
      @if (branch) {
        <!-- Header Info -->
        <div class="detail-section header">
          <div class="header-main">
            <h2 class="branch-name">{{ branch.name }}</h2>
            <span class="status-badge" [ngClass]="branch.isActive ? 'active' : 'inactive'">
              {{ branch.isActive ? 'Activa' : 'Inactiva' }}
            </span>
          </div>
          <p class="branch-code">Código: #{{ branch.id.split('-')[0].toUpperCase() }}</p>
        </div>

        <!-- KPIs Quick Stats -->
        <div class="detail-grid">
          <div class="kpi-card">
            <div class="kpi-icon money">
              <ng-icon name="lucideDollarSign"></ng-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">Ingresos Mensuales</span>
              <span class="kpi-value">{{ branch.revenue | currency:'USD':'symbol':'1.0-2' }}</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon manager">
              <ng-icon name="lucideUser"></ng-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">Gerente</span>
              <span class="kpi-value">{{ branch.manager || 'No asignado' }}</span>
            </div>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="detail-section info">
          <h3 class="section-title">Información de Contacto</h3>
          
          <div class="info-list">
            <div class="info-item">
              <div class="icon-box">
                <ng-icon name="lucideMapPin"></ng-icon>
              </div>
              <div class="item-content">
                <span class="item-label">Dirección</span>
                <span class="item-text">{{ branch.address }}</span>
              </div>
            </div>

            <div class="info-item">
              <div class="icon-box">
                <ng-icon name="lucidePhone"></ng-icon>
              </div>
              <div class="item-content">
                <span class="item-label">Teléfono</span>
                <a [href]="'tel:' + branch.phone" class="item-link">{{ branch.phone }}</a>
              </div>
            </div>

            <div class="info-item">
              <div class="icon-box">
                <ng-icon name="lucideMail"></ng-icon>
              </div>
              <div class="item-content">
                <span class="item-label">Correo Electrónico</span>
                <span class="item-text">{{ branch.name.toLowerCase().replace(' ', '.') }}@midominio.com</span>
              </div>
            </div>
          </div>
        </div>

        <!-- System Info -->
        <div class="detail-section meta">
          <h3 class="section-title">Datos del Sistema</h3>
          <div class="meta-grid">
             <div class="meta-item">
                <span class="meta-label">Última Actualización</span>
                <span class="meta-text">{{ branch.updatedAt | date:'longDate' }}</span>
             </div>
             <div class="meta-item">
                <span class="meta-label">Fecha de Apertura</span>
                <span class="meta-text">{{ branch.createdAt | date:'longDate' }}</span>
             </div>
          </div>
        </div>

      }
    </div>
  `,
  styles: [`
    .branch-detail {
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
        .branch-name {
          font-size: 24px;
          font-weight: 800;
          color: var(--color-text-main);
          margin: 0;
          letter-spacing: -0.02em;
        }
        .status-badge {
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          
          &.active {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
          }
          &.inactive {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
          }
        }
        .branch-code {
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

        &.money {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        &.manager {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
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
          font-size: 15px;
          font-weight: 700;
          color: var(--color-text-main);
        }
      }
    }

    .info-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .info-item {
      display: flex;
      gap: 16px;
      align-items: flex-start;

      .icon-box {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: var(--color-bg-hover);
        color: var(--color-text-soft);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 1px solid var(--color-border-subtle);
      }

      .item-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        .item-label {
          font-size: 11px;
          color: var(--color-text-muted);
          font-weight: 600;
        }
        .item-text, .item-link {
          font-size: 14px;
          color: var(--color-text-main);
          font-weight: 500;
          line-height: 1.4;
        }
        .item-link {
          color: var(--color-primary);
          text-decoration: none;
          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      .meta-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        .meta-label {
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .meta-text {
          font-size: 13px;
          color: var(--color-text-soft);
          font-weight: 500;
        }
      }
    }
  `]
})
export class BranchDetailComponent {
  @Input() branch?: Branch;
}
