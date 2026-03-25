import { Component, ChangeDetectionStrategy, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { BranchService } from '../../../../core/services/branch.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  PurchaseOrder, PurchaseOrderStatus, PaymentStatus, PaymentMethod,
  PurchaseOrderItem,
  STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_CONDITION_LABELS, PAYMENT_METHOD_LABELS,
  RegisterReceiptPayload, RegisterRetentionPayload, RegisterPaymentPayload,
} from '../../../../core/models/purchase-order.models';
import { environment } from '../../../../../environments/environment';

import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { DatePickerComponent } from '../../../../shared/components/ui/date-picker/date-picker';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/ui/custom-select/custom-select.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { BackButtonComponent } from '../../../../shared/components/ui/back-button/back-button';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideEye, lucidePencil, lucideTrash2, lucideCheck,
  lucidePackageCheck, lucideX, lucideClipboardList, lucideBuilding2,
  lucideWarehouse, lucideCalendar, lucideHash, lucideBanknote,
  lucideFileText, lucideShieldCheck, lucideChevronRight,
  lucideReceipt, lucideCreditCard, lucideCopy, lucideArrowLeft,
  lucideAlertCircle,
} from '@ng-icons/lucide';

// ── Receipt form model ──────────────────────────────────────────────────────

interface ReceiptFormItem {
  orderItemId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  unitOfMeasure: string;
  quantityOrdered: number;
  quantityReceived: number;
  qtyToReceive: number;
  unitCost: number;
  trackLots: boolean;
  trackExpiry: boolean;
  lotNumber: string;
  expiryDate: string;
  locationId: string;
}

const IVA_RETENTION_CODES = [
  { codigoRetencion: '9', label: '30% bienes', porcentaje: 30 },
  { codigoRetencion: '10', label: '70% servicios', porcentaje: 70 },
  { codigoRetencion: '1', label: '10% bienes', porcentaje: 10 },
  { codigoRetencion: '2', label: '20% servicios', porcentaje: 20 },
  { codigoRetencion: '3', label: '100% liq.compra', porcentaje: 100 },
];
const RENTA_RETENTION_CODES = [
  { codigoRetencion: '303', label: '2% bienes muebles', porcentaje: 2 },
  { codigoRetencion: '304', label: '2% bienes a sociedad', porcentaje: 2 },
  { codigoRetencion: '307', label: '3% servicios', porcentaje: 3 },
  { codigoRetencion: '308', label: '5% serv. profesionales', porcentaje: 5 },
  { codigoRetencion: '309', label: '1% compras', porcentaje: 1 },
  { codigoRetencion: '310', label: '1.75% combustibles', porcentaje: 1.75 },
  { codigoRetencion: '323', label: '8% arrendamiento', porcentaje: 8 },
  { codigoRetencion: '332', label: '10% honorarios', porcentaje: 10 },
];

const COD_SUSTENTO_OPTIONS: SelectOption[] = [
  { value: '01', label: '01 — Compra de bienes' },
  { value: '02', label: '02 — Servicios' },
  { value: '03', label: '03 — Bienes no producidos' },
  { value: '04', label: '04 — Comisiones' },
  { value: '05', label: '05 — Activos fijos' },
  { value: '06', label: '06 — Seguros' },
  { value: '07', label: '07 — Rendimientos financieros' },
  { value: '08', label: '08 — Loterías y apuestas' },
  { value: '09', label: '09 — Dividendos' },
  { value: '10', label: '10 — Préstamos' },
];

const PAGO_LOC_EXT_OPTIONS: SelectOption[] = [
  { value: '01', label: 'Local' },
  { value: '02', label: 'Exterior' },
];

interface RetentionFormLine {
  codigoImpuesto: string;
  codigoRetencion: string;
  label: string;
  baseImponible: number;
  porcentajeRetener: number;
  valorRetenido: number;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] =
  (Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(
    ([value, label]) => ({ value, label })
  );

// ── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-purchase-order-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    DrawerComponent, ModalComponent, FormButtonComponent,
    SpinnerComponent, BackButtonComponent, NgIconComponent,
    DatePickerComponent, CustomSelectComponent,
  ],
  providers: [
    provideIcons({
      lucidePlus, lucideEye, lucidePencil, lucideTrash2, lucideCheck,
      lucidePackageCheck, lucideX, lucideClipboardList, lucideBuilding2,
      lucideWarehouse, lucideCalendar, lucideHash, lucideBanknote,
      lucideFileText, lucideShieldCheck, lucideChevronRight,
      lucideReceipt, lucideCreditCard, lucideCopy, lucideArrowLeft,
      lucideAlertCircle,
    })
  ],
  template: `
    <!-- Loading -->
    @if (isLoading() && !order()) {
      <div class="pod__loading">
        <app-spinner></app-spinner>
        <span>Cargando orden...</span>
      </div>
    }

    <!-- Error -->
    @if (error()) {
      <div class="pod__error">
        <ng-icon name="lucideAlertCircle"></ng-icon>
        <h3>No se pudo cargar la orden</h3>
        <p>{{ error() }}</p>
        <button class="pod__error-btn" (click)="goBack()">
          <ng-icon name="lucideArrowLeft"></ng-icon>
          Volver a Órdenes
        </button>
      </div>
    }

    @if (order(); as d) {
      <div class="pod">

        <!-- ═══ HEADER ═══ -->
        <header class="pod__header">
          <div class="pod__header-top">
            <nav class="pod__breadcrumb">
              <app-back-button (clicked)="goBack()"></app-back-button>
              <span class="pod__breadcrumb-sep">/</span>
              <a class="pod__breadcrumb-link" (click)="goBack()">Órdenes de Compra</a>
              <span class="pod__breadcrumb-sep">/</span>
              <span class="pod__breadcrumb-current">#{{ d.orderNumber }}</span>
            </nav>

            <div class="pod__header-actions">
              @if (d.status === 'BORRADOR') {
                <app-form-button label="Editar" icon="lucidePencil" variant="secondary" type="button" [fullWidth]="false" (click)="onEdit()"></app-form-button>
                <app-form-button label="Aprobar" icon="lucideCheck" type="button" [fullWidth]="false" [loading]="isActioning()" (click)="openApproveModal()"></app-form-button>
              }
              @if ((d.status === 'APROBADA' || d.status === 'RECIBIDA_PARCIAL') && (d.items ?? []).some(i => +i.quantityReceived < +i.quantityOrdered)) {
                <app-form-button label="Reg. Recepción" icon="lucidePackageCheck" variant="secondary" type="button" [fullWidth]="false" (click)="openReceiptDrawer()"></app-form-button>
              }
              @if (d.status === 'RECIBIDA_PARCIAL' || d.status === 'RECIBIDA' || d.status === 'CERRADA') {
                <app-form-button label="Retención" icon="lucideShieldCheck" variant="ghost" type="button" [fullWidth]="false" (click)="openRetentionModal()"></app-form-button>
                <app-form-button label="Registrar Pago" icon="lucideCreditCard" variant="secondary" type="button" [fullWidth]="false" (click)="openPaymentModal()"></app-form-button>
              }
              @if (d.status !== 'ANULADA' && d.status !== 'CERRADA') {
                <app-form-button label="Anular" icon="lucideX" variant="danger" type="button" [fullWidth]="false" (click)="isCancelModalOpen.set(true)"></app-form-button>
              }
              @if (d.status === 'BORRADOR') {
                <app-form-button label="Eliminar" icon="lucideTrash2" variant="danger" type="button" [fullWidth]="false" (click)="isDeleteModalOpen.set(true)"></app-form-button>
              }
              @if (d.status !== 'ANULADA') {
                <app-form-button label="Duplicar" icon="lucideCopy" variant="ghost" type="button" [fullWidth]="false" (click)="onDuplicate()"></app-form-button>
              }
            </div>
          </div>

          <!-- Hero -->
          <div class="pod__hero">
            <div class="pod__hero-icon">
              <ng-icon name="lucideClipboardList"></ng-icon>
            </div>
            <div class="pod__hero-content">
              <div class="pod__hero-title-row">
                <h1 class="pod__hero-name"># {{ d.orderNumber }}</h1>
                <div class="pod__hero-badges">
                  <span class="badge-order" [class]="orderBadgeClass(d.status)">{{ orderStatusLabel(d.status) }}</span>
                  <span class="badge-payment" [class]="paymentBadgeClass(d.paymentStatus)">{{ paymentStatusLabel(d.paymentStatus) }}</span>
                </div>
              </div>
              <p class="pod__hero-desc">{{ d.supplierName }} · {{ d.branchName }}</p>
            </div>
          </div>

          <!-- Info cards -->
          <div class="pod__info-cards">
            <div class="pod__info-card">
              <div class="pod__info-card-icon">
                <ng-icon name="lucideBuilding2"></ng-icon>
              </div>
              <div class="pod__info-card-content">
                <span class="pod__info-card-label">Proveedor</span>
                <span class="pod__info-card-value">{{ d.supplierName }}</span>
                @if (d.supplierRuc) { <span class="pod__info-card-sub">RUC: {{ d.supplierRuc }}</span> }
              </div>
            </div>
            <div class="pod__info-card">
              <div class="pod__info-card-icon">
                <ng-icon name="lucideWarehouse"></ng-icon>
              </div>
              <div class="pod__info-card-content">
                <span class="pod__info-card-label">Sucursal</span>
                <span class="pod__info-card-value">{{ d.branchName }}</span>
              </div>
            </div>
            <div class="pod__info-card">
              <div class="pod__info-card-icon">
                <ng-icon name="lucideBanknote"></ng-icon>
              </div>
              <div class="pod__info-card-content">
                <span class="pod__info-card-label">Condición de pago</span>
                <span class="pod__info-card-value">{{ paymentConditionLabel(d.paymentCondition) }}</span>
              </div>
            </div>
            @if (d.expectedDeliveryDate) {
              <div class="pod__info-card">
                <div class="pod__info-card-icon">
                  <ng-icon name="lucideCalendar"></ng-icon>
                </div>
                <div class="pod__info-card-content">
                  <span class="pod__info-card-label">Entrega esperada</span>
                  <span class="pod__info-card-value">{{ d.expectedDeliveryDate | date:'dd/MM/yyyy' }}</span>
                </div>
              </div>
            }
            @if (d.dueDate) {
              <div class="pod__info-card">
                <div class="pod__info-card-icon">
                  <ng-icon name="lucideCalendar"></ng-icon>
                </div>
                <div class="pod__info-card-content">
                  <span class="pod__info-card-label">Vencimiento</span>
                  <span class="pod__info-card-value">{{ d.dueDate | date:'dd/MM/yyyy' }}</span>
                </div>
              </div>
            }
          </div>

          @if (d.internalNotes) {
            <div class="pod__notes">
              <ng-icon name="lucideFileText" size="14"></ng-icon>
              <span>{{ d.internalNotes }}</span>
            </div>
          }
        </header>

        <!-- ═══ CONTENT ═══ -->
        <div class="pod__content">

          <!-- Items table -->
          @if ((d.items ?? []).length > 0) {
            <div class="detail-items">
              <table class="items-tbl">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th class="r">U.M.</th>
                    <th class="r">Ped.</th>
                    <th class="r">Rec.</th>
                    <th class="r">Costo</th>
                    <th class="r">Desc.%</th>
                    <th class="r">Imp.</th>
                    <th class="r">Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of d.items; track item.id) {
                    <tr>
                      <td>
                        <span class="itbl-name">{{ item.productName }}</span>
                        @if (item.variantName) { <span class="itbl-variant">{{ item.variantName }}</span> }
                        @if (item.sku) { <span class="itbl-sku">{{ item.sku }}</span> }
                      </td>
                      <td class="r">{{ item.unitAbbreviation ?? 'UN' }}</td>
                      <td class="r">{{ item.quantityOrdered }}</td>
                      <td class="r">
                        <span [class.qty-partial]="item.quantityReceived > 0 && item.quantityReceived < item.quantityOrdered"
                              [class.qty-full]="item.quantityReceived >= item.quantityOrdered">
                          {{ item.quantityReceived }}
                        </span>
                      </td>
                      <td class="r">{{ +item.unitCost | currency:'USD':'symbol':'1.2-2' }}</td>
                      <td class="r">{{ item.discountPercent }}%</td>
                      <td class="r">{{ item.totalTaxes | currency:'USD':'symbol':'1.2-2' }}</td>
                      <td class="r fw">{{ +item.lineTotal | currency:'USD':'symbol':'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- Totals summary -->
          <div class="detail-totals">
            @if (+d.totalDiscount > 0) {
              <div class="dt-row"><span>Descuento</span><span>- {{ +d.totalDiscount | currency:'USD':'symbol':'1.2-2' }}</span></div>
            }
            @if (d.taxSummary?.length) {
              @for (tax of d.taxSummary; track tax.taxId) {
                <div class="dt-row"><span>{{ tax.taxName }}</span><span>{{ +tax.taxAmount | currency:'USD':'symbol':'1.2-2' }}</span></div>
              }
            } @else if (+d.totalTaxes > 0) {
              <div class="dt-row"><span>Impuestos</span><span>{{ +d.totalTaxes | currency:'USD':'symbol':'1.2-2' }}</span></div>
            }
            <div class="dt-row dt-total"><span>TOTAL</span><span>{{ +d.total | currency:'USD':'symbol':'1.2-2' }}</span></div>
            @if (+d.totalPaid > 0) {
              <div class="dt-row dt-paid"><span>Pagado</span><span>{{ +d.totalPaid | currency:'USD':'symbol':'1.2-2' }}</span></div>
              <div class="dt-row dt-balance">
                <span>Saldo</span>
                <span>{{ (+d.total - +d.totalPaid) | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            }
          </div>

          <!-- Tabs: Recepciones / Retenciones / Pagos -->
          <div class="detail-tabs">
            <div class="dtabs-header">
              <button class="dtab-btn" [class.active]="detailTab() === 'receipts'" (click)="detailTab.set('receipts')">
                <ng-icon name="lucidePackageCheck" size="14"></ng-icon>
                Recepciones ({{ (d.receipts ?? []).length }})
              </button>
              <button class="dtab-btn" [class.active]="detailTab() === 'retentions'" (click)="detailTab.set('retentions')">
                <ng-icon name="lucideShieldCheck" size="14"></ng-icon>
                Retenciones ({{ (d.retentions ?? []).length }})
              </button>
              <button class="dtab-btn" [class.active]="detailTab() === 'payments'" (click)="detailTab.set('payments')">
                <ng-icon name="lucideCreditCard" size="14"></ng-icon>
                Pagos ({{ (d.payments ?? []).length }})
              </button>
            </div>

            <!-- Receipts tab -->
            @if (detailTab() === 'receipts') {
              @if ((d.receipts ?? []).length === 0) {
                <p class="dtab-empty">Sin recepciones registradas.</p>
              } @else {
                @for (r of d.receipts; track r.id) {
                  <div class="dtab-card">
                    <div class="dtab-card__head">
                      <span class="dtab-card__title">Factura {{ r.supplierInvoiceNumber }}</span>
                      <span class="dtab-card__date">{{ r.supplierInvoiceDate | date:'dd/MM/yyyy' }}</span>
                      @if (r.isPartial) { <span class="badge-partial">Parcial</span> }
                    </div>
                    @if (r.sriAuthorizationNumber) {
                      <p class="dtab-card__sub">Autorización: {{ r.sriAuthorizationNumber }}</p>
                    }
                    @if (r.receiptItems.length) {
                      <div class="receipt-items-detail">
                        @for (ri of r.receiptItems; track ri.id) {
                          <div class="receipt-item-row">
                            <span class="receipt-item-qty">{{ ri.quantityReceived }} un.</span>
                            @if (ri.unitCost) {
                              <span class="receipt-item-cost">@ {{ ri.unitCost | currency:'USD':'symbol':'1.2-4' }}</span>
                            }
                            @if (ri.lotNumber) {
                              <span class="receipt-item-lot">Lote: {{ ri.lotNumber }}</span>
                            }
                            @if (ri.expiryDate) {
                              <span class="receipt-item-expiry">Vence: {{ ri.expiryDate | date:'dd/MM/yy' }}</span>
                            }
                          </div>
                        }
                      </div>
                    }
                    @if (r.receivedByName) {
                      <p class="dtab-card__sub">Recibido por: {{ r.receivedByName }}</p>
                    }
                  </div>
                }
              }
            }

            <!-- Retentions tab -->
            @if (detailTab() === 'retentions') {
              @if ((d.retentions ?? []).length === 0) {
                <p class="dtab-empty">Sin retenciones registradas.</p>
              } @else {
                @for (r of d.retentions; track r.id) {
                  <div class="dtab-card">
                    <div class="dtab-card__head">
                      <span class="dtab-card__title">Retención {{ r.retentionNumber }}</span>
                      <span class="dtab-card__date">{{ r.retentionDate | date:'dd/MM/yyyy' }}</span>
                    </div>
                    <div class="dtab-card__grid">
                      @for (line of r.lines ?? []; track $index) {
                        <span>{{ line.codigoImpuesto === '1' ? 'Renta' : 'IVA' }} {{ line.porcentajeRetener }}% (cód. {{ line.codigoRetencion }})</span>
                        <span>{{ +line.valorRetenido | currency:'USD':'symbol':'1.2-2' }}</span>
                      }
                      <span class="fw">Total retenido</span>
                      <span class="fw">{{ +r.totalRetained | currency:'USD':'symbol':'1.2-2' }}</span>
                    </div>
                    @if (r.emittedByName) { <p class="dtab-card__sub">Emitido por: {{ r.emittedByName }}</p> }
                    @if (r.sriStatus) {
                      <span class="dtab-card__sri-status" [class]="'sri-' + r.sriStatus.toLowerCase()">SRI: {{ r.sriStatus }}</span>
                    }
                    <div class="dtab-card__actions">
                      <button type="button" class="dtab-card__xml-btn" (click)="previewRetentionXml(d.id, r.id)">Ver XML</button>
                      @if (r.sriStatus !== 'AUTORIZADO' && d.status !== 'ANULADA') {
                        <button type="button" class="dtab-card__delete-btn" [disabled]="isActioning()" (click)="deleteRetention(d.id, r.id)">
                          <ng-icon name="lucideTrash2" size="14"></ng-icon> Eliminar
                        </button>
                      }
                    </div>
                  </div>
                }
              }
            }

            <!-- Payments tab -->
            @if (detailTab() === 'payments') {
              @if ((d.payments ?? []).length === 0) {
                <p class="dtab-empty">Sin pagos registrados.</p>
              } @else {
                @for (p of d.payments; track p.id) {
                  <div class="dtab-card">
                    <div class="dtab-card__head">
                      <span class="dtab-card__title">{{ paymentMethodLabel(p.paymentMethod) }}</span>
                      <span class="dtab-card__date">{{ p.paymentDate | date:'dd/MM/yyyy' }}</span>
                      <span class="dtab-card__amount">{{ +p.amount | currency:'USD':'symbol':'1.2-2' }}</span>
                    </div>
                    @if (p.reference) { <p class="dtab-card__sub">Ref: {{ p.reference }}</p> }
                    @if (p.paidByName) { <p class="dtab-card__sub">Por: {{ p.paidByName }}</p> }
                    @if (d.status !== 'ANULADA') {
                      <button type="button" class="dtab-card__delete-btn" [disabled]="isActioning()" (click)="deletePayment(d.id, p.id)">
                        <ng-icon name="lucideTrash2" size="14"></ng-icon> Eliminar
                      </button>
                    }
                  </div>
                }
              }
            }
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════════
           RECEIPT DRAWER
      ════════════════════════════════════════════════════════════════════ -->
      <app-drawer [isOpen]="isReceiptDrawerOpen()" title="Registrar Recepción" (close)="isReceiptDrawerOpen.set(false)" size="lg">
        <div drawerBody>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Bodega de destino *</label>
              <app-custom-select
                [options]="warehouseOptions()"
                [value]="receiptForm.warehouseId"
                (valueChange)="receiptForm.warehouseId = $event; onWarehouseChange($event)"
              ></app-custom-select>
            </div>
            @if (selectedWarehouseHasLocations && warehouseLocations().length > 0) {
              <div class="form-group">
                <label class="form-label">Ubicación <span class="optional">(por defecto para todos los items)</span></label>
                <app-custom-select
                  [options]="locationOptions()"
                  [value]="receiptForm.defaultLocationId"
                  (valueChange)="receiptForm.defaultLocationId = $event"
                ></app-custom-select>
              </div>
            }
            <div class="form-group">
              <label class="form-label">N° Factura del proveedor *</label>
              <input class="form-control" type="text" [(ngModel)]="receiptForm.supplierInvoiceNumber" placeholder="001-001-000000123" />
            </div>
            <div class="form-group">
              <label class="form-label">Fecha de factura *</label>
              <app-date-picker [(ngModel)]="receiptForm.supplierInvoiceDate" placeholder="Seleccionar fecha..."></app-date-picker>
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">N° Autorización SRI <span class="optional">(opcional)</span></label>
              <input class="form-control" type="text" [(ngModel)]="receiptForm.sriAuthorizationNumber" placeholder="Clave de acceso electrónica (49 dígitos)" maxlength="49" />
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">Notas <span class="optional">(opcional)</span></label>
              <textarea class="form-control" rows="2" [(ngModel)]="receiptForm.notes"></textarea>
            </div>
          </div>

          <!-- Items to receive -->
          <h4 class="receipt-items-title">Cantidades a recibir</h4>
          <div class="receipt-items">
            <div class="ri-head">
              <span>Producto</span>
              <span class="r">Pedido</span>
              <span class="r">Recibido</span>
              <span class="r">A recibir</span>
              <span class="r">Costo</span>
            </div>
            @for (ri of receiptForm.items; track ri.orderItemId) {
              <div class="ri-row">
                <div class="ri-prod">
                  <span>{{ ri.productName }}{{ ri.variantName ? ' — ' + ri.variantName : '' }}</span>
                  @if (ri.sku) { <span class="ri-sku">{{ ri.sku }}</span> }
                </div>
                <div class="ri-nums">
                  <div class="ri-field">
                    <span class="ri-field__label">Pedido</span>
                    <span class="ri-field__value">{{ ri.quantityOrdered }} {{ ri.unitOfMeasure }}</span>
                  </div>
                  <div class="ri-field">
                    <span class="ri-field__label">Recibido</span>
                    <span class="ri-field__value">{{ ri.quantityReceived }}</span>
                  </div>
                  <div class="ri-field">
                    <span class="ri-field__label">A recibir</span>
                    <input type="number" class="cell-input num-input" min="0"
                      [max]="ri.quantityOrdered - ri.quantityReceived"
                      [(ngModel)]="ri.qtyToReceive" />
                  </div>
                  <div class="ri-field">
                    <span class="ri-field__label">Costo</span>
                    <input type="number" class="cell-input num-input" min="0" step="0.01"
                      [(ngModel)]="ri.unitCost" />
                  </div>
                </div>
              </div>
              @if ((ri.trackLots || selectedWarehouseHasLocations) && ri.qtyToReceive > 0) {
                <div class="ri-extra">
                  @if (ri.trackLots) {
                    <div class="ri-extra-field">
                      <label>N.o de Lote *</label>
                      <input type="text" class="form-control" [(ngModel)]="ri.lotNumber" placeholder="Ej: LOTE-2026-001" />
                    </div>
                  }
                  @if (ri.trackExpiry) {
                    <div class="ri-extra-field">
                      <label>Fecha de Vencimiento *</label>
                      <app-date-picker [(ngModel)]="ri.expiryDate" placeholder="Vencimiento..." [disablePast]="true"></app-date-picker>
                    </div>
                  }
                  @if (selectedWarehouseHasLocations && warehouseLocations().length > 0) {
                    <div class="ri-extra-field">
                      <label>Ubicación</label>
                      <app-custom-select
                        [options]="locationOptions()"
                        [value]="ri.locationId"
                        (valueChange)="ri.locationId = $event"
                      ></app-custom-select>
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isReceiptDrawerOpen.set(false)"></app-form-button>
          <app-form-button label="Registrar Recepción" icon="lucideCheck" [loading]="isActioning()" (click)="submitReceipt()"></app-form-button>
        </div>
      </app-drawer>

      <!-- ═══════════════════════════════════════════════════════════════════
           RETENTION MODAL
      ════════════════════════════════════════════════════════════════════ -->
      <app-modal [isOpen]="isRetentionModalOpen()" title="Registrar Retención" (close)="isRetentionModalOpen.set(false)">
        <div modalBody>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">N° Retención *</label>
              <input class="form-control" type="text" [(ngModel)]="retentionForm.retentionNumber" placeholder="001-001-000000001" />
              <span class="form-hint">Formato: XXX-XXX-XXXXXXXXX</span>
            </div>
            <div class="form-group">
              <label class="form-label">Fecha *</label>
              <app-date-picker [(ngModel)]="retentionForm.retentionDate" placeholder="Seleccionar fecha..."></app-date-picker>
            </div>

            @if ((order()?.receipts ?? []).length > 1) {
              <div class="form-group form-group--full">
                <label class="form-label">Factura asociada</label>
                <app-custom-select
                  [options]="receiptOptions()"
                  [value]="retentionForm.receiptId"
                  (valueChange)="retentionForm.receiptId = $any($event)"
                ></app-custom-select>
              </div>
            }

            <!-- Líneas de retención -->
            <div class="form-group form-group--full">
              <label class="form-label">Líneas de Retención</label>
              @for (line of retentionForm.lines; track $index) {
                <div class="ret-line">
                  <div class="ret-line__type">{{ line.codigoImpuesto === '1' ? 'RENTA' : 'IVA' }}</div>
                  <app-custom-select
                    class="ret-line__code"
                    [options]="line.codigoImpuesto === '1' ? rentaRetentionOptions : ivaRetentionOptions"
                    [value]="line.codigoRetencion"
                    (valueChange)="line.codigoRetencion = $event; onRetentionCodeChange(line)"
                  ></app-custom-select>
                  <div class="ret-line__base-wrap">
                    <input class="form-control ret-line__base" type="number" step="0.01" [(ngModel)]="line.baseImponible" (ngModelChange)="recalcRetentionLine(line)" placeholder="Base" />
                    <span class="ret-line__hint">{{ line.codigoImpuesto === '1' ? 'Base: subtotal' : 'Base: impuestos' }}</span>
                  </div>
                  <span class="ret-line__result">{{ line.valorRetenido | currency:'USD':'symbol':'1.2-2' }}</span>
                  <button type="button" class="ret-line__remove" (click)="removeRetentionLine($index)">×</button>
                </div>
              }
              <div class="ret-line__actions">
                <button type="button" class="ret-add-btn" (click)="addRetentionLine('1')">+ Renta</button>
                <button type="button" class="ret-add-btn" (click)="addRetentionLine('2')">+ IVA</button>
              </div>
            </div>

            <!-- Totals preview -->
            <div class="form-group form-group--full retention-preview">
              @for (line of retentionForm.lines; track $index) {
                <div class="ret-row"><span>{{ line.label }}</span><span>{{ line.valorRetenido | currency:'USD':'symbol':'1.2-2' }}</span></div>
              }
              <div class="ret-row ret-total"><span>Total retenido</span><span>{{ retentionTotal | currency:'USD':'symbol':'1.2-2' }}</span></div>
            </div>

            <!-- Opciones SRI opcionales -->
            <div class="form-group">
              <label class="form-label">Cód. Sustento <span class="optional">(opcional)</span></label>
              <app-custom-select
                [options]="codSustentoOptions"
                [value]="retentionForm.codSustento"
                (valueChange)="retentionForm.codSustento = $event"
              ></app-custom-select>
            </div>
            <div class="form-group">
              <label class="form-label">Pago <span class="optional">(opcional)</span></label>
              <app-custom-select
                [options]="pagoLocExtOptions"
                [value]="retentionForm.pagoLocExt"
                (valueChange)="retentionForm.pagoLocExt = $event"
              ></app-custom-select>
            </div>

            <div class="form-group form-group--full">
              <label class="form-label">Notas <span class="optional">(opcional)</span></label>
              <textarea class="form-control" rows="2" [(ngModel)]="retentionForm.notes"></textarea>
            </div>
          </div>
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isRetentionModalOpen.set(false)"></app-form-button>
          <app-form-button label="Registrar Retención" icon="lucideCheck" [loading]="isActioning()" (click)="submitRetention()"></app-form-button>
        </div>
      </app-modal>

      <!-- ═══════════════════════════════════════════════════════════════════
           PAYMENT MODAL
      ════════════════════════════════════════════════════════════════════ -->
      <app-modal [isOpen]="isPaymentModalOpen()" title="Registrar Pago" (close)="isPaymentModalOpen.set(false)">
        <div modalBody>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Monto *</label>
              <input class="form-control" type="number" step="0.01" min="0.01" [(ngModel)]="paymentForm.amount" placeholder="0.00" />
            </div>
            <div class="form-group">
              <label class="form-label">Fecha de pago *</label>
              <app-date-picker [(ngModel)]="paymentForm.paymentDate" placeholder="Seleccionar fecha..."></app-date-picker>
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">Método de pago *</label>
              <app-custom-select
                [options]="paymentMethodOptions"
                [value]="paymentForm.paymentMethod"
                (valueChange)="paymentForm.paymentMethod = $any($event)"
              ></app-custom-select>
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">Referencia / N° documento <span class="optional">(opcional)</span></label>
              <input class="form-control" type="text" [(ngModel)]="paymentForm.reference" placeholder="N° transferencia, cheque, etc." />
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">Notas <span class="optional">(opcional)</span></label>
              <textarea class="form-control" rows="2" [(ngModel)]="paymentForm.notes"></textarea>
            </div>
          </div>

          @if (order()) {
            <div class="payment-balance">
              <div class="pb-row"><span>Total orden</span><span>{{ +order()!.total | currency:'USD':'symbol':'1.2-2' }}</span></div>
              <div class="pb-row"><span>Pagado</span><span>{{ +order()!.totalPaid | currency:'USD':'symbol':'1.2-2' }}</span></div>
              <div class="pb-row pb-saldo"><span>Saldo</span><span>{{ (+order()!.total - +order()!.totalPaid) | currency:'USD':'symbol':'1.2-2' }}</span></div>
            </div>
          }
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isPaymentModalOpen.set(false)"></app-form-button>
          <app-form-button label="Registrar Pago" icon="lucideCheck" [loading]="isActioning()" (click)="submitPayment()"></app-form-button>
        </div>
      </app-modal>

      <!-- ═══════════════════════════════════════════════════════════════════
           APPROVE / CANCEL / DELETE MODALS
      ════════════════════════════════════════════════════════════════════ -->
      <app-modal [isOpen]="isApproveModalOpen()" title="Aprobar Orden" (close)="isApproveModalOpen.set(false)">
        <div modalBody>
          <p style="margin:0">¿Aprobar la orden <strong>{{ order()?.orderNumber }}</strong>?<br>Una vez aprobada, ya no podrás editarla.</p>
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isApproveModalOpen.set(false)"></app-form-button>
          <app-form-button label="Aprobar" icon="lucideCheck" [loading]="isActioning()" (click)="confirmApprove()"></app-form-button>
        </div>
      </app-modal>

      <app-modal [isOpen]="isCancelModalOpen()" title="Anular Orden" (close)="isCancelModalOpen.set(false)">
        <div modalBody>¿Anular la orden <strong>{{ order()?.orderNumber }}</strong>? Esta acción no se puede deshacer.</div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isCancelModalOpen.set(false)"></app-form-button>
          <app-form-button label="Anular Orden" variant="danger" icon="lucideX" [loading]="isActioning()" (click)="confirmCancel()"></app-form-button>
        </div>
      </app-modal>

      <app-modal [isOpen]="isDeleteModalOpen()" title="Eliminar Borrador" (close)="isDeleteModalOpen.set(false)">
        <div modalBody>¿Eliminar este borrador? La acción es irreversible.</div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isDeleteModalOpen.set(false)"></app-form-button>
          <app-form-button label="Eliminar" variant="danger" icon="lucideTrash2" [loading]="isActioning()" (click)="confirmDelete()"></app-form-button>
        </div>
      </app-modal>

      <!-- Delete Payment Modal -->
      <app-modal [isOpen]="isDeletePaymentModalOpen()" title="Eliminar Pago" (close)="isDeletePaymentModalOpen.set(false)">
        <div modalBody>¿Eliminar este pago? Se recalculará el saldo de la orden.</div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isDeletePaymentModalOpen.set(false)"></app-form-button>
          <app-form-button label="Eliminar Pago" variant="danger" icon="lucideTrash2" [loading]="isActioning()" (click)="confirmDeletePayment()"></app-form-button>
        </div>
      </app-modal>

      <!-- Delete Retention Modal -->
      <app-modal [isOpen]="isDeleteRetentionModalOpen()" title="Eliminar Retención" (close)="isDeleteRetentionModalOpen.set(false)">
        <div modalBody>¿Eliminar esta retención? Los datos fiscales asociados se perderán.</div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isDeleteRetentionModalOpen.set(false)"></app-form-button>
          <app-form-button label="Eliminar Retención" variant="danger" icon="lucideTrash2" [loading]="isActioning()" (click)="confirmDeleteRetention()"></app-form-button>
        </div>
      </app-modal>

      <!-- XML Preview Modal -->
      <app-modal [isOpen]="isXmlPreviewOpen()" title="XML Comprobante de Retención" (close)="isXmlPreviewOpen.set(false)">
        <div modalBody>
          <pre class="xml-preview">{{ xmlPreviewContent() }}</pre>
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cerrar" variant="secondary" (click)="isXmlPreviewOpen.set(false)"></app-form-button>
        </div>
      </app-modal>

      <!-- Mobile footer -->
      <div class="pod__mobile-footer">
        @if (d.status === 'BORRADOR') {
          <button class="pod__mobile-btn pod__mobile-btn--secondary" (click)="onEdit()">
            <ng-icon name="lucidePencil" size="16"></ng-icon> Editar
          </button>
          <button class="pod__mobile-btn pod__mobile-btn--primary" (click)="openApproveModal()">
            <ng-icon name="lucideCheck" size="16"></ng-icon> Aprobar
          </button>
        }
        @if ((d.status === 'APROBADA' || d.status === 'RECIBIDA_PARCIAL') && (d.items ?? []).some(i => +i.quantityReceived < +i.quantityOrdered)) {
          <button class="pod__mobile-btn pod__mobile-btn--primary" (click)="openReceiptDrawer()">
            <ng-icon name="lucidePackageCheck" size="16"></ng-icon> Recepción
          </button>
        }
        @if (d.status === 'RECIBIDA_PARCIAL' || d.status === 'RECIBIDA' || d.status === 'CERRADA') {
          <button class="pod__mobile-btn pod__mobile-btn--secondary" (click)="openRetentionModal()">
            <ng-icon name="lucideShieldCheck" size="16"></ng-icon> Retención
          </button>
          <button class="pod__mobile-btn pod__mobile-btn--primary" (click)="openPaymentModal()">
            <ng-icon name="lucideCreditCard" size="16"></ng-icon> Pago
          </button>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    /* ── Loading / Error ─────────────────────────────────────────────── */
    .pod__loading {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; padding: 80px 24px;
      color: var(--color-text-muted); font-size: var(--font-size-sm);
    }
    .pod__error {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 80px 24px; text-align: center;
      color: var(--color-text-muted);
      ng-icon { font-size: 40px; color: var(--color-danger-text); }
      h3 { font-size: var(--font-size-lg); color: var(--color-text-main); margin: 0; }
      p  { font-size: var(--font-size-sm); margin: 0; }
    }
    .pod__error-btn {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 8px;
      padding: 8px 16px; background: var(--color-bg-hover);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
      font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);
      color: var(--color-text-main); cursor: pointer; font-family: inherit;
      transition: var(--transition-fast);
      &:hover { background: var(--color-border-light); }
    }

    /* ── Page shell ──────────────────────────────────────────────────── */
    .pod {
      flex: 1; overflow-y: auto; display: flex; flex-direction: column;
      background: var(--color-bg-canvas); padding: 24px 32px 32px;
    }
    @media (max-width: 768px) { .pod { padding: 20px 16px 24px; } }

    /* ── Header ──────────────────────────────────────────────────────── */
    .pod__header { background: transparent; }
    .pod__header-top {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 12px 0;
      border-bottom: 1px solid var(--color-border-subtle);
    }
    .pod__breadcrumb {
      display: flex; align-items: center; gap: 8px;
      font-size: var(--font-size-sm); color: var(--color-text-muted); min-width: 0;
    }
    .pod__breadcrumb-sep { color: var(--color-border-light); }
    .pod__breadcrumb-link {
      color: var(--color-text-muted); cursor: pointer; transition: var(--transition-fast);
      &:hover { color: var(--color-primary); }
    }
    .pod__breadcrumb-current {
      color: var(--color-text-main); font-weight: var(--font-weight-semibold);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .pod__header-actions { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }

    /* ── Hero ─────────────────────────────────────────────────────────── */
    .pod__hero { display: flex; align-items: flex-start; gap: 20px; padding: 24px 0; }
    .pod__hero-icon {
      width: 56px; height: 56px; border-radius: 14px;
      background: var(--color-bg-subtle); border: 1px solid var(--color-border-light);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; color: var(--color-text-muted); flex-shrink: 0;
    }
    .pod__hero-content { flex: 1; min-width: 0; }
    .pod__hero-title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .pod__hero-name {
      font-size: 22px; font-weight: 800; color: var(--color-text-main);
      margin: 0; letter-spacing: -0.02em;
    }
    .pod__hero-badges { display: flex; gap: 6px; }
    .pod__hero-desc { margin: 6px 0 0; font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.5; }

    /* ── Info cards ───────────────────────────────────────────────────── */
    .pod__info-cards { display: flex; gap: 16px; padding: 0 0 24px; flex-wrap: wrap; }
    .pod__info-card {
      flex: 1; min-width: 180px; display: flex; align-items: center; gap: 14px;
      padding: 14px 16px; background: var(--color-bg-hover);
      border: 1px solid var(--color-border-subtle); border-radius: 14px;
    }
    .pod__info-card-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; background: rgba(59,130,246,0.1); color: #3b82f6; flex-shrink: 0;
    }
    .pod__info-card-content { display: flex; flex-direction: column; gap: 1px; }
    .pod__info-card-label { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
    .pod__info-card-value { font-size: 14px; font-weight: 700; color: var(--color-text-main); }
    .pod__info-card-sub { font-size: var(--font-size-xs); color: var(--color-text-muted); font-family: monospace; }

    /* Notes */
    .pod__notes {
      display: flex; align-items: flex-start; gap: 8px; padding: 0 0 16px;
      font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.5;
      ng-icon { flex-shrink: 0; margin-top: 2px; }
    }

    /* ── Content ─────────────────────────────────────────────────────── */
    .pod__content { display: flex; flex-direction: column; gap: 1.25rem; }

    /* ── Status badges ───────────────────────────────────────────────── */
    .badge-order, .badge-payment, .badge-partial, .dtab-card__sri-status {
      padding: 3px 10px; border-radius: 99px; font-size: 11px;
      font-weight: 600; white-space: nowrap; width: fit-content;
    }
    .badge-order.borrador        { background: var(--color-border-subtle); color: var(--color-text-muted); }
    .badge-order.aprobada        { background: var(--color-info-bg); color: var(--color-info-text); }
    .badge-order.recibida_parcial{ background: var(--color-warning-bg); color: var(--color-warning-text); }
    .badge-order.recibida        { background: var(--color-success-bg); color: var(--color-success-text); }
    .badge-order.cerrada         { background: var(--color-bg-hover); color: var(--color-text-muted); }
    .badge-order.anulada         { background: var(--color-danger-bg); color: var(--color-danger-text); }
    .badge-payment.pendiente     { background: var(--color-warning-bg); color: var(--color-warning-text); }
    .badge-payment.pagado_parcial{ background: var(--color-info-bg); color: var(--color-info-text); }
    .badge-payment.pagado        { background: var(--color-success-bg); color: var(--color-success-text); }
    .badge-payment.vencido       { background: var(--color-danger-bg); color: var(--color-danger-text); }
    .badge-partial { background: var(--color-warning-bg); color: var(--color-warning-text); }

    /* ── Items table ─────────────────────────────────────────────────── */
    .detail-items { overflow-x: auto; }
    .items-tbl { width: 100%; border-collapse: collapse; font-size: var(--font-size-xs); }
    .items-tbl th {
      padding: 0.5rem 0.5rem; text-align: left; font-weight: var(--font-weight-semibold);
      color: var(--color-text-muted); border-bottom: 2px solid var(--color-border-light);
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap;
    }
    .items-tbl td { padding: 0.5rem; border-bottom: 1px solid var(--color-border-subtle); vertical-align: top; }
    .r { text-align: right; }
    .fw { font-weight: var(--font-weight-semibold); }
    .itbl-name { display: block; font-weight: var(--font-weight-medium); color: var(--color-text-main); font-size: var(--font-size-sm); }
    .itbl-variant { display: block; color: var(--color-text-muted); }
    .itbl-sku { display: block; color: var(--color-text-muted); font-family: monospace; }
    .qty-partial { color: #ca8a04; font-weight: 600; }
    .qty-full    { color: var(--color-success-text); font-weight: 600; }

    /* ── Totals ──────────────────────────────────────────────────────── */
    .detail-totals {
      display: flex; flex-direction: column; gap: 0.375rem;
      padding: 0.875rem 1rem; background: var(--color-bg-subtle);
      border-radius: var(--radius-md); align-self: flex-end; min-width: 260px;
    }
    .dt-row { display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .dt-total {
      font-weight: var(--font-weight-bold); color: var(--color-text-main); font-size: 1rem;
      border-top: 1px solid var(--color-border-light); padding-top: 0.375rem; margin-top: 0.25rem;
    }
    .dt-paid { color: var(--color-success-text); }
    .dt-balance { font-weight: var(--font-weight-semibold); color: var(--color-text-main); }

    /* ── Tabs ────────────────────────────────────────────────────────── */
    .dtabs-header {
      display: flex; gap: 0.25rem;
      border-bottom: 2px solid var(--color-border-light); margin-bottom: 0.75rem;
    }
    .dtab-btn {
      display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.875rem;
      background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px;
      font-size: var(--font-size-sm); color: var(--color-text-muted); cursor: pointer;
      transition: all var(--transition-base); border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      font-family: inherit;
    }
    .dtab-btn:hover { background: var(--color-bg-hover); }
    .dtab-btn.active { color: var(--color-accent-primary); border-bottom-color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); }
    .dtab-empty { font-size: var(--font-size-sm); color: var(--color-text-muted); padding: 1rem 0; margin: 0; }
    .dtab-card {
      padding: 0.75rem; border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); margin-bottom: 0.5rem;
    }
    .dtab-card__head { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.25rem; }
    .dtab-card__title { font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm); color: var(--color-text-main); }
    .dtab-card__date { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .dtab-card__amount { font-weight: var(--font-weight-bold); color: var(--color-text-main); margin-left: auto; }
    .dtab-card__sub { font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0.125rem 0 0; }
    .dtab-card__grid { display: grid; grid-template-columns: 1fr auto; gap: 0.25rem 1rem; font-size: var(--font-size-sm); }
    .dtab-card__actions { display: flex; gap: 6px; margin-top: 6px; align-items: center; }
    .dtab-card__xml-btn {
      display: inline-block; padding: 3px 10px;
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      background: var(--color-bg-surface); color: var(--color-text-muted);
      font-size: 10px; font-family: inherit; cursor: pointer;
      &:hover { border-color: var(--color-accent-primary); color: var(--color-accent-primary); }
    }
    .dtab-card__delete-btn {
      display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px;
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      background: var(--color-bg-surface); color: var(--color-text-muted);
      font-size: 10px; font-family: inherit; cursor: pointer;
      &:hover { border-color: var(--color-danger); color: var(--color-danger); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .dtab-card__sri-status {
      display: inline-block; margin-top: 4px;
      &.sri-pendiente { background: var(--color-warning-bg); color: var(--color-warning-text); }
      &.sri-generado { background: var(--color-info-bg); color: var(--color-info-text); }
      &.sri-firmado { background: var(--color-info-bg); color: var(--color-info-text); }
      &.sri-enviado { background: rgba(79, 70, 229, 0.08); color: var(--color-accent-primary); }
      &.sri-autorizado { background: var(--color-success-bg); color: var(--color-success-text); }
      &.sri-rechazado { background: var(--color-danger-bg); color: var(--color-danger-text); }
    }

    .receipt-items-detail {
      display: flex; flex-direction: column; gap: 4px; margin-top: 8px;
      padding-top: 8px; border-top: 1px solid var(--color-border-subtle);
    }
    .receipt-item-row { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-xs); color: var(--color-text-muted); flex-wrap: wrap; }
    .receipt-item-qty { font-weight: var(--font-weight-semibold); color: var(--color-text-main); min-width: 50px; }
    .receipt-item-cost { color: var(--color-text-main); font-weight: var(--font-weight-medium); }
    .receipt-item-lot, .receipt-item-expiry {
      padding: 1px 6px; background: var(--color-bg-canvas);
      border-radius: var(--radius-sm); font-size: 10px;
    }

    /* ── Form shared styles ──────────────────────────────────────────── */
    .form-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.325rem; }
    .form-group--full { grid-column: 1 / -1; }
    .form-label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-main); }
    .optional { font-weight: 400; color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .form-control {
      padding: 0.5rem 0.75rem; border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); background: var(--color-bg-surface);
      color: var(--color-text-main); font-size: var(--font-size-sm);
      width: 100%; box-sizing: border-box; font-family: inherit;
    }
    .form-control:focus { outline: none; border-color: var(--color-accent-primary); }
    textarea.form-control { resize: vertical; }
    .form-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; }
    .cell-input {
      width: 100%; padding: 0.35rem 0.4rem; border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm); background: var(--color-bg-surface);
      color: var(--color-text-main); font-size: var(--font-size-xs); box-sizing: border-box;
    }
    .num-input { text-align: right; }

    /* Receipt items */
    .receipt-items-title {
      font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);
      color: var(--color-text-muted); text-transform: uppercase;
      letter-spacing: 0.06em; margin: 1.25rem 0 0.625rem;
    }
    .receipt-items { display: flex; flex-direction: column; gap: 0.5rem; }
    .ri-head {
      display: grid; grid-template-columns: 1fr repeat(4, 80px);
      gap: 0.5rem; padding: 0.5rem 0.75rem;
      font-size: 10px; font-weight: var(--font-weight-semibold);
      text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--color-text-muted); border-bottom: 1px solid var(--color-border-subtle);
    }
    @media (max-width: 768px) { .ri-head { display: none; } }
    .ri-row {
      display: flex; flex-direction: column; gap: 0.5rem;
      padding: 0.75rem; border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-md); background: var(--color-bg-surface);
    }
    .ri-prod { display: flex; flex-direction: column; gap: 2px; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
    .ri-sku { font-size: var(--font-size-xs); color: var(--color-text-muted); font-family: monospace; }
    .ri-nums { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0.5rem; }
    .ri-field { display: flex; flex-direction: column; gap: 2px; }
    .ri-field__label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); font-weight: 600; }
    .ri-field__value { font-size: var(--font-size-sm); color: var(--color-text-main); }
    .ri-extra {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
      padding: 0.5rem 0.75rem 0.75rem;
      background: var(--color-bg-canvas); border-radius: var(--radius-sm);
    }
    .ri-extra-field { display: flex; flex-direction: column; gap: 4px; }
    .ri-extra-field label { font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); color: var(--color-text-muted); }

    /* Retention lines */
    .ret-line {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-border-subtle);
    }
    .ret-line__type { font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-accent-primary); min-width: 45px; }
    .ret-line__code { flex: 1; min-width: 120px; }
    .ret-line__base { width: 100px; text-align: right; }
    .ret-line__base-wrap { display: flex; flex-direction: column; gap: 2px; }
    .ret-line__hint { font-size: 9px; color: var(--color-text-muted); }
    .ret-line__result { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-main); min-width: 70px; text-align: right; }
    .ret-line__remove { border: none; background: transparent; color: var(--color-danger-text); cursor: pointer; font-size: 18px; padding: 0 4px; }
    .ret-line__actions { display: flex; gap: 0.5rem; padding-top: 0.5rem; }
    .ret-add-btn {
      border: 1px dashed var(--color-border-light); background: transparent;
      padding: 0.25rem 0.75rem; border-radius: var(--radius-sm);
      font-size: var(--font-size-xs); color: var(--color-text-muted);
      cursor: pointer; font-family: inherit;
      &:hover { border-color: var(--color-accent-primary); color: var(--color-accent-primary); }
    }
    .retention-preview {
      background: var(--color-bg-subtle); border-radius: var(--radius-md);
      padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.375rem;
    }
    .ret-row { display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .ret-total { font-weight: var(--font-weight-semibold); color: var(--color-text-main); border-top: 1px solid var(--color-border-light); padding-top: 0.375rem; }

    /* Payment balance */
    .payment-balance {
      margin-top: 1rem; padding: 0.75rem 1rem; background: var(--color-bg-subtle);
      border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 0.375rem;
    }
    .pb-row { display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .pb-saldo { font-weight: var(--font-weight-bold); color: var(--color-text-main); border-top: 1px solid var(--color-border-light); padding-top: 0.375rem; }

    /* XML Preview */
    .xml-preview {
      background: var(--color-bg-canvas); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); padding: 16px; font-size: 11px;
      font-family: 'SFMono-Regular', Consolas, monospace; color: var(--color-text-main);
      overflow-x: auto; white-space: pre-wrap; word-break: break-all;
      max-height: 60vh; overflow-y: auto; margin: 0; line-height: 1.5;
    }

    /* Footer shared */
    .drawer-footer-actions { display: flex; justify-content: flex-end; gap: 0.75rem; width: 100%; flex-wrap: wrap; }
    .modal-footer-actions { display: flex; gap: 1rem; justify-content: flex-end; }

    /* ── Mobile footer ───────────────────────────────────────────────── */
    .pod__mobile-footer {
      display: none; position: fixed; bottom: 0; left: 0; right: 0;
      padding: 12px 16px; background: var(--color-bg-surface);
      border-top: 1px solid var(--color-border-light);
      box-shadow: var(--shadow-lg); gap: 8px; z-index: 50;
    }
    .pod__mobile-btn {
      flex: 1; display: inline-flex; align-items: center; justify-content: center;
      gap: 6px; padding: 10px 12px; border-radius: var(--radius-md);
      font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);
      font-family: inherit; cursor: pointer; border: 1px solid transparent;
      transition: var(--transition-fast);
    }
    .pod__mobile-btn--primary {
      background: var(--color-primary); color: var(--color-accent-primary-text);
      &:hover { background: var(--color-primary-dark); }
    }
    .pod__mobile-btn--secondary {
      background: var(--color-bg-surface); color: var(--color-text-main);
      border-color: var(--color-border-light);
      &:hover { background: var(--color-bg-hover); }
    }

    /* ── Responsive ──────────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .pod__header-actions { display: none; }
      .pod__mobile-footer { display: flex; }

      .pod__breadcrumb {
        .pod__breadcrumb-sep,
        .pod__breadcrumb-link { display: none; }
        .pod__breadcrumb-current { font-size: 13px; }
      }
      .pod__hero { flex-direction: column; gap: 12px; padding: 16px 0; }
      .pod__hero-icon { width: 44px; height: 44px; font-size: 20px; border-radius: 12px; }
      .pod__hero-name { font-size: 18px; }
      .pod__hero-title-row { flex-direction: column; align-items: flex-start; gap: 8px; }
      .pod__info-cards { flex-direction: column; gap: 8px; padding: 0 0 16px; }
      .pod__info-card { padding: 12px 14px; border-radius: 12px; }
      .detail-totals { align-self: stretch; min-width: unset; }
      .items-tbl th, .items-tbl td { padding: 0.375rem 0.25rem; font-size: 11px; }
      .dtabs-header { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap; }
      .dtab-btn { white-space: nowrap; flex-shrink: 0; padding: 0.5rem 0.625rem; font-size: var(--font-size-xs); }
      .ret-line { flex-wrap: wrap; gap: 0.375rem; }
      .ret-line__code { min-width: 100%; }
      .ret-line__base { width: 100%; }
      .ret-line__result { text-align: left; }
      .drawer-footer-actions, .modal-footer-actions { flex-direction: column; }
      .drawer-footer-actions ::ng-deep .btn,
      .modal-footer-actions ::ng-deep .btn { width: 100%; }

      .pod { padding-bottom: 80px; }
    }

    @media (max-width: 480px) {
      .ri-nums { grid-template-columns: 1fr 1fr; }
      .ri-extra { grid-template-columns: 1fr; }
      .dtab-card__head { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
      .dtab-card__amount { margin-left: 0; }
    }

    @media (max-width: 600px) {
      .pod__info-cards { flex-direction: column; }
      .pod__info-card { min-width: unset; }
    }
  `]
})
export class PurchaseOrderDetailComponent implements OnInit {
  private orderService = inject(PurchaseOrderService);
  private branchService = inject(BranchService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  readonly ivaRetentionOptions: SelectOption[] = IVA_RETENTION_CODES.map(c => ({ value: c.codigoRetencion, label: c.label }));
  readonly rentaRetentionOptions: SelectOption[] = RENTA_RETENTION_CODES.map(c => ({ value: c.codigoRetencion, label: c.label }));
  readonly codSustentoOptions = COD_SUSTENTO_OPTIONS;
  readonly pagoLocExtOptions = PAGO_LOC_EXT_OPTIONS;
  readonly paymentMethodOptions: SelectOption[] = PAYMENT_METHODS.map(p => ({ value: p.value, label: p.label }));

  // ── State ──────────────────────────────────────────────────────────────────
  isLoading = signal(true);
  error = signal<string | null>(null);
  order = signal<PurchaseOrder | null>(null);
  detailTab = signal<'receipts' | 'retentions' | 'payments'>('receipts');

  isActioning = signal(false);
  isApproveModalOpen = signal(false);
  isCancelModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isDeletePaymentModalOpen = signal(false);
  isDeleteRetentionModalOpen = signal(false);
  pendingDeletePaymentId = signal('');
  pendingDeleteRetentionId = signal('');
  isReceiptDrawerOpen = signal(false);
  isRetentionModalOpen = signal(false);
  isPaymentModalOpen = signal(false);
  isXmlPreviewOpen = signal(false);
  xmlPreviewContent = signal('');

  receiptOptions = computed(() =>
    (this.order()?.receipts ?? []).map(r => ({
      value: r.id,
      label: `${r.supplierInvoiceNumber} (${r.supplierInvoiceDate})`,
    }))
  );

  // ── Receipt form ───────────────────────────────────────────────────────────
  warehouses = signal<{ id: string; name: string; hasLocations: boolean }[]>([]);
  warehouseLocations = signal<{ id: string; name: string; code: string }[]>([]);
  warehouseOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Seleccionar bodega...' },
    ...this.warehouses().map(w => ({ value: w.id, label: w.name })),
  ]);
  locationOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Sin ubicación' },
    ...this.warehouseLocations().map(l => ({ value: l.id, label: l.name + (l.code ? ` (${l.code})` : '') })),
  ]);

  receiptForm: {
    warehouseId: string;
    defaultLocationId: string;
    supplierInvoiceNumber: string;
    supplierInvoiceDate: string;
    sriAuthorizationNumber: string;
    notes: string;
    items: ReceiptFormItem[];
  } = {
    warehouseId: '',
    defaultLocationId: '',
    supplierInvoiceNumber: '',
    supplierInvoiceDate: '',
    sriAuthorizationNumber: '',
    notes: '',
    items: [],
  };

  // ── Retention form ─────────────────────────────────────────────────────────
  retentionForm: {
    receiptId: string;
    retentionNumber: string;
    retentionDate: string;
    codSustento: string;
    pagoLocExt: string;
    notes: string;
    lines: RetentionFormLine[];
  } = {
    receiptId: '',
    retentionNumber: '',
    retentionDate: new Date().toISOString().slice(0, 10),
    codSustento: '01',
    pagoLocExt: '01',
    notes: '',
    lines: [],
  };

  // ── Payment form ───────────────────────────────────────────────────────────
  paymentForm = {
    amount: 0,
    paymentMethod: 'TRANSFERENCIA' as PaymentMethod,
    paymentDate: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID de orden no encontrado');
      this.isLoading.set(false);
      return;
    }
    this.loadOrder(id);
  }

  private loadOrder(id: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.orderService.findOne(id).subscribe({
      next: d => {
        this.order.set(d);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Error al cargar la orden');
        this.isLoading.set(false);
      }
    });
  }

  private reloadOrder() {
    const id = this.order()?.id;
    if (!id) return;
    this.orderService.findOne(id).subscribe({
      next: d => this.order.set(d),
      error: () => this.toastService.error('Error al recargar la orden')
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  goBack() {
    this.router.navigate(['/inventario/ordenes-compra']);
  }

  onEdit() {
    const d = this.order();
    if (d) this.router.navigate(['/inventario/ordenes-compra', d.id, 'editar']);
  }

  onDuplicate() {
    const d = this.order();
    if (!d) return;
    this.isActioning.set(true);
    this.orderService.duplicate(d.id).subscribe({
      next: (newOrder) => {
        this.toastService.success(`Orden ${newOrder.orderNumber} creada como borrador`);
        this.isActioning.set(false);
        this.router.navigate(['/inventario/ordenes-compra', newOrder.id, 'editar']);
      },
      error: () => { this.toastService.error('Error al duplicar la orden'); this.isActioning.set(false); }
    });
  }

  // ── Label helpers ──────────────────────────────────────────────────────────

  orderStatusLabel(status: PurchaseOrderStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  paymentStatusLabel(status: PaymentStatus): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
  }

  paymentConditionLabel(condition: string): string {
    return (PAYMENT_CONDITION_LABELS as any)[condition] ?? condition;
  }

  paymentMethodLabel(method: PaymentMethod): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
  }

  orderBadgeClass(status: PurchaseOrderStatus): string {
    return 'badge-order ' + status.toLowerCase();
  }

  paymentBadgeClass(status: PaymentStatus): string {
    return 'badge-payment ' + status.toLowerCase();
  }

  // ── Warehouse / location helpers ───────────────────────────────────────────

  onWarehouseChange(warehouseId: string) {
    this.receiptForm.warehouseId = warehouseId;
    const wh = this.warehouses().find(w => w.id === warehouseId);
    if (wh?.hasLocations) {
      this.http.get<any>(`${environment.apiUrl}/business/locations?warehouseId=${warehouseId}&limit=50`).subscribe({
        next: (res: any) => {
          const data = res?.data?.data ?? res?.data ?? res ?? [];
          this.warehouseLocations.set(data.filter((l: any) => l.isActive));
        }
      });
    } else {
      this.warehouseLocations.set([]);
    }
  }

  get selectedWarehouseHasLocations(): boolean {
    const wh = this.warehouses().find(w => w.id === this.receiptForm.warehouseId);
    return wh?.hasLocations ?? false;
  }

  // ── Open sub-forms ─────────────────────────────────────────────────────────

  openApproveModal() {
    this.isApproveModalOpen.set(true);
  }

  openReceiptDrawer() {
    const d = this.order();
    if (!d) return;
    this.receiptForm.warehouseId = '';
    this.warehouseLocations.set([]);

    this.http.get<any>(`${environment.apiUrl}/business/warehouses?limit=50`).subscribe({
      next: (res: any) => {
        const data = res?.data?.data ?? res?.data ?? res ?? [];
        this.warehouses.set(data.filter((w: any) => w.isActive));
      }
    });

    this.receiptForm.supplierInvoiceNumber = '';
    this.receiptForm.supplierInvoiceDate = '';
    this.receiptForm.sriAuthorizationNumber = '';
    this.receiptForm.notes = '';
    this.receiptForm.items = (d.items ?? [])
      .filter(item => (item.stockTrackable !== false) && (+item.quantityOrdered - +item.quantityReceived > 0))
      .map(item => ({
        orderItemId: item.id,
        variantId: item.variantId,
        productName: item.productName ?? '',
        variantName: item.variantName ?? '',
        sku: item.sku ?? '',
        unitOfMeasure: item.unitAbbreviation ?? 'UN',
        quantityOrdered: item.quantityOrdered,
        quantityReceived: item.quantityReceived,
        qtyToReceive: item.quantityOrdered - item.quantityReceived,
        unitCost: Number(item.unitCost ?? item.costPrice ?? 0),
        trackLots: item.trackLots ?? false,
        trackExpiry: item.trackExpiry ?? false,
        lotNumber: '',
        expiryDate: '',
        locationId: '',
      }));

    if (this.receiptForm.items.length === 0) {
      this.toastService.error('No hay items pendientes de recepción o ninguno maneja stock.');
      return;
    }
    this.isReceiptDrawerOpen.set(true);
  }

  openRetentionModal() {
    const d = this.order();
    const tipo = (d as any)?.supplierTipoContribuyente;
    const rimpe = (d as any)?.supplierRegimenRimpe;

    const suggestedIvaCodigo = rimpe === 'POPULAR' ? '3' : '9';
    const suggestedRentaCodigo = rimpe === 'POPULAR' ? '' : '303';

    const ivaCode = IVA_RETENTION_CODES.find(c => c.codigoRetencion === suggestedIvaCodigo);
    const rentaCode = RENTA_RETENTION_CODES.find(c => c.codigoRetencion === suggestedRentaCodigo);

    const lines: RetentionFormLine[] = [];
    if (rentaCode) {
      lines.push({
        codigoImpuesto: '1',
        codigoRetencion: rentaCode.codigoRetencion,
        label: `Renta: ${rentaCode.label}`,
        baseImponible: d ? +d.subtotal : 0,
        porcentajeRetener: rentaCode.porcentaje,
        valorRetenido: d ? +(+d.subtotal * rentaCode.porcentaje / 100).toFixed(2) : 0,
      });
    }
    if (ivaCode) {
      lines.push({
        codigoImpuesto: '2',
        codigoRetencion: ivaCode.codigoRetencion,
        label: `IVA: ${ivaCode.label}`,
        baseImponible: d ? +d.totalTaxes || 0 : 0,
        porcentajeRetener: ivaCode.porcentaje,
        valorRetenido: d ? +((+d.totalTaxes || 0) * ivaCode.porcentaje / 100).toFixed(2) : 0,
      });
    }

    const receipts = d?.receipts ?? [];
    this.retentionForm.receiptId = receipts.length > 0 ? receipts[receipts.length - 1].id : '';
    this.retentionForm.retentionNumber = '';
    this.retentionForm.retentionDate = new Date().toISOString().slice(0, 10);
    this.retentionForm.codSustento = '01';
    this.retentionForm.pagoLocExt = '01';
    this.retentionForm.notes = '';
    this.retentionForm.lines = lines;
    this.isRetentionModalOpen.set(true);
  }

  recalcRetentionLine(line: RetentionFormLine) {
    line.valorRetenido = +(line.baseImponible * line.porcentajeRetener / 100).toFixed(2);
  }

  get retentionTotal(): number {
    return this.retentionForm.lines.reduce((sum, l) => sum + l.valorRetenido, 0);
  }

  removeRetentionLine(index: number) {
    this.retentionForm.lines.splice(index, 1);
  }

  addRetentionLine(tipo: '1' | '2') {
    const d = this.order();
    this.retentionForm.lines.push({
      codigoImpuesto: tipo,
      codigoRetencion: '',
      label: tipo === '1' ? 'Renta' : 'IVA',
      baseImponible: tipo === '1' ? (d ? +d.subtotal : 0) : (d ? +d.totalTaxes || 0 : 0),
      porcentajeRetener: 0,
      valorRetenido: 0,
    });
  }

  onRetentionCodeChange(line: RetentionFormLine) {
    const codes = line.codigoImpuesto === '1' ? RENTA_RETENTION_CODES : IVA_RETENTION_CODES;
    const found = codes.find(c => c.codigoRetencion === line.codigoRetencion);
    if (found) {
      line.porcentajeRetener = found.porcentaje;
      line.label = `${line.codigoImpuesto === '1' ? 'Renta' : 'IVA'}: ${found.label}`;
      this.recalcRetentionLine(line);
    }
  }

  openPaymentModal() {
    const d = this.order();
    this.paymentForm.amount = d ? +(+d.total - +d.totalPaid).toFixed(2) : 0;
    this.paymentForm.paymentMethod = 'TRANSFERENCIA';
    this.paymentForm.paymentDate = new Date().toISOString().slice(0, 10);
    this.paymentForm.reference = '';
    this.paymentForm.notes = '';
    this.isPaymentModalOpen.set(true);
  }

  previewRetentionXml(orderId: string, retentionId: string) {
    this.orderService.generateRetentionXml(orderId, retentionId).subscribe({
      next: (res) => {
        this.xmlPreviewContent.set(res.xml);
        this.isXmlPreviewOpen.set(true);
      },
      error: (err: any) => this.toastService.error(err?.error?.message || 'Error al generar XML')
    });
  }

  // ── Submit actions ─────────────────────────────────────────────────────────

  confirmApprove() {
    const id = this.order()?.id; if (!id) return;
    this.isActioning.set(true);
    this.orderService.approve(id).subscribe({
      next: d => {
        this.toastService.success('Orden aprobada');
        this.order.set(d);
        this.isActioning.set(false);
        this.isApproveModalOpen.set(false);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al aprobar');
        this.isActioning.set(false);
      }
    });
  }

  submitReceipt() {
    const id = this.order()?.id; if (!id) return;
    const { supplierInvoiceNumber, supplierInvoiceDate, sriAuthorizationNumber, notes, items } = this.receiptForm;
    if (!supplierInvoiceNumber || !supplierInvoiceDate) {
      this.toastService.error('Completa el número y fecha de factura');
      return;
    }
    if (!this.receiptForm.warehouseId) {
      this.toastService.error('Selecciona una bodega');
      return;
    }
    const payload: RegisterReceiptPayload = {
      warehouseId: this.receiptForm.warehouseId,
      supplierInvoiceNumber,
      supplierInvoiceDate,
      sriAuthorizationNumber: sriAuthorizationNumber || undefined,
      notes: notes || undefined,
      items: items.filter(i => i.qtyToReceive > 0).map(i => ({
        orderItemId: i.orderItemId,
        quantityReceived: i.qtyToReceive,
        unitCost: i.unitCost || undefined,
        lotNumber: i.trackLots && i.lotNumber ? i.lotNumber : undefined,
        expiryDate: i.trackExpiry && i.expiryDate ? i.expiryDate : undefined,
        locationId: i.locationId || this.receiptForm.defaultLocationId || undefined,
      })),
    };
    if (payload.items.length === 0) {
      this.toastService.error('Ingresa al menos una cantidad a recibir');
      return;
    }

    const itemsToReceive = items.filter(i => i.qtyToReceive > 0);
    for (const i of itemsToReceive) {
      if (i.trackLots && !i.lotNumber?.trim()) {
        this.toastService.error(`Ingresa el número de lote para "${i.productName}"`);
        return;
      }
      if (i.trackExpiry && !i.expiryDate) {
        this.toastService.error(`Ingresa la fecha de vencimiento para "${i.productName}"`);
        return;
      }
    }
    this.isActioning.set(true);
    this.orderService.registerReceipt(id, payload).subscribe({
      next: d => {
        this.toastService.success('Recepción registrada. Stock actualizado.');
        this.order.set(d);
        this.isActioning.set(false);
        this.isReceiptDrawerOpen.set(false);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al registrar recepción');
        this.isActioning.set(false);
      }
    });
  }

  submitRetention() {
    const id = this.order()?.id; if (!id) return;
    const f = this.retentionForm;
    if (!f.retentionNumber || !f.retentionDate) {
      this.toastService.error('Completa el número y fecha de retención');
      return;
    }
    if (!f.lines.length) {
      this.toastService.error('Agrega al menos una línea de retención');
      return;
    }
    for (const line of f.lines) {
      if (!line.codigoRetencion) {
        this.toastService.error('Selecciona el código de retención para cada línea');
        return;
      }
    }
    const payload: RegisterRetentionPayload = {
      retentionNumber: f.retentionNumber,
      retentionDate: f.retentionDate,
      receiptId: f.receiptId || undefined,
      codSustento: f.codSustento || undefined,
      pagoLocExt: f.pagoLocExt || undefined,
      lines: f.lines.map(l => ({
        codigoImpuesto: l.codigoImpuesto,
        codigoRetencion: l.codigoRetencion,
        baseImponible: l.baseImponible,
        porcentajeRetener: l.porcentajeRetener,
      })),
      notes: f.notes || undefined,
    };
    this.isActioning.set(true);
    this.orderService.registerRetention(id, payload).subscribe({
      next: () => {
        this.toastService.success('Retención registrada');
        this.reloadOrder();
        this.isActioning.set(false);
        this.isRetentionModalOpen.set(false);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al registrar retención');
        this.isActioning.set(false);
      }
    });
  }

  submitPayment() {
    const id = this.order()?.id; if (!id) return;
    const f = this.paymentForm;
    if (!f.amount || f.amount <= 0) {
      this.toastService.error('Ingresa un monto válido');
      return;
    }
    const payload: RegisterPaymentPayload = {
      amount: f.amount,
      paymentMethod: f.paymentMethod,
      paymentDate: f.paymentDate,
      reference: f.reference || undefined,
      notes: f.notes || undefined,
    };
    this.isActioning.set(true);
    this.orderService.registerPayment(id, payload).subscribe({
      next: () => {
        this.toastService.success('Pago registrado');
        this.reloadOrder();
        this.isActioning.set(false);
        this.isPaymentModalOpen.set(false);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al registrar pago');
        this.isActioning.set(false);
      }
    });
  }

  confirmCancel() {
    const id = this.order()?.id;
    if (!id) return;
    this.isActioning.set(true);
    this.orderService.cancel(id).subscribe({
      next: () => {
        this.toastService.success('Orden anulada');
        this.isActioning.set(false);
        this.isCancelModalOpen.set(false);
        this.goBack();
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al anular');
        this.isActioning.set(false);
      }
    });
  }

  confirmDelete() {
    const id = this.order()?.id;
    if (!id) return;
    this.isActioning.set(true);
    this.orderService.remove(id).subscribe({
      next: () => {
        this.toastService.success('Borrador eliminado');
        this.isActioning.set(false);
        this.isDeleteModalOpen.set(false);
        this.goBack();
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al eliminar');
        this.isActioning.set(false);
      }
    });
  }

  deletePayment(orderId: string, paymentId: string) {
    this.pendingDeletePaymentId.set(paymentId);
    this.isDeletePaymentModalOpen.set(true);
  }

  confirmDeletePayment() {
    const orderId = this.order()?.id;
    const paymentId = this.pendingDeletePaymentId();
    if (!orderId || !paymentId) return;
    this.isActioning.set(true);
    this.orderService.removePayment(orderId, paymentId).subscribe({
      next: () => {
        this.toastService.success('Pago eliminado');
        this.isActioning.set(false);
        this.isDeletePaymentModalOpen.set(false);
        this.reloadOrder();
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al eliminar pago');
        this.isActioning.set(false);
      }
    });
  }

  deleteRetention(orderId: string, retentionId: string) {
    this.pendingDeleteRetentionId.set(retentionId);
    this.isDeleteRetentionModalOpen.set(true);
  }

  confirmDeleteRetention() {
    const orderId = this.order()?.id;
    const retentionId = this.pendingDeleteRetentionId();
    if (!orderId || !retentionId) return;
    this.isActioning.set(true);
    this.orderService.removeRetention(orderId, retentionId).subscribe({
      next: () => {
        this.toastService.success('Retención eliminada');
        this.isActioning.set(false);
        this.isDeleteRetentionModalOpen.set(false);
        this.reloadOrder();
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al eliminar retención');
        this.isActioning.set(false);
      }
    });
  }
}
