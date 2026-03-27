import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Customer, CUSTOMER_ID_TYPES } from '../../../../core/models/customer.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUser,
  lucideIdCard,
  lucideMail,
  lucidePhone,
  lucideMapPin,
  lucideCalendar,
  lucideHash,
  lucideCheckCircle2,
  lucideXCircle
} from '@ng-icons/lucide';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideUser, lucideIdCard, lucideMail, lucidePhone,
      lucideMapPin, lucideCalendar, lucideHash,
      lucideCheckCircle2, lucideXCircle
    })
  ],
  template: `
    <div class="customer-detail">
      @if (customer) {
        <!-- Header Info -->
        <div class="detail-section header">
          <div class="header-main">
            <h2 class="customer-name">{{ customer.name }}</h2>
            <span class="status-badge" [ngClass]="customer.isActive ? 'active' : 'inactive'">
              <ng-icon [name]="customer.isActive ? 'lucideCheckCircle2' : 'lucideXCircle'"></ng-icon>
              {{ customer.isActive ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          <p class="customer-code">ID de Sistema: #{{ customer.id.split('-')[0].toUpperCase() }}</p>
        </div>

        <!-- KPIs Quick Stats -->
        <div class="detail-grid">
          <div class="kpi-card">
            <div class="kpi-icon id-card">
              <ng-icon name="lucideIdCard"></ng-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">{{ getIdTypeLabel(customer.tipoIdentificacion) }}</span>
              <span class="kpi-value">{{ customer.identificacion }}</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon user">
              <ng-icon name="lucideUser"></ng-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">Razón Social</span>
              <span class="kpi-value">{{ customer.name }}</span>
            </div>
          </div>
        </div>

        <!-- Contact Details -->
        <div class="detail-section info">
          <h3 class="section-title">Información de Contacto</h3>

          <div class="info-list">
            <div class="info-item">
              <div class="icon-box">
                <ng-icon name="lucideMail"></ng-icon>
              </div>
              <div class="item-content">
                <span class="item-label">Correo Electrónico</span>
                <span class="item-text">{{ customer.email || 'No registrado' }}</span>
              </div>
            </div>

            <div class="info-item">
              <div class="icon-box">
                <ng-icon name="lucidePhone"></ng-icon>
              </div>
              <div class="item-content">
                <span class="item-label">Teléfono</span>
                <span class="item-text">{{ customer.phone || 'No registrado' }}</span>
              </div>
            </div>

            <div class="info-item">
              <div class="icon-box">
                <ng-icon name="lucideMapPin"></ng-icon>
              </div>
              <div class="item-content">
                <span class="item-label">Dirección</span>
                <span class="item-text">{{ customer.address || 'No registrada' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- System Metadata -->
        <div class="detail-section info">
          <h3 class="section-title">Información de Auditoría</h3>

          <div class="info-list">
            <div class="info-item">
              <div class="icon-box">
                <ng-icon name="lucideCalendar"></ng-icon>
              </div>
              <div class="item-content">
                <span class="item-label">Fecha de Registro</span>
                <span class="item-text">{{ customer.createdAt | date:'longDate' }}</span>
              </div>
            </div>

            <div class="info-item">
              <div class="icon-box">
                <ng-icon name="lucideCalendar"></ng-icon>
              </div>
              <div class="item-content">
                <span class="item-label">Última Actualización</span>
                <span class="item-text">{{ customer.updatedAt | date:'longDate' }}</span>
              </div>
            </div>

            <div class="info-item">
              <div class="icon-box">
                <ng-icon name="lucideHash"></ng-icon>
              </div>
              <div class="item-content">
                <span class="item-label">Identificador Único (UUID)</span>
                <code class="uuid-text">{{ customer.id }}</code>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .customer-detail {
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
        .customer-name {
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

          &.active {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
          }
          &.inactive {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
          }
        }
        .customer-code {
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

      @media (max-width: 480px) {
        grid-template-columns: 1fr;
      }
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

        &.id-card {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }
        &.user {
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
        .item-text {
          font-size: 14px;
          color: var(--color-text-main);
          font-weight: 500;
        }
        .uuid-text {
          font-size: 12px;
          color: var(--color-text-soft);
          background: var(--color-bg-hover);
          padding: 2px 6px;
          border-radius: 4px;
          word-break: break-all;
        }
      }
    }
  `]
})
export class CustomerDetailComponent {
  @Input() customer?: Customer;

  getIdTypeLabel(tipo: string): string {
    return CUSTOMER_ID_TYPES.find(t => t.value === tipo)?.label || tipo;
  }
}
