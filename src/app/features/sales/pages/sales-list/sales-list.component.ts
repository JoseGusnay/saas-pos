import { Component, computed, DestroyRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SaleService } from '../../../../core/services/sale.service';
import { FiscalService } from '../../../../core/services/fiscal.service';
import { BranchService } from '../../../../core/services/branch.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  SaleListItem,
  Sale,
  SaleStatus,
  PaymentMethod,
  PAYMENT_METHODS,
  CancelSalePayload,
} from '../../../../core/models/sale.models';
import { ElectronicDocument } from '../../../../core/models/fiscal.models';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { ActionsMenuComponent, ActionItem } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/ui/custom-select/custom-select.component';
import { QueryNodeComponent } from '../../../../core/components/query-node/query-node.component';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideReceipt, lucideHash, lucideBanknote, lucideCalendar, lucideUser,
  lucideBuilding2, lucideEye, lucideX, lucideDownload, lucideFileCheck,
  lucideAlertCircle, lucideClock, lucideLoader, lucideShoppingBag,
} from '@ng-icons/lucide';

@Component({
  selector: 'app-sales-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent, DataCardComponent,
    DrawerComponent, ModalComponent, FormButtonComponent,
    SkeletonComponent, EmptyStateComponent, SpinnerComponent,
    ActionsMenuComponent, NgIconComponent, CustomSelectComponent, QueryNodeComponent,
  ],
  providers: [
    provideIcons({
      lucideReceipt, lucideHash, lucideBanknote, lucideCalendar, lucideUser,
      lucideBuilding2, lucideEye, lucideX, lucideDownload, lucideFileCheck,
      lucideAlertCircle, lucideClock, lucideLoader, lucideShoppingBag,
    }),
  ],
  styleUrl: './sales-list.component.scss',
  template: `
    <div class="page-shell">
    <div class="sales-page">
      <app-page-header
        title="Historial de Ventas"
        [tabs]="tabs"
        [activeTab]="activeTab()"
        (tabChange)="onTabChange($event)"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar por # venta, cliente o identificación..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="activeFiltersCount()"
        [viewMode]="viewMode()"
        (searchChange)="onSearch($event)"
        (viewModeChange)="viewMode.set($event)"
        (openFilters)="openFiltersDrawer()"
        (clearFilters)="clearAllFilters()"
      ></app-list-toolbar>

      <!-- Toolbar extras: branch filter + sort -->
      <div class="toolbar-extras">
        <div class="toolbar-filter">
          <ng-icon name="lucideBuilding2" size="14"></ng-icon>
          <span class="toolbar-filter__label">Sucursal</span>
          <app-custom-select
            size="sm"
            [options]="branchOptions()"
            [value]="filterBranch()"
            (valueChange)="filterBranch.set($event); currentPage.set(1)"
          ></app-custom-select>
        </div>
        <div class="toolbar-filter">
          <ng-icon name="lucideCalendar" size="14"></ng-icon>
          <span class="toolbar-filter__label">Ordenar</span>
          <app-custom-select
            size="sm"
            [options]="sortOptions"
            [value]="sortBy()"
            (valueChange)="onSortChange($event)"
          ></app-custom-select>
        </div>
      </div>

      <!-- Sales list/grid -->
      <div [ngClass]="viewMode() === 'grid' ? 'sales-grid' : 'sales-list'">
        @if (isLoading()) {
          @for (n of skeletonArray(); track n) {
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
              <div class="sale-row skeleton-row">
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
        } @else if (sales().length > 0) {
          @for (sale of sales(); track sale.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                [title]="sale.saleNumber"
                [status]="statusLabel(sale.status)"
                [statusConfig]="sale.status === 'COMPLETADA' ? 'active' : 'inactive'"
                [details]="[
                  { icon: 'lucideHash', text: sale.saleNumber },
                  { icon: 'lucideBanknote', text: (sale.total | currency:'USD':'symbol':'1.2-2') + '' },
                  { icon: 'lucideCalendar', text: (sale.createdAt | date:'dd/MM/yyyy') + '' },
                  { icon: 'lucideUser', text: sale.customerName }
                ]"
                [actions]="getActions(sale)"
                (actionClick)="handleAction($event, sale)"
                (click)="onViewDetail(sale)"
              ></app-data-card>
            } @else {
              <div class="sale-row" (click)="onViewDetail(sale)">
                <span class="sale-number">#{{ sale.saleNumber }}</span>
                <div class="sale-info">
                  <span class="sale-customer">{{ sale.customerName }}</span>
                  <span class="sale-sub">
                    <ng-icon name="lucideBuilding2" size="11"></ng-icon>
                    {{ sale.branchName }}
                    &nbsp;·&nbsp;
                    {{ sale.itemCount || 0 }} ítem{{ (sale.itemCount || 0) !== 1 ? 's' : '' }}
                  </span>
                </div>
                <div class="sale-total">{{ +sale.total | currency:'USD':'symbol':'1.2-2' }}</div>
                <span [class]="getInvoiceBadgeClass(sale.invoiceStatus)">
                  {{ invoiceStatusLabel(sale.invoiceStatus) }}
                </span>
                <span [class]="statusBadgeClass(sale.status)">
                  {{ statusLabel(sale.status) }}
                </span>
                <span class="sale-date">{{ sale.createdAt | date:'dd/MM/yyyy' }}</span>
                <div (click)="$event.stopPropagation()">
                  <app-actions-menu [actions]="getActions(sale)" (actionClick)="handleAction($event, sale)"></app-actions-menu>
                </div>
              </div>
            }
          }
        } @else {
          <div class="sales-empty">
            <app-empty-state
              icon="lucideReceipt"
              [title]="searchQuery() ? 'Sin resultados' : 'Sin ventas'"
              [description]="searchQuery() ? 'Intenta con otros términos de búsqueda.' : 'No hay ventas registradas.'"
              [actionLabel]="searchQuery() ? 'Limpiar búsqueda' : ''"
              (action)="searchQuery() ? clearAllFilters() : null"
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
           DETAIL DRAWER
      ════════════════════════════════════════════════════════════════════ -->
      <app-drawer [isOpen]="isDetailOpen()" title="Detalle de Venta" (close)="isDetailOpen.set(false)" size="lg">
        <div drawerBody>
          @if (isDetailLoading()) {
            <div style="display:flex;justify-content:center;padding:3rem"><app-spinner></app-spinner></div>
          } @else if (detail()) {
            @let d = detail()!;
            <div class="detail">

              <!-- Header -->
              <div class="detail-head">
                <div class="detail-head__left">
                  <span class="detail-sale-number"># {{ d.saleNumber }}</span>
                  <span class="detail-date">{{ d.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <div class="detail-head__badges">
                  <span [class]="statusBadgeClass(d.status)">{{ statusLabel(d.status) }}</span>
                </div>
              </div>

              <!-- Meta grid -->
              <div class="detail-meta">
                <div class="meta-item">
                  <ng-icon name="lucideUser" size="15"></ng-icon>
                  <div>
                    <span class="meta-label">Cliente</span>
                    <span class="meta-value">{{ d.customerName }}</span>
                    @if (d.customerIdentificacion) { <span class="meta-sub">{{ d.customerTipoIdentificacion }}: {{ d.customerIdentificacion }}</span> }
                  </div>
                </div>
                <div class="meta-item">
                  <ng-icon name="lucideBuilding2" size="15"></ng-icon>
                  <div>
                    <span class="meta-label">Sucursal</span>
                    <span class="meta-value">{{ d.branchId }}</span>
                  </div>
                </div>
                <div class="meta-item">
                  <ng-icon name="lucideShoppingBag" size="15"></ng-icon>
                  <div>
                    <span class="meta-label">Bodega</span>
                    <span class="meta-value">{{ d.warehouseId }}</span>
                  </div>
                </div>
                @if (d.userName) {
                  <div class="meta-item">
                    <ng-icon name="lucideUser" size="15"></ng-icon>
                    <div>
                      <span class="meta-label">Usuario</span>
                      <span class="meta-value">{{ d.userName }}</span>
                    </div>
                  </div>
                }
              </div>

              <!-- Items table -->
              @if (d.items.length > 0) {
                <div class="detail-items">
                  <table class="items-tbl">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th class="r">Cant.</th>
                        <th class="r">P. Unit.</th>
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
                          <td class="r">{{ item.quantity }}</td>
                          <td class="r">{{ +item.unitPrice | currency:'USD':'symbol':'1.2-2' }}</td>
                          <td class="r">{{ item.discountPercent }}%</td>
                          <td class="r">{{ +item.totalTaxes | currency:'USD':'symbol':'1.2-2' }}</td>
                          <td class="r fw">{{ +item.lineTotal | currency:'USD':'symbol':'1.2-2' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }

              <!-- Totals summary -->
              <div class="detail-totals">
                <div class="dt-row"><span>Subtotal</span><span>{{ +d.subtotal | currency:'USD':'symbol':'1.2-2' }}</span></div>
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
              </div>

              <!-- Payments section -->
              @if (d.payments.length > 0) {
                <div class="detail-payments">
                  <h4 class="detail-section-title">
                    <ng-icon name="lucideBanknote" size="15"></ng-icon>
                    Pagos
                  </h4>
                  @for (payment of d.payments; track payment.id) {
                    <div class="payment-row">
                      <span class="payment-method">{{ paymentMethodLabel(payment.paymentMethod) }}</span>
                      <span class="payment-amount">{{ +payment.amount | currency:'USD':'symbol':'1.2-2' }}</span>
                      @if (payment.reference) {
                        <span class="payment-ref">Ref: {{ payment.reference }}</span>
                      }
                    </div>
                  }
                  @if (+d.change > 0) {
                    <div class="payment-row payment-change">
                      <span class="payment-method">Cambio</span>
                      <span class="payment-amount">{{ +d.change | currency:'USD':'symbol':'1.2-2' }}</span>
                    </div>
                  }
                </div>
              }

              <!-- Invoice section -->
              @if (getMatchingListItem(d.id); as matchedSale) {
                @if (matchedSale.invoiceStatus) {
                  <div class="detail-invoice">
                    <h4 class="detail-section-title">
                      <ng-icon name="lucideFileCheck" size="15"></ng-icon>
                      Factura Electrónica
                    </h4>
                    @if (matchedSale.invoiceClaveAcceso) {
                      <div class="invoice-info">
                        <span class="invoice-number">Clave: {{ matchedSale.invoiceClaveAcceso }}</span>
                        <span [class]="getInvoiceBadgeClass(matchedSale.invoiceStatus)">{{ invoiceStatusLabel(matchedSale.invoiceStatus) }}</span>
                      </div>
                    }
                    <button class="btn-download-ride" (click)="downloadRide()">
                      <ng-icon name="lucideDownload" size="14"></ng-icon>
                      Descargar RIDE
                    </button>
                  </div>
                }
              }

              <!-- Notes section -->
              @if (d.notes) {
                <div class="detail-notes">
                  <h4 class="detail-section-title">Notas</h4>
                  <p class="notes-text">{{ d.notes }}</p>
                </div>
              }

              <!-- Cancellation info -->
              @if (d.status === 'ANULADA') {
                <div class="detail-cancellation">
                  <h4 class="detail-section-title">
                    <ng-icon name="lucideAlertCircle" size="15"></ng-icon>
                    Información de Anulación
                  </h4>
                  <div class="cancellation-info">
                    @if (d.cancellationReason) { <p><strong>Motivo:</strong> {{ d.cancellationReason }}</p> }
                    @if (d.cancelledByName) { <p><strong>Anulado por:</strong> {{ d.cancelledByName }}</p> }
                    @if (d.cancelledAt) { <p><strong>Fecha:</strong> {{ d.cancelledAt | date:'dd/MM/yyyy HH:mm' }}</p> }
                  </div>
                </div>
              }

              <!-- Cancel button -->
              @if (d.status === 'COMPLETADA') {
                <div class="detail-actions">
                  <app-form-button
                    label="Anular Venta"
                    variant="danger"
                    icon="lucideX"
                    (click)="cancelReason = ''; isCancelModalOpen.set(true)"
                  ></app-form-button>
                </div>
              }

            </div>
          }
        </div>
      </app-drawer>

      <!-- ═══════════════════════════════════════════════════════════════════
           CANCEL MODAL
      ════════════════════════════════════════════════════════════════════ -->
      <app-modal [isOpen]="isCancelModalOpen()" title="Anular Venta" (close)="isCancelModalOpen.set(false)">
        <div modalBody>
          <p style="margin:0 0 1rem">¿Anular la venta <strong>{{ detail()?.saleNumber }}</strong>? Esta acción no se puede deshacer.</p>
          <div class="form-group">
            <label class="form-label">Motivo de anulación *</label>
            <textarea class="form-control" rows="3" [(ngModel)]="cancelReason" placeholder="Ingresa el motivo de la anulación..."></textarea>
          </div>
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isCancelModalOpen.set(false)"></app-form-button>
          <app-form-button label="Anular Venta" variant="danger" icon="lucideX" [loading]="isActioning()" (click)="confirmCancel()"></app-form-button>
        </div>
      </app-modal>

    </div>
    </div>
  `,
})
export class SalesListComponent {
  private saleService = inject(SaleService);
  private fiscalService = inject(FiscalService);
  private branchService = inject(BranchService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  tabs = [
    { label: 'Todas', value: '' },
    { label: 'Completada', value: 'COMPLETADA' },
    { label: 'Anulada', value: 'ANULADA' },
  ];

  // ─── Sort options ─────────────────────────────────────────────────────────
  sortOptions: SelectOption[] = [
    { value: 'recent', label: 'Más Recientes' },
    { value: 'oldest', label: 'Más Antiguos' },
    { value: 'total_desc', label: 'Mayor Total' },
    { value: 'total_asc', label: 'Menor Total' },
    { value: 'customer_asc', label: 'Cliente (A-Z)' },
  ];

  // ─── State ────────────────────────────────────────────────────────────────
  activeTab = signal('');
  searchQuery = signal('');
  viewMode = signal<'grid' | 'list'>('grid');
  filterBranch = signal('');
  sortBy = signal('recent');
  currentPage = signal(1);
  pageSize = signal(20);
  isLoading = signal(true);
  refreshTrigger = signal(0);

  skeletonArray = computed(() =>
    Array.from({ length: Math.min(this.pageSize(), this.viewMode() === 'grid' ? 12 : 10) }, (_, i) => i + 1)
  );

  // ─── Advanced Filters ─────────────────────────────────────────────────────
  isFiltersOpen = signal(false);
  private readonly emptyFilter: FilterGroup = { type: 'group', id: 'root', logicalOperator: 'AND', children: [] };
  filterTreeDraft = signal<FilterGroup>(this.emptyFilter);
  appliedFilterTree = signal<FilterGroup>(this.emptyFilter);

  readonly filterConfig: FilterField[] = [
    { id: 'sale_number', label: 'N° de Venta', type: 'text' },
    { id: 'customer_name', label: 'Cliente', type: 'text' },
    { id: 'customer_identificacion', label: 'Identificación', type: 'text' },
    { id: 'total', label: 'Total', type: 'number' },
    { id: 'subtotal', label: 'Subtotal', type: 'number' },
    { id: 'total_taxes', label: 'Impuestos', type: 'number' },
    { id: 'total_discount', label: 'Descuento', type: 'number' },
    { id: 'created_at', label: 'Fecha', type: 'date' },
    { id: 'user_name', label: 'Usuario', type: 'text' },
    {
      id: 'status', label: 'Estado', type: 'select', options: [
        { label: 'Completada', value: 'COMPLETADA' },
        { label: 'Anulada', value: 'ANULADA' },
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

  // ─── Detail state ─────────────────────────────────────────────────────────
  isDetailOpen = signal(false);
  isDetailLoading = signal(false);
  detail = signal<Sale | null>(null);

  // ─── Cancel modal state ───────────────────────────────────────────────────
  isCancelModalOpen = signal(false);
  cancelReason = '';
  isActioning = signal(false);

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

  // ─── Sort mapping ────────────────────────────────────────────────────────
  private sortMapping: Record<string, { sortField: string; sortOrder: 'ASC' | 'DESC' }> = {
    recent: { sortField: 'createdAt', sortOrder: 'DESC' },
    oldest: { sortField: 'createdAt', sortOrder: 'ASC' },
    total_desc: { sortField: 'total', sortOrder: 'DESC' },
    total_asc: { sortField: 'total', sortOrder: 'ASC' },
    customer_asc: { sortField: 'customerName', sortOrder: 'ASC' },
  };

  // ─── Sales list reactive ─────────────────────────────────────────────────
  private readonly response = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      status: this.activeTab() as SaleStatus | '',
      branchId: this.filterBranch(),
      sort: this.sortBy(),
      filterModel: QueryMapper.toAgGridFilterModel(this.appliedFilterTree(), this.filterConfig),
      refresh: this.refreshTrigger(),
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        const { refresh, sort, filterModel, ...filters } = params;
        const sortConfig = this.sortMapping[sort] ?? this.sortMapping['recent'];
        return this.saleService.findAll({
          ...filters,
          status: filters.status || undefined,
          branchId: filters.branchId || undefined,
          search: filters.search || undefined,
          sortField: sortConfig.sortField,
          sortOrder: sortConfig.sortOrder,
          filterModel,
        }).pipe(tap(() => this.isLoading.set(false)));
      }),
    ),
  );

  sales = computed(() => this.response()?.data ?? []);
  totalItems = computed(() => this.response()?.total ?? 0);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  statusLabel(status: SaleStatus): string {
    return status === 'COMPLETADA' ? 'Completada' : status === 'ANULADA' ? 'Anulada' : status;
  }

  statusBadgeClass(status: SaleStatus): string {
    return 'badge-status badge-status--' + status.toLowerCase();
  }

  getInvoiceBadgeClass(invoiceStatus: string | null): string {
    if (!invoiceStatus) return 'badge-invoice badge-invoice--none';
    if (invoiceStatus === 'AUTORIZADO') return 'badge-invoice badge-invoice--ok';
    if (invoiceStatus === 'RECHAZADO') return 'badge-invoice badge-invoice--error';
    return 'badge-invoice badge-invoice--pending';
  }

  invoiceStatusLabel(invoiceStatus: string | null): string {
    if (!invoiceStatus) return 'Sin factura';
    if (invoiceStatus === 'AUTORIZADO') return 'Autorizado';
    if (invoiceStatus === 'RECHAZADO') return 'Rechazado';
    return invoiceStatus;
  }

  paymentMethodLabel(method: PaymentMethod): string {
    return PAYMENT_METHODS.find(p => p.value === method)?.label ?? method;
  }

  getMatchingListItem(saleId: string): SaleListItem | undefined {
    return this.sales().find(s => s.id === saleId);
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  getActions(sale: SaleListItem): ActionItem[] {
    const actions: ActionItem[] = [
      { id: 'view', label: 'Ver detalle', icon: 'lucideEye' },
    ];
    if (sale.status === 'COMPLETADA') {
      actions.push({ id: 'cancel', label: 'Anular venta', icon: 'lucideX', variant: 'danger' });
    }
    return actions;
  }

  handleAction(action: ActionItem, sale: SaleListItem) {
    if (action.id === 'view') {
      this.onViewDetail(sale);
      return;
    }
    if (action.id === 'cancel') {
      this.loadDetailThen(sale, () => {
        this.cancelReason = '';
        this.isCancelModalOpen.set(true);
      });
      return;
    }
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  onTabChange(tab: string) {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  onSearch(q: string) {
    this.searchQuery.set(q);
    this.currentPage.set(1);
  }

  onSortChange(value: string) {
    this.sortBy.set(value);
    this.currentPage.set(1);
  }

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
    this.searchQuery.set('');
    this.filterBranch.set('');
    this.sortBy.set('recent');
    this.appliedFilterTree.set({ ...this.emptyFilter, children: [] });
    this.filterTreeDraft.set({ ...this.emptyFilter, children: [] });
    this.isFiltersOpen.set(false);
    this.currentPage.set(1);
  }

  onViewDetail(sale: SaleListItem) {
    this.isDetailOpen.set(true);
    this.isDetailLoading.set(true);
    this.saleService.findOne(sale.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: d => {
        this.detail.set(d);
        this.isDetailLoading.set(false);
      },
      error: () => {
        this.toastService.error('Error al cargar la venta');
        this.isDetailLoading.set(false);
      },
    });
  }

  private loadDetailThen(sale: SaleListItem, callback: () => void) {
    this.saleService.findOne(sale.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: d => {
        this.detail.set(d);
        callback();
      },
      error: () => this.toastService.error('Error al cargar la venta'),
    });
  }

  // ─── Cancel sale ──────────────────────────────────────────────────────────

  confirmCancel() {
    const d = this.detail();
    if (!d || !this.cancelReason.trim()) {
      this.toastService.error('Ingresa el motivo de anulación');
      return;
    }
    this.isActioning.set(true);
    const payload: CancelSalePayload = { reason: this.cancelReason.trim() };
    this.saleService.cancel(d.id, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toastService.success(`Venta ${d.saleNumber} anulada`);
        this.isActioning.set(false);
        this.isCancelModalOpen.set(false);
        this.isDetailOpen.set(false);
        this.refreshTrigger.update(v => v + 1);
      },
      error: () => {
        this.toastService.error('Error al anular la venta');
        this.isActioning.set(false);
      },
    });
  }

  // ─── Download RIDE ────────────────────────────────────────────────────────

  downloadRide() {
    const d = this.detail();
    if (!d) return;

    // The sale detail doesn't contain edoc directly; we need the invoice claveAcceso
    // We'll use the fiscal service to download by the electronic document ID
    // For now, we look at the sale's invoice info from the list item
    // The detail Sale model doesn't have edoc info, so we use a workaround:
    // find the matching list item to get invoiceClaveAcceso
    const listItem = this.sales().find(s => s.id === d.id);
    if (!listItem?.invoiceEdocId) {
      this.toastService.error('No se encontró el comprobante electrónico');
      return;
    }

    this.toastService.info('Descargando RIDE...');
    this.fiscalService.downloadRide(listItem.invoiceEdocId).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RIDE-${d.saleNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toastService.error('Error al descargar el RIDE'),
    });
  }
}
