import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideType, lucideHash, lucideCheckCircle2, lucideXCircle, lucideCalendar, lucideShield
} from '@ng-icons/lucide';
import { AttributeType, DATA_TYPE_LABELS } from '../../models/product.model';

@Component({
  selector: 'app-attribute-type-detail',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ lucideType, lucideHash, lucideCheckCircle2, lucideXCircle, lucideCalendar, lucideShield })
  ],
  template: `
    <div class="detail">
      @if (attr) {
        <!-- Header -->
        <div class="detail-section header">
          <div class="header-main">
            <h2 class="detail-name">{{ attr.name }}</h2>
            <span class="status-badge" [class.active]="attr.isActive" [class.inactive]="!attr.isActive">
              <ng-icon [name]="attr.isActive ? 'lucideCheckCircle2' : 'lucideXCircle'"></ng-icon>
              {{ attr.isActive ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          <p class="detail-code">ID: #{{ attr.id.split('-')[0].toUpperCase() }}</p>
        </div>

        <!-- KPIs -->
        <div class="detail-grid">
          <div class="kpi-card">
            <div class="kpi-icon type"><ng-icon name="lucideType"></ng-icon></div>
            <div class="kpi-info">
              <span class="kpi-label">Tipo de Dato</span>
              <span class="kpi-value">{{ dataTypeLabel(attr.dataType) }}</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon unit"><ng-icon name="lucideHash"></ng-icon></div>
            <div class="kpi-info">
              <span class="kpi-label">Unidad</span>
              <span class="kpi-value">{{ attr.unit || 'Sin unidad' }}</span>
            </div>
          </div>
        </div>

        @if (attr.isSystem) {
          <div class="system-notice">
            <ng-icon name="lucideShield"></ng-icon>
            <span>Atributo del sistema — no se puede editar ni eliminar.</span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .detail { display: flex; flex-direction: column; gap: 1.5rem; }

    .detail-section.header { display: flex; flex-direction: column; gap: 4px; }
    .header-main { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .detail-name { margin: 0; font-size: 1.5rem; font-weight: var(--font-weight-bold); color: var(--color-text-main); }
    .detail-code { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); font-family: 'SFMono-Regular', Consolas, monospace; }

    .status-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 999px;
      font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold);
      ng-icon { font-size: 12px; }
      &.active { background: var(--color-success-bg); color: var(--color-success-text); }
      &.inactive { background: var(--color-border-subtle); color: var(--color-text-muted); }
    }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .kpi-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px; border-radius: var(--radius-lg);
      background: var(--color-bg-canvas);
      border: 1px solid var(--color-border-light);
    }

    .kpi-icon {
      width: 40px; height: 40px; border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.125rem;
      &.type { background: rgba(79, 70, 229, 0.08); color: var(--color-accent-primary); }
      &.unit { background: rgba(16, 185, 129, 0.08); color: var(--color-success-text, #10b981); }
    }

    .kpi-info { display: flex; flex-direction: column; gap: 2px; }
    .kpi-label { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .kpi-value { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-main); }

    .system-notice {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: var(--radius-md);
      background: rgba(79, 70, 229, 0.05);
      border: 1px solid rgba(79, 70, 229, 0.15);
      font-size: var(--font-size-xs); color: var(--color-accent-primary);
      ng-icon { font-size: 14px; flex-shrink: 0; }
    }
  `]
})
export class AttributeTypeDetailComponent {
  @Input({ required: true }) attr!: AttributeType;

  dataTypeLabel(dt: string): string { return DATA_TYPE_LABELS[dt as keyof typeof DATA_TYPE_LABELS] ?? dt; }
}
