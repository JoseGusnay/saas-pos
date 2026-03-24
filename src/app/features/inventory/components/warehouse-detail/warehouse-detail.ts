import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Warehouse } from '../../../../core/models/warehouse.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideWarehouse,
  lucideGrid3x3,
  lucideInfo,
} from '@ng-icons/lucide';

@Component({
  selector: 'app-warehouse-detail',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideWarehouse,
      lucideGrid3x3,
      lucideInfo,
    })
  ],
  template: `
    <div class="wh-detail">
      @if (warehouse) {
        <!-- Header -->
        <div class="detail-section header">
          <div class="header-main">
            <h2 class="wh-name">{{ warehouse.name }}</h2>
            <div class="header-badges">
              @if (warehouse.isDefault) {
                <span class="status-badge main">Principal</span>
              }
              <span class="status-badge" [ngClass]="warehouse.isActive ? 'active' : 'inactive'">
                {{ warehouse.isActive ? 'Activa' : 'Inactiva' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Descripcion -->
        <div class="kpi-card">
          <div class="kpi-icon desc">
            <ng-icon name="lucideInfo"></ng-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Descripcion</span>
            <span class="kpi-value">{{ warehouse.description || 'Sin descripcion' }}</span>
          </div>
        </div>

        <!-- Configuracion -->
        <div class="detail-section">
          <h3 class="section-title">Configuracion</h3>
          <div class="info-list">
            <div class="info-item">
              <div class="icon-box">
                <ng-icon name="lucideWarehouse"></ng-icon>
              </div>
              <div class="item-content">
                <span class="item-label">Tipo</span>
                <span class="item-text">{{ warehouse.isDefault ? 'Bodega principal' : 'Bodega secundaria' }}</span>
              </div>
            </div>
            <div class="info-item">
              <div class="icon-box">
                <ng-icon name="lucideGrid3x3"></ng-icon>
              </div>
              <div class="item-content">
                <span class="item-label">Ubicaciones</span>
                <span class="item-text">{{ warehouse.hasLocations ? 'Habilitadas' : 'No habilitadas' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Datos del Sistema -->
        <div class="detail-section meta">
          <h3 class="section-title">Datos del Sistema</h3>
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Fecha de Creacion</span>
              <span class="meta-text">{{ warehouse.createdAt | date:'longDate' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Ultima Actualizacion</span>
              <span class="meta-text">{{ warehouse.updatedAt | date:'longDate' }}</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .wh-detail {
      padding: 8px 4px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .detail-section {
      display: flex;
      flex-direction: column;
      gap: 16px;

      &.header { gap: 8px; }
      &.meta { gap: 12px; }
    }

    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .header-badges {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }

    .wh-name {
      font-size: 22px;
      font-weight: 800;
      color: var(--color-text-main);
      margin: 0;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .status-badge {
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      white-space: nowrap;

      &.active  { background: rgba(16,185,129,0.1); color: #10b981; }
      &.inactive { background: rgba(239,68,68,0.1); color: #ef4444; }
      &.main    { background: rgba(139,92,246,0.1); color: #8b5cf6; }
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--color-border-subtle);
      flex: 1;
    }

    .kpi-card {
      background: var(--color-bg-hover);
      border: 1px solid var(--color-border-subtle);
      border-radius: 14px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 14px;

      .kpi-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        flex-shrink: 0;

        &.desc { background: rgba(59,130,246,0.1); color: #3b82f6; }
      }

      .kpi-info {
        display: flex;
        flex-direction: column;
        gap: 1px;
        .kpi-label { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
        .kpi-value { font-size: 14px; font-weight: 700; color: var(--color-text-main); }
      }
    }

    .info-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;

      .icon-box {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        background: var(--color-bg-hover);
        color: var(--color-text-soft);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        border: 1px solid var(--color-border-subtle);
        flex-shrink: 0;
      }

      .item-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        .item-label { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
        .item-text { font-size: 13px; color: var(--color-text-main); font-weight: 500; line-height: 1.4; }
      }
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;

      .meta-item {
        display: flex;
        flex-direction: column;
        gap: 3px;
        .meta-label { font-size: 11px; color: var(--color-text-muted); }
        .meta-text  { font-size: 13px; color: var(--color-text-soft); font-weight: 500; }
      }
    }
  `]
})
export class WarehouseDetailComponent {
  @Input() warehouse?: Warehouse;
}
