import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tax } from '../../../../core/models/tax.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTag,
  lucidePercent,
  lucideHash,
  lucideCalendar,
  lucideCheckCircle2,
  lucideXCircle
} from '@ng-icons/lucide';

@Component({
  selector: 'app-tax-detail',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideTag,
      lucidePercent,
      lucideHash,
      lucideCalendar,
      lucideCheckCircle2,
      lucideXCircle
    })
  ],
  template: `
    <div class="tax-detail">
      @if (tax) {
        <div class="detail-section header">
          <div class="header-main">
            <h2 class="tax-name">{{ tax.name }}</h2>
            <span class="status-badge" [ngClass]="tax.isActive ? 'active' : 'inactive'">
              <ng-icon [name]="tax.isActive ? 'lucideCheckCircle2' : 'lucideXCircle'"></ng-icon>
              {{ tax.isActive ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          <p class="tax-code">
            Código: {{ tax.code }}
            @if (tax.sriCode) { · SRI: {{ tax.sriCode }} }
          </p>
        </div>

        <div class="detail-grid">
          <div class="kpi-card">
            <div class="kpi-icon type">
              <ng-icon name="lucideTag"></ng-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">Tipo</span>
              <span class="kpi-value">{{ tax.type === 'PERCENTAGE' ? 'Porcentual' : 'Monto Fijo' }}</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon rate">
              <ng-icon name="lucidePercent"></ng-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">Tarifa</span>
              <span class="kpi-value">
                {{ tax.type === 'PERCENTAGE' ? (tax.percentage ?? 0) + '%' : '$' + tax.fixedAmount }}
              </span>
            </div>
          </div>
        </div>

        @if (tax.sriCode) {
          <div class="detail-section info">
            <h3 class="section-title">Configuración Fiscal</h3>
            <div class="info-list">
              <div class="info-item">
                <div class="icon-box"><ng-icon name="lucideHash"></ng-icon></div>
                <div class="item-content">
                  <span class="item-label">Código SRI</span>
                  <span class="item-text">{{ tax.sriCode }}</span>
                </div>
              </div>
            </div>
          </div>
        }

        <div class="detail-section info">
          <h3 class="section-title">Información de Auditoría</h3>
          <div class="info-list">
            <div class="info-item">
              <div class="icon-box"><ng-icon name="lucideHash"></ng-icon></div>
              <div class="item-content">
                <span class="item-label">Identificador Único (UUID)</span>
                <code class="uuid-text">{{ tax.id }}</code>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .tax-detail {
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
        .tax-name {
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
          &.active { background: rgba(16, 185, 129, 0.1); color: #10b981; }
          &.inactive { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        }
        .tax-code {
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
        width: 44px; height: 44px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px;
        &.type { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        &.rate { background: rgba(16, 185, 129, 0.1); color: #10b981; }
      }
      .kpi-info {
        display: flex; flex-direction: column; gap: 2px;
        .kpi-label { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
        .kpi-value { font-size: 14px; font-weight: 700; color: var(--color-text-main); }
      }
    }

    .info-list { display: flex; flex-direction: column; gap: 20px; }

    .info-item {
      display: flex; gap: 16px; align-items: flex-start;
      .icon-box {
        width: 36px; height: 36px; border-radius: 10px;
        background: var(--color-bg-hover); color: var(--color-text-soft);
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; border: 1px solid var(--color-border-subtle);
      }
      .item-content {
        display: flex; flex-direction: column; gap: 2px;
        .item-label { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
        .item-text { font-size: 14px; color: var(--color-text-main); font-weight: 500; }
        .uuid-text {
          font-size: 12px; color: var(--color-text-soft);
          background: var(--color-bg-hover); padding: 2px 6px;
          border-radius: 4px; word-break: break-all;
        }
      }
    }
  `]
})
export class TaxDetailComponent {
  @Input() tax?: Tax;
}
