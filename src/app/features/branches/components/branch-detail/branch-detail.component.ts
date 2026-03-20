import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Branch } from '../../../../core/models/branch.models';
import { PuntoEmision, TIPO_COMPROBANTE_LABELS } from '../../../../core/models/fiscal.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideMapPin,
  lucidePhone,
  lucideUser,
  lucideBuilding2,
  lucideHash,
} from '@ng-icons/lucide';

@Component({
  selector: 'app-branch-detail',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideMapPin,
      lucidePhone,
      lucideUser,
      lucideBuilding2,
      lucideHash,
    })
  ],
  template: `
    <div class="branch-detail">
      @if (branch) {
        <!-- Header -->
        <div class="detail-section header">
          <div class="header-main">
            <h2 class="branch-name">{{ branch.name }}</h2>
            <div class="header-badges">
              @if (branch.isMain) {
                <span class="status-badge main">Principal</span>
              }
              <span class="status-badge" [ngClass]="branch.isActive ? 'active' : 'inactive'">
                {{ branch.isActive ? 'Activa' : 'Inactiva' }}
              </span>
            </div>
          </div>
          @if (branch.codigoEstablecimiento) {
            <p class="branch-code">Establecimiento SRI: <strong>{{ branch.codigoEstablecimiento }}</strong></p>
          }
        </div>

        <!-- KPI: Manager -->
        <div class="kpi-card">
          <div class="kpi-icon manager">
            <ng-icon name="lucideUser"></ng-icon>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Gerente / Encargado</span>
            <span class="kpi-value">{{ branch.manager || 'No asignado' }}</span>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="detail-section">
          <h3 class="section-title">Contacto</h3>
          <div class="info-list">
            @if (branch.address) {
              <div class="info-item">
                <div class="icon-box">
                  <ng-icon name="lucideMapPin"></ng-icon>
                </div>
                <div class="item-content">
                  <span class="item-label">Dirección</span>
                  <span class="item-text">{{ branch.address }}</span>
                </div>
              </div>
            }
            @if (branch.city) {
              <div class="info-item">
                <div class="icon-box">
                  <ng-icon name="lucideBuilding2"></ng-icon>
                </div>
                <div class="item-content">
                  <span class="item-label">Ciudad</span>
                  <span class="item-text">{{ branch.city }}</span>
                </div>
              </div>
            }
            @if (branch.phone) {
              <div class="info-item">
                <div class="icon-box">
                  <ng-icon name="lucidePhone"></ng-icon>
                </div>
                <div class="item-content">
                  <span class="item-label">Teléfono</span>
                  <a [href]="'tel:' + branch.phone" class="item-link">{{ branch.phone }}</a>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- SRI Section -->
        @if (branch.codigoEstablecimiento || branch.nombreComercialSucursal || branch.dirEstablecimiento) {
          <div class="detail-section">
            <h3 class="section-title">Datos SRI Ecuador</h3>
            <div class="sri-grid">
              @if (branch.codigoEstablecimiento) {
                <div class="sri-item">
                  <span class="sri-label">Código Establecimiento</span>
                  <span class="sri-value code">{{ branch.codigoEstablecimiento }}</span>
                </div>
              }
              @if (branch.nombreComercialSucursal) {
                <div class="sri-item">
                  <span class="sri-label">Nombre Comercial</span>
                  <span class="sri-value">{{ branch.nombreComercialSucursal }}</span>
                </div>
              }
              @if (branch.dirEstablecimiento) {
                <div class="sri-item full">
                  <span class="sri-label">Dirección para Comprobantes</span>
                  <span class="sri-value">{{ branch.dirEstablecimiento }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Puntos de Emisión -->
        <div class="detail-section">
          <h3 class="section-title">Puntos de Emisión</h3>

          @if (!branch.puntosEmision) {
            <p class="empty-hint">Cargando...</p>
          } @else if (branch.puntosEmision.length === 0) {
            <p class="empty-hint">No hay puntos de emisión configurados para esta sucursal.</p>
          } @else {
            <div class="puntos-list">
              @for (punto of branch.puntosEmision; track punto.id) {
                <div class="punto-card">
                  <div class="punto-header">
                    <div class="punto-code">
                      <ng-icon name="lucideHash"></ng-icon>
                      <strong>Punto {{ punto.codigoPuntoEmision }}</strong>
                    </div>
                    <div class="punto-meta">
                      @if (punto.descripcion) {
                        <span class="punto-desc">{{ punto.descripcion }}</span>
                      }
                      <span class="status-pill" [class.on]="punto.isActive">
                        {{ punto.isActive ? 'Activo' : 'Inactivo' }}
                      </span>
                    </div>
                  </div>
                  @if (punto.secuenciales?.length) {
                    <div class="secuenciales">
                      @for (sec of punto.secuenciales!; track sec.id) {
                        <div class="sec-row">
                          <span class="sec-tipo">{{ tipoLabel(sec.tipoComprobante) }}</span>
                          <span class="sec-num">{{ formatSecuencial(sec.ultimoNumero) }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- System Info -->
        <div class="detail-section meta">
          <h3 class="section-title">Datos del Sistema</h3>
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Fecha de Apertura</span>
              <span class="meta-text">{{ branch.createdAt | date:'longDate' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Última Actualización</span>
              <span class="meta-text">{{ branch.updatedAt | date:'longDate' }}</span>
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
      gap: 28px;
    }

    .detail-section {
      display: flex;
      flex-direction: column;
      gap: 16px;

      &.header {
        gap: 8px;
      }
      &.meta {
        gap: 12px;
      }
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

    .branch-name {
      font-size: 22px;
      font-weight: 800;
      color: var(--color-text-main);
      margin: 0;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .branch-code {
      font-size: 13px;
      color: var(--color-text-muted);
      margin: 0;
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

        &.manager { background: rgba(59,130,246,0.1); color: #3b82f6; }
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
        .item-link {
          font-size: 13px; font-weight: 500; color: var(--color-primary);
          text-decoration: none;
          &:hover { text-decoration: underline; }
        }
      }
    }

    .sri-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;

      .sri-item {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 10px 12px;
        background: var(--color-bg-hover);
        border-radius: 10px;
        border: 1px solid var(--color-border-subtle);

        &.full { grid-column: 1 / -1; }
      }

      .sri-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-muted);
      }

      .sri-value {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-main);

        &.code {
          font-family: monospace;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--color-accent-primary);
        }
      }
    }

    .empty-hint {
      font-size: 13px;
      color: var(--color-text-muted);
      margin: 0;
      padding: 16px 0;
      text-align: center;
    }

    .puntos-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .punto-card {
      border: 1px solid var(--color-border-subtle);
      border-radius: 12px;
      overflow: hidden;
    }

    .punto-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      background: var(--color-bg-hover);

      .punto-code {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        color: var(--color-text-main);
        ng-icon { color: var(--color-text-muted); font-size: 15px; }
      }

      .punto-meta {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .punto-desc {
        font-size: 12px;
        color: var(--color-text-muted);
      }

      .status-pill {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(239,68,68,0.1);
        color: #ef4444;

        &.on { background: rgba(16,185,129,0.1); color: #10b981; }
      }
    }

    .secuenciales {
      padding: 8px 14px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .sec-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid var(--color-border-subtle);
      font-size: 12px;

      &:last-child { border-bottom: none; }

      .sec-tipo { color: var(--color-text-soft); font-weight: 500; }
      .sec-num  { font-family: monospace; color: var(--color-text-muted); letter-spacing: 0.05em; }
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
export class BranchDetailComponent {
  @Input() branch?: Branch;

  readonly tipoLabels = TIPO_COMPROBANTE_LABELS;

  tipoLabel(code: string): string {
    return (this.tipoLabels as Record<string, string>)[code] ?? code;
  }

  formatSecuencial(num: number): string {
    return String(num).padStart(9, '0');
  }
}
