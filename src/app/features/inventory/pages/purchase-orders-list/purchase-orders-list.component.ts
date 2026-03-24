import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap, map, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

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

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { DatePickerComponent } from '../../../../shared/components/ui/date-picker/date-picker';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/ui/custom-select/custom-select.component';
import { QueryNodeComponent } from '../../../../core/components/query-node/query-node.component';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { ActionsMenuComponent, ActionItem } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideEye, lucidePencil, lucideTrash2, lucideCheck,
  lucidePackageCheck, lucideX, lucideClipboardList, lucideBuilding2,
  lucideWarehouse, lucideCalendar, lucideHash, lucideBanknote,
  lucideFileText, lucideShieldCheck, lucideChevronRight,
  lucideReceipt, lucideCreditCard, lucideCopy,
} from '@ng-icons/lucide';

// ─── Receipt form model ───────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-purchase-orders-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DrawerComponent, ModalComponent, FormButtonComponent,
    SkeletonComponent, EmptyStateComponent, SpinnerComponent,
    ActionsMenuComponent, NgIconComponent, DatePickerComponent, CustomSelectComponent, DataCardComponent, QueryNodeComponent
  ],
  providers: [
    provideIcons({
      lucidePlus, lucideEye, lucidePencil, lucideTrash2, lucideCheck,
      lucidePackageCheck, lucideX, lucideClipboardList, lucideBuilding2,
      lucideWarehouse, lucideCalendar, lucideHash, lucideBanknote,
      lucideFileText, lucideShieldCheck, lucideChevronRight,
      lucideReceipt, lucideCreditCard, lucideCopy,
    })
  ],
  template: `
    <div class="orders-page">
      <app-page-header
        title="Órdenes de Compra"
        [tabs]="tabs"
        [activeTab]="activeTab()"
        ctaText="Nueva Orden"
        ctaIcon="lucidePlus"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onNew()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar por # orden o proveedor..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="activeFiltersCount()"
        [viewMode]="viewMode()"
        (searchChange)="onSearch($event)"
        (viewModeChange)="viewMode.set($event)"
        (openFilters)="openFiltersDrawer()"
        (clearFilters)="clearAllFilters()"
      ></app-list-toolbar>

      <!-- Branch filter -->
      <div class="toolbar-extras">
        <app-custom-select
          [options]="branchOptions()"
          [value]="filterBranch()"
          (valueChange)="filterBranch.set($event); currentPage.set(1)"
        ></app-custom-select>
      </div>

      <!-- Orders list/grid -->
      <div [ngClass]="viewMode() === 'grid' ? 'orders-grid' : 'orders-list'">
        @if (isLoading()) {
          @for (n of [1,2,3,4,5,6]; track n) {
            @if (viewMode() === 'grid') {
              <div class="data-card skeleton-card">
                <header style="display:flex;justify-content:space-between;margin-bottom:12px">
                  <div style="display:flex;flex-direction:column;gap:6px">
                    <app-skeleton width="110px" height="1rem"></app-skeleton>
                    <app-skeleton width="150px" height="0.8rem"></app-skeleton>
                  </div>
                  <app-skeleton width="28px" height="28px" shape="circle"></app-skeleton>
                </header>
                <div style="display:flex;flex-direction:column;gap:8px">
                  <app-skeleton width="80px" height="1.25rem"></app-skeleton>
                  <div style="display:flex;gap:6px">
                    <app-skeleton width="70px" height="18px" radius="999px"></app-skeleton>
                    <app-skeleton width="60px" height="18px" radius="999px"></app-skeleton>
                  </div>
                </div>
              </div>
            } @else {
              <div class="order-row skeleton-row">
                <app-skeleton width="110px" height="22px" radius="6px"></app-skeleton>
                <div style="flex:1;display:flex;flex-direction:column;gap:4px">
                  <app-skeleton width="180px" height="1rem"></app-skeleton>
                  <app-skeleton width="120px" height="0.8rem"></app-skeleton>
                </div>
                <app-skeleton width="70px" height="22px" radius="6px"></app-skeleton>
                <app-skeleton width="90px" height="1rem"></app-skeleton>
                <app-skeleton width="32px" height="32px" shape="circle"></app-skeleton>
              </div>
            }
          }
        } @else if (orders().length > 0) {
          @for (order of orders(); track order.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                [title]="order.supplierName || 'Proveedor'"
                [status]="orderStatusLabel(order.status)"
                [statusConfig]="order.status === 'RECIBIDA' || order.status === 'CERRADA' ? 'active' : order.status === 'ANULADA' ? 'inactive' : 'warning'"
                [details]="[
                  { icon: 'lucideHash', text: order.orderNumber },
                  { icon: 'lucideBanknote', text: (order.total | currency:'USD':'symbol':'1.2-2') + '' },
                  { icon: 'lucideCalendar', text: (order.createdAt | date:'dd/MM/yy') + '' }
                ]"
                [actions]="getActions(order)"
                (actionClick)="handleAction($event, order)"
                (click)="onViewDetail(order)"
              ></app-data-card>
            } @else {
              <div class="order-row" (click)="onViewDetail(order)">
                <span class="order-number">#{{ order.orderNumber }}</span>
                <div class="order-info">
                  <span class="order-supplier">{{ order.supplierName || 'Proveedor' }}</span>
                  <span class="order-sub">
                    <ng-icon name="lucideWarehouse" size="11"></ng-icon>
                    {{ order.branchName }}
                    &nbsp;·&nbsp;
                    {{ order.itemCount || 0 }} ítem{{ (order.itemCount || 0) !== 1 ? 's' : '' }}
                    &nbsp;·&nbsp;
                    {{ paymentConditionLabel(order.paymentCondition) }}
                  </span>
                </div>
                <div class="order-total">{{ +order.total | currency:'USD':'symbol':'1.2-2' }}</div>
                <span class="badge-payment" [class]="paymentBadgeClass(order.paymentStatus)">
                  {{ paymentStatusLabel(order.paymentStatus) }}
                </span>
                <span class="badge-order" [class]="orderBadgeClass(order.status)">
                  {{ orderStatusLabel(order.status) }}
                </span>
                <span class="order-date">{{ order.createdAt | date:'dd/MM/yy' }}</span>
                <div (click)="$event.stopPropagation()">
                  <app-actions-menu [actions]="getActions(order)" (actionClick)="handleAction($event, order)"></app-actions-menu>
                </div>
              </div>
            }
          }
        } @else {
          <div class="orders-empty">
            <app-empty-state
              icon="lucideClipboardList"
              [title]="searchQuery() ? 'Sin resultados' : 'Sin órdenes de compra'"
              [description]="searchQuery() ? 'Intenta con otros términos.' : 'Crea la primera orden de compra.'"
              [actionLabel]="searchQuery() ? undefined : 'Nueva Orden'"
              (action)="onNew()"
            ></app-empty-state>
          </div>
        }
      </div>

      <app-pagination
        [totalItems]="totalItems()"
        [pageSize]="pageSize()"
        [currentPage]="currentPage()"
        (pageChange)="currentPage.set($event)"
      ></app-pagination>


      <!-- ═══════════════════════════════════════════════════════════════════
           DETAIL DRAWER
      ════════════════════════════════════════════════════════════════════ -->
      <app-drawer [isOpen]="isDetailOpen()" title="Detalle de Orden" (close)="isDetailOpen.set(false)" size="lg">
        <div drawerBody>
          @if (isDetailLoading()) {
            <div style="display:flex;justify-content:center;padding:3rem"><app-spinner></app-spinner></div>
          } @else if (detail()) {
            @let d = detail()!;
            <div class="detail">

              <!-- Header -->
              <div class="detail-head">
                <div class="detail-head__left">
                  <span class="detail-order-number"># {{ d.orderNumber }}</span>
                  <span class="detail-date">{{ d.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <div class="detail-head__badges">
                  <span class="badge-order" [class]="orderBadgeClass(d.status)">{{ orderStatusLabel(d.status) }}</span>
                  <span class="badge-payment" [class]="paymentBadgeClass(d.paymentStatus)">{{ paymentStatusLabel(d.paymentStatus) }}</span>
                </div>
              </div>

              <!-- Meta grid -->
              <div class="detail-meta">
                <div class="meta-item">
                  <ng-icon name="lucideBuilding2" size="15"></ng-icon>
                  <div>
                    <span class="meta-label">Proveedor</span>
                    <span class="meta-value">{{ d.supplierName }}</span>
                    @if (d.supplierRuc) { <span class="meta-sub">RUC: {{ d.supplierRuc }}</span> }
                  </div>
                </div>
                <div class="meta-item">
                  <ng-icon name="lucideWarehouse" size="15"></ng-icon>
                  <div>
                    <span class="meta-label">Sucursal</span>
                    <span class="meta-value">{{ d.branchName }}</span>
                  </div>
                </div>
                <div class="meta-item">
                  <ng-icon name="lucideBanknote" size="15"></ng-icon>
                  <div>
                    <span class="meta-label">Condición de pago</span>
                    <span class="meta-value">{{ paymentConditionLabel(d.paymentCondition) }}</span>
                  </div>
                </div>
                @if (d.expectedDeliveryDate) {
                  <div class="meta-item">
                    <ng-icon name="lucideCalendar" size="15"></ng-icon>
                    <div>
                      <span class="meta-label">Entrega esperada</span>
                      <span class="meta-value">{{ d.expectedDeliveryDate | date:'dd/MM/yyyy' }}</span>
                    </div>
                  </div>
                }
                @if (d.dueDate) {
                  <div class="meta-item">
                    <ng-icon name="lucideCalendar" size="15"></ng-icon>
                    <div>
                      <span class="meta-label">Vencimiento</span>
                      <span class="meta-value">{{ d.dueDate | date:'dd/MM/yyyy' }}</span>
                    </div>
                  </div>
                }
                @if (d.internalNotes) {
                  <div class="meta-item">
                    <ng-icon name="lucideFileText" size="15"></ng-icon>
                    <div>
                      <span class="meta-label">Notas</span>
                      <span class="meta-value">{{ d.internalNotes }}</span>
                    </div>
                  </div>
                }
              </div>

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
                          <td class="r">{{ $any(item).unitOfMeasure ?? 'UN' }}</td>
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
                        <button type="button" class="dtab-card__xml-btn" (click)="previewRetentionXml(d.id, r.id)">Ver XML</button>
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
                      </div>
                    }
                  }
                }
              </div>

            </div>
          }
        </div>

        <!-- Detail footer actions -->
        <div drawerFooter class="drawer-footer-actions">
          @if (detail()) {
            @let s = detail()!.status;
            @if (s === 'BORRADOR') {
              <app-form-button label="Editar" variant="secondary" icon="lucidePencil" (click)="onEdit(detail()!)"></app-form-button>
              <app-form-button label="Aprobar" icon="lucideCheck" [loading]="isActioning()" (click)="openApproveModal()"></app-form-button>
            }
            @if (s === 'APROBADA' || s === 'RECIBIDA_PARCIAL') {
              <app-form-button label="Reg. Recepción" variant="secondary" icon="lucidePackageCheck" (click)="openReceiptDrawer()"></app-form-button>
            }
            @if (s === 'RECIBIDA_PARCIAL' || s === 'RECIBIDA' || s === 'CERRADA') {
              <app-form-button label="Retención" variant="secondary" icon="lucideShieldCheck" (click)="openRetentionModal()"></app-form-button>
              <app-form-button label="Registrar Pago" icon="lucideCreditCard" (click)="openPaymentModal()"></app-form-button>
            }
          }
        </div>
      </app-drawer>


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

          @if (detail()) {
            <div class="payment-balance">
              <div class="pb-row"><span>Total orden</span><span>{{ +detail()!.total | currency:'USD':'symbol':'1.2-2' }}</span></div>
              <div class="pb-row"><span>Pagado</span><span>{{ +detail()!.totalPaid | currency:'USD':'symbol':'1.2-2' }}</span></div>
              <div class="pb-row pb-saldo"><span>Saldo</span><span>{{ (+detail()!.total - +detail()!.totalPaid) | currency:'USD':'symbol':'1.2-2' }}</span></div>
            </div>
          }
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isPaymentModalOpen.set(false)"></app-form-button>
          <app-form-button label="Registrar Pago" icon="lucideCheck" [loading]="isActioning()" (click)="submitPayment()"></app-form-button>
        </div>
      </app-modal>


      <!-- ═══════════════════════════════════════════════════════════════════
           ADVANCED FILTERS DRAWER
      ════════════════════════════════════════════════════════════════════ -->
      <app-drawer [isOpen]="isFiltersOpen()" title="Filtros Avanzados" (close)="isFiltersOpen.set(false)" size="md">
        <div drawerBody>
          <app-query-node
            [node]="$any(filterTreeDraft())"
            [availableFields]="filterConfig"
            [isRoot]="true"
            (nodeChange)="filterTreeDraft.set($any($event))"
          ></app-query-node>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Limpiar" variant="secondary" (click)="clearAllFilters()"></app-form-button>
          <app-form-button label="Aplicar" (click)="applyFilters()"></app-form-button>
        </div>
      </app-drawer>

      <!-- ═══════════════════════════════════════════════════════════════════
           APPROVE / CANCEL / DELETE MODALS
      ════════════════════════════════════════════════════════════════════ -->
      <app-modal [isOpen]="isApproveModalOpen()" title="Aprobar Orden" (close)="isApproveModalOpen.set(false)">
        <div modalBody>
          <p style="margin:0">¿Aprobar la orden <strong>{{ detail()?.orderNumber }}</strong>?<br>Una vez aprobada, ya no podrás editarla.</p>
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isApproveModalOpen.set(false)"></app-form-button>
          <app-form-button label="Aprobar" icon="lucideCheck" [loading]="isActioning()" (click)="confirmApprove()"></app-form-button>
        </div>
      </app-modal>

      <app-modal [isOpen]="isCancelModalOpen()" title="Anular Orden" (close)="isCancelModalOpen.set(false)">
        <div modalBody>¿Anular la orden <strong>{{ detail()?.orderNumber }}</strong>? Esta acción no se puede deshacer.</div>
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

      <!-- XML Preview Modal -->
      <app-modal [isOpen]="isXmlPreviewOpen()" title="XML Comprobante de Retención" (close)="isXmlPreviewOpen.set(false)">
        <div modalBody>
          <pre class="xml-preview">{{ xmlPreviewContent() }}</pre>
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cerrar" variant="secondary" (click)="isXmlPreviewOpen.set(false)"></app-form-button>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    .orders-page { display: flex; flex-direction: column; min-height: 100%; width: 100%; gap: 0; }
    .orders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 0.5rem; }
    .orders-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
    .orders-empty { grid-column: 1 / -1; display: flex; justify-content: center; padding: 4rem 1rem; }
    .skeleton-card { pointer-events: none; background: var(--color-bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border-light); padding: 20px; }

    /* ── Responsive ────────────────────────────────────────────────────── */
    @media (max-width: 480px) {
      .ri-nums { grid-template-columns: 1fr 1fr; }
      .ri-extra { grid-template-columns: 1fr; }
    }

    @media (max-width: 768px) {
      .orders-grid { grid-template-columns: 1fr; gap: 0.75rem; }

      /* Order row → stacked card */
      .order-row {
        flex-wrap: wrap; gap: 0.5rem; padding: 0.75rem;
      }
      .order-number { min-width: unset; }
      .order-info { width: 100%; order: -1; }
      .order-sub { flex-wrap: wrap; }
      .order-total { margin-left: auto; }
      .order-date { width: 100%; text-align: left; margin-top: 0.25rem; }

      /* Detail drawer */
      .detail-meta { grid-template-columns: 1fr; }
      .detail-totals { align-self: stretch; min-width: unset; }

      /* Items table responsive */
      .items-tbl th, .items-tbl td { padding: 0.375rem 0.25rem; font-size: 11px; }

      /* Detail tabs scroll */
      .dtabs-header { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap; }
      .dtab-btn { white-space: nowrap; flex-shrink: 0; padding: 0.5rem 0.625rem; font-size: var(--font-size-xs); }

      /* Retention lines stacked */
      .ret-line { flex-wrap: wrap; gap: 0.375rem; }
      .ret-line__code { min-width: 100%; }
      .ret-line__base { width: 100%; }
      .ret-line__result { text-align: left; }

      /* Footer actions */
      .drawer-footer-actions, .modal-footer-actions {
        flex-direction: column;
      }
      .drawer-footer-actions ::ng-deep .btn,
      .modal-footer-actions ::ng-deep .btn { width: 100%; }

      /* Toolbar extras */
      .toolbar-extras { flex-direction: column; align-items: stretch; }
    }

    @media (max-width: 480px) {
      .order-row { padding: 0.625rem; }
      .detail-head { flex-direction: column; }
      .detail-head__badges { width: 100%; }
      .dtab-card__head { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
      .dtab-card__amount { margin-left: 0; }
      .ri-row { grid-template-columns: 1fr; }
    }

    .toolbar-extras { display: flex; gap: 0.75rem;  padding: 0.5rem 0 0.5rem; flex-wrap: wrap; }
    .select-filter { padding: 0.375rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--color-border-light); background: var(--color-bg-surface); color: var(--color-text-main); font-size: var(--font-size-sm); cursor: pointer; }

    /* Order row */
    .order-row {
      display: flex; align-items: center; gap: 0.875rem; padding: 0.875rem 1.25rem;
      background: var(--color-bg-surface); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-base);
      position: relative;
    }
    .order-row:hover { border-color: var(--color-accent-primary); background: var(--color-bg-hover); }
    .skeleton-row { pointer-events: none; }

    .order-number { font-family: monospace; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-muted); white-space: nowrap; min-width: 110px; }
    .order-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .order-supplier { font-weight: var(--font-weight-semibold); color: var(--color-text-main); font-size: var(--font-size-sm); }
    .order-sub { display: flex; align-items: center; gap: 0.25rem; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .order-total { font-weight: var(--font-weight-semibold); color: var(--color-text-main); white-space: nowrap; font-size: var(--font-size-sm); }
    .order-date { font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }

    /* Status badges */
    .badge-order, .badge-payment {
      padding: 3px 10px; border-radius: 99px; font-size: 11px;
      font-weight: 600; white-space: nowrap; width: fit-content;
    }
    /* Order status colors */
    .badge-order.borrador        { background: var(--color-border-subtle); color: var(--color-text-muted); }
    .badge-order.aprobada        { background: var(--color-info-bg); color: var(--color-info-text); }
    .badge-order.recibida_parcial{ background: var(--color-warning-bg); color: var(--color-warning-text); }
    .badge-order.recibida        { background: var(--color-success-bg); color: var(--color-success-text); }
    .badge-order.cerrada         { background: var(--color-bg-hover); color: var(--color-text-muted); }
    .badge-order.anulada         { background: var(--color-danger-bg); color: var(--color-danger-text); }
    /* Payment status colors */
    .badge-payment.pendiente     { background: var(--color-warning-bg); color: var(--color-warning-text); }
    .badge-payment.pagado_parcial{ background: var(--color-info-bg); color: var(--color-info-text); }
    .badge-payment.pagado        { background: var(--color-success-bg); color: var(--color-success-text); }
    .badge-payment.vencido       { background: var(--color-danger-bg); color: var(--color-danger-text); }

    /* ── Detail drawer ────────────────────────────────────────────────────── */
    .detail { display: flex; flex-direction: column; gap: 1.25rem; }

    .detail-head { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
    .detail-head__left { display: flex; flex-direction: column; gap: 2px; }
    .detail-order-number { font-size: 1.1rem; font-weight: var(--font-weight-bold); color: var(--color-text-main); font-family: monospace; }
    .detail-date { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .detail-head__badges { display: flex; gap: 0.5rem; flex-wrap: wrap; }

    .detail-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; padding: 1rem; background: var(--color-bg-subtle); border-radius: var(--radius-md); }
    .meta-item { display: flex; align-items: flex-start; gap: 0.625rem; color: var(--color-text-muted); }
    .meta-item div { display: flex; flex-direction: column; gap: 1px; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .meta-value { font-size: var(--font-size-sm); color: var(--color-text-main); font-weight: var(--font-weight-medium); }
    .meta-sub { font-size: var(--font-size-xs); color: var(--color-text-muted); font-family: monospace; }

    /* Items table */
    .detail-items { overflow-x: auto; }
    .items-tbl { width: 100%; border-collapse: collapse; font-size: var(--font-size-xs); }
    .items-tbl th { padding: 0.5rem 0.5rem; text-align: left; font-weight: var(--font-weight-semibold); color: var(--color-text-muted); border-bottom: 2px solid var(--color-border-light); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
    .items-tbl td { padding: 0.5rem; border-bottom: 1px solid var(--color-border-subtle); vertical-align: top; }
    .items-tbl tfoot td { border-bottom: none; }
    .r { text-align: right; }
    .fw { font-weight: var(--font-weight-semibold); }
    .itbl-name { display: block; font-weight: var(--font-weight-medium); color: var(--color-text-main); font-size: var(--font-size-sm); }
    .itbl-variant { display: block; color: var(--color-text-muted); }
    .itbl-sku { display: block; color: var(--color-text-muted); font-family: monospace; }
    .qty-partial { color: #ca8a04; font-weight: 600; }
    .qty-full    { color: var(--color-success-text); font-weight: 600; }

    /* Totals */
    .detail-totals { display: flex; flex-direction: column; gap: 0.375rem; padding: 0.875rem 1rem; background: var(--color-bg-subtle); border-radius: var(--radius-md); align-self: flex-end; min-width: 260px; }
    .dt-row { display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .dt-total { font-weight: var(--font-weight-bold); color: var(--color-text-main); font-size: 1rem; border-top: 1px solid var(--color-border-light); padding-top: 0.375rem; margin-top: 0.25rem; }
    .dt-paid { color: var(--color-success-text); }
    .dt-balance { font-weight: var(--font-weight-semibold); color: var(--color-text-main); }

    /* Tabs */
    .detail-tabs { }
    .dtabs-header { display: flex; gap: 0.25rem; border-bottom: 2px solid var(--color-border-light); margin-bottom: 0.75rem; }
    .dtab-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.875rem; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; font-size: var(--font-size-sm); color: var(--color-text-muted); cursor: pointer; transition: all var(--transition-base); border-radius: var(--radius-sm) var(--radius-sm) 0 0; }
    .dtab-btn:hover { background: var(--color-bg-hover); }
    .dtab-btn.active { color: var(--color-accent-primary); border-bottom-color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); }
    .dtab-empty { font-size: var(--font-size-sm); color: var(--color-text-muted); padding: 1rem 0; margin: 0; }
    .dtab-card { padding: 0.75rem; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); margin-bottom: 0.5rem; }
    .dtab-card__head { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.25rem; }
    .dtab-card__title { font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm); color: var(--color-text-main); }
    .dtab-card__date { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .dtab-card__amount { font-weight: var(--font-weight-bold); color: var(--color-text-main); margin-left: auto; }
    .dtab-card__sub { font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0.125rem 0 0; }
    .dtab-card__grid { display: grid; grid-template-columns: 1fr auto; gap: 0.25rem 1rem; font-size: var(--font-size-sm); }
    .badge-partial { padding: 2px 8px; border-radius: 99px; background: var(--color-warning-bg); color: var(--color-warning-text); font-size: 10px; font-weight: 600; }

    /* ── Form shared styles ────────────────────────────────────────────────── */
    .form-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.325rem; }
    .form-group--full { grid-column: 1 / -1; }
    .form-label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-main); }
    .optional { font-weight: 400; color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .form-control { padding: 0.5rem 0.75rem; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); background: var(--color-bg-surface); color: var(--color-text-main); font-size: var(--font-size-sm); width: 100%; box-sizing: border-box; }
    .form-control:focus { outline: none; border-color: var(--color-accent-primary); }
    textarea.form-control { resize: vertical; }
    select.form-control { cursor: pointer; }
    .cell-input { width: 100%; padding: 0.35rem 0.4rem; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: var(--color-bg-surface); color: var(--color-text-main); font-size: var(--font-size-xs); box-sizing: border-box; }
    .num-input { text-align: right; }

    /* Receipt items */
    .receipt-items-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin: 1.25rem 0 0.625rem; }
    .receipt-items { display: flex; flex-direction: column; gap: 0.5rem; }
    .ri-head { display: none; }
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
      background: var(--color-bg-canvas);
      border-radius: var(--radius-sm);
    }
    .ri-extra-field { display: flex; flex-direction: column; gap: 4px; }
    .ri-extra-field label { font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); color: var(--color-text-muted); }

    .form-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; }
    .receipt-items-detail { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-border-subtle); }
    .receipt-item-row { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-xs); color: var(--color-text-muted); flex-wrap: wrap; }
    .receipt-item-qty { font-weight: var(--font-weight-semibold); color: var(--color-text-main); min-width: 50px; }
    .receipt-item-cost { color: var(--color-text-main); font-weight: var(--font-weight-medium); }
    .receipt-item-lot, .receipt-item-expiry { padding: 1px 6px; background: var(--color-bg-canvas); border-radius: var(--radius-sm); font-size: 10px; }
    .badge-partial { padding: 1px 6px; border-radius: 999px; background: var(--color-warning-bg); color: var(--color-warning-text); font-size: 10px; font-weight: var(--font-weight-semibold); }

    .xml-preview {
      background: var(--color-bg-canvas); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); padding: 16px; font-size: 11px;
      font-family: 'SFMono-Regular', Consolas, monospace; color: var(--color-text-main);
      overflow-x: auto; white-space: pre-wrap; word-break: break-all;
      max-height: 60vh; overflow-y: auto; margin: 0; line-height: 1.5;
    }
    .dtab-card__xml-btn {
      display: inline-block; margin-top: 6px; padding: 3px 10px;
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      background: var(--color-bg-surface); color: var(--color-text-muted);
      font-size: 10px; font-family: inherit; cursor: pointer;
      &:hover { border-color: var(--color-accent-primary); color: var(--color-accent-primary); }
    }
    .dtab-card__sri-status {
      display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 999px;
      font-size: 10px; font-weight: var(--font-weight-semibold);
      &.sri-pendiente { background: var(--color-warning-bg); color: var(--color-warning-text); }
      &.sri-generado { background: var(--color-info-bg); color: var(--color-info-text); }
      &.sri-firmado { background: var(--color-info-bg); color: var(--color-info-text); }
      &.sri-enviado { background: rgba(79, 70, 229, 0.08); color: var(--color-accent-primary); }
      &.sri-autorizado { background: var(--color-success-bg); color: var(--color-success-text); }
      &.sri-rechazado { background: var(--color-danger-bg); color: var(--color-danger-text); }
    }

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
      border: 1px dashed var(--color-border-light); background: transparent; padding: 0.25rem 0.75rem;
      border-radius: var(--radius-sm); font-size: var(--font-size-xs); color: var(--color-text-muted);
      cursor: pointer; font-family: inherit;
      &:hover { border-color: var(--color-accent-primary); color: var(--color-accent-primary); }
    }

    /* Retention preview */
    .retention-preview { background: var(--color-bg-subtle); border-radius: var(--radius-md); padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.375rem; }
    .ret-row { display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .ret-total { font-weight: var(--font-weight-semibold); color: var(--color-text-main); border-top: 1px solid var(--color-border-light); padding-top: 0.375rem; }

    /* Payment balance */
    .payment-balance { margin-top: 1rem; padding: 0.75rem 1rem; background: var(--color-bg-subtle); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 0.375rem; }
    .pb-row { display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .pb-saldo { font-weight: var(--font-weight-bold); color: var(--color-text-main); border-top: 1px solid var(--color-border-light); padding-top: 0.375rem; }

    /* Footer */
    .drawer-footer-actions { display: flex; justify-content: flex-end; gap: 0.75rem; width: 100%; flex-wrap: wrap; }
    .modal-footer-actions { display: flex; gap: 1rem; justify-content: flex-end; }
  `]
})
export class PurchaseOrdersListComponent {
  private orderService = inject(PurchaseOrderService);
  private branchService = inject(BranchService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private http = inject(HttpClient);

  readonly ivaRetentionCodes = IVA_RETENTION_CODES;
  readonly rentaRetentionCodes = RENTA_RETENTION_CODES;
  readonly ivaRetentionOptions: SelectOption[] = IVA_RETENTION_CODES.map(c => ({ value: c.codigoRetencion, label: c.label }));
  readonly rentaRetentionOptions: SelectOption[] = RENTA_RETENTION_CODES.map(c => ({ value: c.codigoRetencion, label: c.label }));
  readonly codSustentoOptions = COD_SUSTENTO_OPTIONS;
  readonly pagoLocExtOptions = PAGO_LOC_EXT_OPTIONS;
  readonly paymentMethods = PAYMENT_METHODS;
  readonly paymentMethodOptions: SelectOption[] = PAYMENT_METHODS.map(p => ({ value: p.value, label: p.label }));

  tabs = [
    { label: 'Todas', value: '' },
    { label: 'Borrador', value: 'BORRADOR' },
    { label: 'Aprobada', value: 'APROBADA' },
    { label: 'Rec. Parcial', value: 'RECIBIDA_PARCIAL' },
    { label: 'Recibida', value: 'RECIBIDA' },
    { label: 'Cerrada', value: 'CERRADA' },
    { label: 'Anulada', value: 'ANULADA' },
  ];

  activeTab = signal('');
  searchQuery = signal('');
  viewMode = signal<'grid' | 'list'>('grid');
  filterBranch = signal('');
  currentPage = signal(1);
  pageSize = signal(20);
  refreshTrigger = signal(0);
  isLoading = signal(true);

  // ── Advanced Filters ─────────────────────────────────────────────────
  isFiltersOpen = signal(false);
  private readonly emptyFilter: FilterGroup = { type: 'group', id: 'root', logicalOperator: 'AND', children: [] };
  filterTreeDraft = signal<FilterGroup>(this.emptyFilter);
  appliedFilterTree = signal<FilterGroup>(this.emptyFilter);

  readonly filterConfig: FilterField[] = [
    { id: 'order_number', label: 'N° de Orden', type: 'text' },
    { id: 'total', label: 'Total', type: 'number' },
    { id: 'subtotal', label: 'Subtotal', type: 'number' },
    { id: 'total_paid', label: 'Total Pagado', type: 'number' },
    { id: 'created_at', label: 'Fecha Creación', type: 'date' },
    { id: 'expected_delivery_date', label: 'Fecha Entrega Esperada', type: 'date' },
    { id: 'due_date', label: 'Fecha Vencimiento Pago', type: 'date' },
    {
      id: 'payment_condition', label: 'Condición de Pago', type: 'select', options: [
        { label: 'Contado', value: 'CONTADO' },
        { label: 'Crédito 15 días', value: 'CREDITO_15' },
        { label: 'Crédito 30 días', value: 'CREDITO_30' },
        { label: 'Crédito 60 días', value: 'CREDITO_60' },
        { label: 'Crédito 90 días', value: 'CREDITO_90' },
      ]
    },
    {
      id: 'document_type', label: 'Tipo Documento', type: 'select', options: [
        { label: 'Factura', value: 'FACTURA' },
        { label: 'Liquidación de Compra', value: 'LIQUIDACION_COMPRA' },
      ]
    },
  ];

  activeFiltersCount = computed(() => {
    const count = (node: FilterNode): number => {
      if (node.type === 'group') return (node as FilterGroup).children.reduce((a, c) => a + count(c), 0);
      const rule = node as FilterRule;
      if (['blank', 'notBlank'].includes(rule.operator)) return 1;
      return rule.value && String(rule.value).trim() !== '' ? 1 : 0;
    };
    return count(this.appliedFilterTree());
  });

  isDetailOpen = signal(false);
  isDetailLoading = signal(false);
  detailTab = signal<'receipts' | 'retentions' | 'payments'>('receipts');
  detail = signal<PurchaseOrder | null>(null);

  isActioning = signal(false);
  actionTargetId = signal<string | null>(null);

  isApproveModalOpen = signal(false);
  isCancelModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isReceiptDrawerOpen = signal(false);
  isRetentionModalOpen = signal(false);
  isPaymentModalOpen = signal(false);
  isXmlPreviewOpen = signal(false);
  xmlPreviewContent = signal('');

  // ─── Receipt form ─────────────────────────────────────────────────────────
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

  // ─── Retention form ───────────────────────────────────────────────────────
  retentionForm: {
    retentionNumber: string;
    retentionDate: string;
    codSustento: string;
    pagoLocExt: string;
    notes: string;
    lines: RetentionFormLine[];
  } = {
      retentionNumber: '',
      retentionDate: new Date().toISOString().slice(0, 10),
      codSustento: '01',
      pagoLocExt: '01',
      notes: '',
      lines: [],
    };

  // ─── Payment form ─────────────────────────────────────────────────────────
  paymentForm = {
    amount: 0,
    paymentMethod: 'TRANSFERENCIA' as PaymentMethod,
    paymentDate: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
  };

  // ─── Branches ─────────────────────────────────────────────────────────────
  private branchesResponse = toSignal(
    this.branchService.findAll({ limit: 100 }),
    { initialValue: { data: [] as any[], total: 0 } }
  );
  branches = computed<any[]>(() => (this.branchesResponse() as any)?.data ?? []);
  branchOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Todas las sucursales' },
    ...this.branches().map((b: any) => ({ value: b.id, label: b.name })),
  ]);

  // ─── Orders list reactive ─────────────────────────────────────────────────
  private readonly response = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      status: this.activeTab(),
      branchId: this.filterBranch(),
      filterModel: QueryMapper.toAgGridFilterModel(this.appliedFilterTree(), this.filterConfig),
      refresh: this.refreshTrigger()
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        const { refresh, ...filters } = params;
        return this.orderService.findAll(filters).pipe(tap(() => this.isLoading.set(false)));
      })
    )
  );

  orders = computed(() => this.response()?.data ?? []);
  totalItems = computed(() => this.response()?.total ?? 0);

  // ─── Label helpers ────────────────────────────────────────────────────────

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
    return status.toLowerCase().replace('_', '_');
  }

  paymentBadgeClass(status: PaymentStatus): string {
    return status.toLowerCase().replace('_', '_');
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  getActions(order: PurchaseOrder): ActionItem[] {
    const actions: ActionItem[] = [
      { id: 'view', label: 'Ver detalle', icon: 'lucideEye' }
    ];
    if (order.status === 'BORRADOR') {
      actions.push({ id: 'edit', label: 'Editar', icon: 'lucidePencil' });
      actions.push({ id: 'approve', label: 'Aprobar', icon: 'lucideCheck' });
      actions.push({ id: 'cancel', label: 'Anular', icon: 'lucideX', variant: 'danger' });
      actions.push({ id: 'delete', label: 'Eliminar', icon: 'lucideTrash2', variant: 'danger' });
    }
    if (order.status === 'APROBADA' || order.status === 'RECIBIDA_PARCIAL') {
      actions.push({ id: 'receipt', label: 'Reg. Recepción', icon: 'lucidePackageCheck' });
      actions.push({ id: 'cancel', label: 'Anular', icon: 'lucideX', variant: 'danger' });
    }
    if (order.status === 'RECIBIDA_PARCIAL' || order.status === 'RECIBIDA' || order.status === 'CERRADA') {
      actions.push({ id: 'retention', label: 'Retención', icon: 'lucideShieldCheck' });
      actions.push({ id: 'payment', label: 'Registrar Pago', icon: 'lucideCreditCard' });
    }
    if (order.status !== 'ANULADA') {
      actions.push({ id: 'duplicate', label: 'Duplicar', icon: 'lucideCopy' });
    }
    return actions;
  }

  handleAction(action: ActionItem, order: PurchaseOrder) {
    if (action.id === 'view') { this.onViewDetail(order); return; }
    if (action.id === 'edit') { this.onEdit(order); return; }
    if (action.id === 'duplicate') { this.onDuplicate(order); return; }
    if (action.id === 'cancel') { this.loadDetailThen(order, () => { this.isCancelModalOpen.set(true); }); return; }
    if (action.id === 'delete') { this.loadDetailThen(order, () => { this.isDeleteModalOpen.set(true); }); return; }
    if (action.id === 'approve') { this.loadDetailThen(order, () => this.openApproveModal()); return; }
    if (action.id === 'receipt') { this.loadDetailThen(order, () => this.openReceiptDrawer()); return; }
    if (action.id === 'retention') { this.loadDetailThen(order, () => this.openRetentionModal()); return; }
    if (action.id === 'payment') { this.loadDetailThen(order, () => this.openPaymentModal()); return; }
  }

  /** Carga datos de la OC sin abrir el drawer de detalle, luego ejecuta callback */
  private loadDetailThen(order: PurchaseOrder, callback: () => void) {
    this.orderService.findOne(order.id).subscribe({
      next: d => { this.detail.set(d); callback(); },
      error: () => this.toastService.error('Error al cargar la orden')
    });
  }

  onTabChange(tab: string) { this.activeTab.set(tab); this.currentPage.set(1); }
  onSearch(q: string) { this.searchQuery.set(q); this.currentPage.set(1); }
  openFiltersDrawer() {
    this.filterTreeDraft.set(structuredClone(this.appliedFilterTree()));
    this.isFiltersOpen.set(true);
  }
  applyFilters() {
    this.appliedFilterTree.set(this.filterTreeDraft());
    this.currentPage.set(1);
    this.isFiltersOpen.set(false);
  }
  clearAllFilters() {
    this.filterTreeDraft.set({ ...this.emptyFilter });
    this.appliedFilterTree.set({ ...this.emptyFilter });
    this.searchQuery.set('');
    this.filterBranch.set('');
    this.currentPage.set(1);
    this.isFiltersOpen.set(false);
  }
  onNew() { this.router.navigate(['/inventario/ordenes-compra/nueva']); }
  onEdit(order: PurchaseOrder) { this.router.navigate(['/inventario/ordenes-compra', order.id, 'editar']); }

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

  onDuplicate(order: PurchaseOrder) {
    this.isActioning.set(true);
    this.orderService.duplicate(order.id).subscribe({
      next: (newOrder) => {
        this.toastService.success(`Orden ${newOrder.orderNumber} creada como borrador`);
        this.isActioning.set(false);
        this.refreshTrigger.update(v => v + 1);
        this.router.navigate(['/inventario/ordenes-compra', newOrder.id, 'editar']);
      },
      error: () => { this.toastService.error('Error al duplicar la orden'); this.isActioning.set(false); }
    });
  }

  onViewDetail(order: PurchaseOrder, afterLoad?: () => void) {
    this.isDetailOpen.set(true);
    this.isDetailLoading.set(true);
    this.detail.set(null);
    this.detailTab.set('receipts');
    this.orderService.findOne(order.id).subscribe({
      next: d => {
        this.detail.set(d);
        this.isDetailLoading.set(false);
        afterLoad?.();
      },
      error: () => { this.toastService.error('Error al cargar detalle'); this.isDetailLoading.set(false); }
    });
  }

  // ─── Open sub-forms ───────────────────────────────────────────────────────

  openApproveModal() {
    this.isApproveModalOpen.set(true);
  }

  openReceiptDrawer() {
    const d = this.detail();
    if (!d) return;
    this.receiptForm.warehouseId = '';
    this.warehouseLocations.set([]);

    // Cargar bodegas activas
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
        unitOfMeasure: (item as any).unitOfMeasure ?? 'UN',
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
    const d = this.detail();
    const tipo = (d as any)?.supplierTipoContribuyente;
    const rimpe = (d as any)?.supplierRegimenRimpe;

    // Sugerir códigos según tipo de contribuyente
    const suggestedIvaCodigo = rimpe === 'POPULAR' ? '3' : '9'; // 100% o 30%
    const suggestedRentaCodigo = rimpe === 'POPULAR' ? '' : '303'; // 0% o 2% bienes

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
    const d = this.detail();
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
    const d = this.detail();
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

  // ─── Submit actions ───────────────────────────────────────────────────────

  confirmApprove() {
    const id = this.detail()?.id; if (!id) return;
    this.isActioning.set(true);
    this.orderService.approve(id).subscribe({
      next: d => {
        this.toastService.success('Orden aprobada');
        this.detail.set(d);
        this.refreshTrigger.update(v => v + 1);
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
    const id = this.detail()?.id; if (!id) return;
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

    // Validar lotes y vencimientos requeridos
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
        this.detail.set(d);
        this.refreshTrigger.update(v => v + 1);
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
    const id = this.detail()?.id; if (!id) return;
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
        this.orderService.findOne(id).subscribe(d => this.detail.set(d));
        this.refreshTrigger.update(v => v + 1);
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
    const id = this.detail()?.id; if (!id) return;
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
      next: d => {
        this.toastService.success('Pago registrado');
        this.detail.set(d);
        this.refreshTrigger.update(v => v + 1);
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
    const id = this.actionTargetId() ?? this.detail()?.id;
    if (!id) return;
    this.isActioning.set(true);
    this.orderService.cancel(id).subscribe({
      next: () => {
        this.toastService.success('Orden anulada');
        this.refreshTrigger.update(v => v + 1);
        this.isActioning.set(false);
        this.isCancelModalOpen.set(false);
        this.isDetailOpen.set(false);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al anular');
        this.isActioning.set(false);
      }
    });
  }

  confirmDelete() {
    const id = this.actionTargetId(); if (!id) return;
    this.isActioning.set(true);
    this.orderService.remove(id).subscribe({
      next: () => {
        this.toastService.success('Borrador eliminado');
        this.refreshTrigger.update(v => v + 1);
        this.isActioning.set(false);
        this.isDeleteModalOpen.set(false);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al eliminar');
        this.isActioning.set(false);
      }
    });
  }
}
