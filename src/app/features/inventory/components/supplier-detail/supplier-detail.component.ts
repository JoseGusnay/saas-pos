import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Supplier } from '../../../../core/models/supplier.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUser, lucidePhone, lucideMail, lucideMapPin,
  lucideCalendar, lucideCheckCircle2, lucideXCircle
} from '@ng-icons/lucide';

@Component({
  selector: 'app-supplier-detail',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ lucideUser, lucidePhone, lucideMail, lucideMapPin, lucideCalendar, lucideCheckCircle2, lucideXCircle })
  ],
  template: `
    <div class="detail">
      @if (supplier) {
        <div class="detail-section header">
          <div class="header-main">
            <h2 class="supplier-name">{{ supplier.name }}</h2>
            <span class="status-badge" [ngClass]="supplier.isActive ? 'active' : 'inactive'">
              <ng-icon [name]="supplier.isActive ? 'lucideCheckCircle2' : 'lucideXCircle'"></ng-icon>
              {{ supplier.isActive ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          @if (supplier.ruc) {
            <p class="supplier-code">{{ idTypeLabel }}: {{ supplier.ruc }}</p>
          }
        </div>

        <div class="detail-grid">
          <div class="kpi-card">
            <div class="kpi-icon contact"><ng-icon name="lucideUser"></ng-icon></div>
            <div class="kpi-info">
              <span class="kpi-label">Persona de Contacto</span>
              <span class="kpi-value">{{ supplier.contactName || 'No asignado' }}</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon phone"><ng-icon name="lucidePhone"></ng-icon></div>
            <div class="kpi-info">
              <span class="kpi-label">Teléfono</span>
              <span class="kpi-value">{{ supplier.phone || 'No registrado' }}</span>
            </div>
          </div>
        </div>

        @if (supplier.email || supplier.address) {
          <div class="detail-section info">
            <h3 class="section-title">Información de Contacto</h3>
            <div class="info-list">
              @if (supplier.email) {
                <div class="info-item">
                  <div class="icon-box"><ng-icon name="lucideMail"></ng-icon></div>
                  <div class="item-content">
                    <span class="item-label">Correo Electrónico</span>
                    <a [href]="'mailto:' + supplier.email" class="item-link">{{ supplier.email }}</a>
                  </div>
                </div>
              }
              @if (supplier.address) {
                <div class="info-item">
                  <div class="icon-box"><ng-icon name="lucideMapPin"></ng-icon></div>
                  <div class="item-content">
                    <span class="item-label">Dirección</span>
                    <span class="item-text">{{ supplier.address }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <div class="detail-section info">
          <h3 class="section-title">Datos Fiscales</h3>
          <div class="fiscal-grid">
            <div class="fiscal-item">
              <span class="fiscal-label">Tipo Contribuyente</span>
              <span class="fiscal-value">{{ contribuyenteLabel }}</span>
            </div>
            <div class="fiscal-item">
              <span class="fiscal-label">Régimen RIMPE</span>
              <span class="fiscal-value">{{ rimpeLabel }}</span>
            </div>
            <div class="fiscal-item">
              <span class="fiscal-label">Obligado Contabilidad</span>
              <span class="fiscal-value">{{ supplier.obligadoContabilidad ? 'Sí' : 'No' }}</span>
            </div>
            <div class="fiscal-item">
              <span class="fiscal-label">Parte Relacionada</span>
              <span class="fiscal-value">{{ supplier.parteRelacionada ? 'Sí' : 'No' }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section info">
          <h3 class="section-title">Datos del Sistema</h3>
          <div class="fiscal-grid">
            <div class="fiscal-item">
              <span class="fiscal-label">Registrado</span>
              <span class="fiscal-value">{{ supplier.createdAt | date:'longDate' }}</span>
            </div>
            <div class="fiscal-item">
              <span class="fiscal-label">Última Actualización</span>
              <span class="fiscal-value">{{ supplier.updatedAt | date:'longDate' }}</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .detail { padding: 8px 4px; display: flex; flex-direction: column; gap: 32px; }

    .detail-section { display: flex; flex-direction: column; gap: 16px;
      &.header { gap: 8px;
        .header-main { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .supplier-name { font-size: 24px; font-weight: 800; color: var(--color-text-main); margin: 0; letter-spacing: -0.02em; }
        .status-badge {
          display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 700;
          &.active { background: rgba(16, 185, 129, 0.1); color: #10b981; }
          &.inactive { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        }
        .supplier-code { font-size: 13px; color: var(--color-text-muted); margin: 0; }
      }
    }

    .section-title { font-size: 14px; font-weight: 700; color: var(--color-text-main); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; padding-bottom: 8px; border-bottom: 2px solid var(--color-border-subtle); }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    .kpi-card {
      background: var(--color-bg-hover); border: 1px solid var(--color-border-subtle); border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 16px; transition: var(--transition-base);
      &:hover { border-color: var(--color-primary-subtle); background: var(--color-bg-surface); box-shadow: var(--shadow-sm); }
      .kpi-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px;
        &.contact { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        &.phone { background: rgba(16, 185, 129, 0.1); color: #10b981; }
      }
      .kpi-info { display: flex; flex-direction: column; gap: 2px;
        .kpi-label { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
        .kpi-value { font-size: 14px; font-weight: 700; color: var(--color-text-main); }
      }
    }

    .info-list { display: flex; flex-direction: column; gap: 20px; }
    .info-item { display: flex; gap: 16px; align-items: flex-start;
      .icon-box { width: 36px; height: 36px; border-radius: 10px; background: var(--color-bg-hover); color: var(--color-text-soft); display: flex; align-items: center; justify-content: center; font-size: 18px; border: 1px solid var(--color-border-subtle); }
      .item-content { display: flex; flex-direction: column; gap: 2px;
        .item-label { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
        .item-text { font-size: 14px; color: var(--color-text-main); font-weight: 500; line-height: 1.4; }
        .item-link { font-size: 14px; color: var(--color-accent-primary); font-weight: 500; text-decoration: none; &:hover { text-decoration: underline; } }
      }
    }

    .fiscal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .fiscal-item { display: flex; flex-direction: column; gap: 4px;
      .fiscal-label { font-size: 11px; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; }
      .fiscal-value { font-size: 13px; color: var(--color-text-main); font-weight: 500; }
    }
  `]
})
export class SupplierDetailComponent {
  @Input() supplier?: Supplier;

  get idTypeLabel(): string {
    if (!this.supplier) return '';
    const map: Record<string, string> = { RUC: 'RUC', CEDULA: 'Cédula', PASAPORTE: 'Pasaporte' };
    return map[this.supplier.tipoIdentificacion] ?? this.supplier.tipoIdentificacion;
  }

  get contribuyenteLabel(): string {
    if (!this.supplier) return '';
    const map: Record<string, string> = { PERSONA_NATURAL: 'Persona Natural', SOCIEDAD: 'Sociedad', CONTRIBUYENTE_ESPECIAL: 'Contribuyente Especial', ENTIDAD_PUBLICA: 'Entidad Pública' };
    return map[this.supplier.tipoContribuyente] ?? this.supplier.tipoContribuyente;
  }

  get rimpeLabel(): string {
    if (!this.supplier?.regimenRimpe) return 'No aplica';
    return this.supplier.regimenRimpe === 'POPULAR' ? 'Negocio Popular' : 'Emprendedor';
  }
}
