import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '../../../../core/models/category.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideType, 
  lucideLayers, 
  lucideInfo,
  lucideCheckCircle2,
  lucideXCircle,
  lucideCalendar
} from '@ng-icons/lucide';

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ 
      lucideType, 
      lucideLayers, 
      lucideInfo,
      lucideCheckCircle2,
      lucideXCircle,
      lucideCalendar
    })
  ],
  template: `
    <div class="category-detail">
      @if (category) {
        <!-- Header Info -->
        <div class="detail-section header">
          <div class="header-main">
            <h2 class="category-name">{{ category.name }}</h2>
            <span class="status-badge" [ngClass]="category.status === 'ACTIVE' ? 'active' : 'inactive'">
              <ng-icon [name]="category.status === 'ACTIVE' ? 'lucideCheckCircle2' : 'lucideXCircle'"></ng-icon>
              {{ category.status === 'ACTIVE' ? 'Activa' : 'Inactiva' }}
            </span>
          </div>
          <p class="category-code">ID: #{{ category.id.split('-')[0].toUpperCase() }}</p>
        </div>

        <!-- KPIs Quick Stats -->
        <div class="detail-grid">
          <div class="kpi-card">
            <div class="kpi-icon type">
              <ng-icon name="lucideType"></ng-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">Nombre</span>
              <span class="kpi-value">{{ category.name }}</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon hierarchy">
              <ng-icon name="lucideLayers"></ng-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">Nivel</span>
              <span class="kpi-value">
                {{ category.parent?.name ? 'Subcategoría' : 'Categoría Raíz' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Description Section -->
        <div class="detail-section info">
          <h3 class="section-title">Descripción y Detalles</h3>
          <div class="info-list">
            <div class="info-item">
              <div class="icon-box">
                <ng-icon name="lucideInfo"></ng-icon>
              </div>
              <div class="item-content">
                <span class="item-label">Resumen</span>
                <p class="item-text description">{{ category.description || 'Sin descripción detallada' }}</p>
              </div>
            </div>
            @if (category.parent) {
              <div class="info-item">
                <div class="icon-box">
                  <ng-icon name="lucideLayers"></ng-icon>
                </div>
                <div class="item-content">
                  <span class="item-label">Categoría Padre</span>
                  <span class="item-text">{{ category.parent.name }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Metadata -->
        <div class="detail-section meta">
          <h3 class="section-title">Auditoría</h3>
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Última Actualización</span>
              <span class="meta-text">{{ category.updatedAt | date:'longDate' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Fecha Creación</span>
              <span class="meta-text">{{ category.createdAt | date:'longDate' }}</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .category-detail {
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
        .category-name {
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
        .category-code {
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

        &.type {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }
        &.hierarchy {
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
          line-height: 1.5;
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
export class CategoryDetailComponent {
  @Input({ required: true }) category!: Category;
}
