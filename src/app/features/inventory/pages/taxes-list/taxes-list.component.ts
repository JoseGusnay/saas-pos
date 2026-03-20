import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus,
  lucideSearch,
  lucideLayoutGrid,
  lucideList,
  lucideFilter,
  lucideMoreVertical,
  lucidePencil,
  lucideTrash2,
  lucideHistory,
  lucideInbox,
  lucideSave,
  lucideX,
  lucideChevronRight,
  lucidePercent,
  lucideInfo,
  lucideTag,
  lucidePlusCircle,
  lucideRefreshCw,
  lucideTrash,
  lucideHash
} from '@ng-icons/lucide';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { ActionsMenuComponent, ActionItem } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { DatelineComponent, DatelineItem } from '../../../../shared/components/ui/dateline/dateline.component';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';

import { TaxService } from '../../../../core/services/tax.service';
import { Tax } from '../../../../core/models/tax.models';
import { ToastService } from '../../../../core/services/toast.service';
import { ModalService } from '../../../../core/components/modal/modal.service';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap, tap } from 'rxjs';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';

import { TaxesAdvancedFilters } from './components/taxes-advanced-filters/taxes-advanced-filters';
import { TaxFormComponent } from './components/tax-form/tax-form.component';

@Component({
  selector: 'app-taxes-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIconComponent,
    TaxFormComponent,
    SkeletonComponent,
    PageHeaderComponent,
    ListToolbarComponent,
    DataCardComponent,
    ActionsMenuComponent,
    EmptyStateComponent,
    DrawerComponent,
    ModalComponent,
    PaginationComponent,
    SpinnerComponent,
    DatelineComponent,
    FormButtonComponent
  ],
  providers: [
    provideIcons({
      lucidePlus, lucideSearch, lucideLayoutGrid, lucideList,
      lucideFilter, lucideMoreVertical, lucidePencil, lucideTrash2,
      lucideHistory, lucideChevronRight, lucidePercent, lucideInfo, lucideTag,
      lucidePlusCircle, lucideRefreshCw, lucideTrash, lucideHash
    })
  ],
  template: `
    <div class="taxes-page">
      <app-page-header
        title="Impuestos"
        [tabs]="taxTabs"
        [activeTab]="activeTab()"
        ctaText="Nuevo Impuesto"
        ctaIcon="lucidePlus"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAddTax()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar impuestos..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="activeFiltersCount()"
        [viewMode]="viewModePreference()"
        (openFilters)="openAdvancedFilters()"
        (clearFilters)="clearAllFilters()"
        (searchChange)="onSearch($event)"
        (viewModeChange)="viewModePreference.set($event)"
        (sortChange)="onSortChange($event)"
      ></app-list-toolbar>

      <div [ngClass]="viewMode() === 'grid' ? 'taxes-page__grid' : 'taxes-page__list'">
        @if (isLoading()) {
          @for (i of [1,2,3,4,5,6]; track i) {
            @if (viewMode() === 'grid') {
              <div class="data-card skeleton-card">
                <header class="data-card__header">
                  <div class="data-card__title-container">
                    <app-skeleton width="140px" height="1.25rem"></app-skeleton>
                    <div style="margin-top: 4px">
                      <app-skeleton width="60px" height="18px" radius="999px"></app-skeleton>
                    </div>
                  </div>
                  <div class="data-card__kebab">
                    <app-skeleton width="32px" height="32px" shape="circle"></app-skeleton>
                  </div>
                </header>
                <div class="data-card__body">
                  <div class="data-card__detail">
                    <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
                    <app-skeleton width="160px" height="0.875rem"></app-skeleton>
                  </div>
                </div>
              </div>
            } @else {
              <div class="tax-row-item skeleton-row">
                <div class="row-main">
                  <app-skeleton width="44px" height="44px" radius="12px"></app-skeleton>
                  <div class="tax-info">
                    <app-skeleton width="140px" height="1rem"></app-skeleton>
                    <app-skeleton width="80px" height="0.875rem" style="margin-top: 4px"></app-skeleton>
                  </div>
                </div>
                <div class="row-col">
                  <app-skeleton width="60px" height="10px" style="margin-bottom: 4px"></app-skeleton>
                  <app-skeleton width="80px" height="13px"></app-skeleton>
                </div>
                <div class="row-col">
                  <app-skeleton width="50px" height="24px" radius="99px"></app-skeleton>
                </div>
                <div class="row-col">
                  <app-skeleton width="70px" height="24px" radius="99px"></app-skeleton>
                </div>
                <div>
                  <app-skeleton width="32px" height="32px" shape="circle"></app-skeleton>
                </div>
              </div>
            }
          }
        } @else if (taxes().length > 0) {
          @if (viewMode() === 'grid') {
            @for (tax of taxes(); track tax.id) {
              <app-data-card
                [title]="tax.name"
                [status]="tax.isActive ? 'Activo' : 'Inactivo'"
                [statusConfig]="tax.isActive ? 'active' : 'inactive'"
                [details]="[
                  { icon: 'lucideHash', text: tax.code + (tax.sriCode ? ' · SRI: ' + tax.sriCode : '') },
                  { icon: 'lucidePercent', text: tax.type === 'PERCENTAGE' ? (tax.percentage ?? 0) + '%' : '$ ' + (tax.fixedAmount) }
                ]"
                [actions]="taxActions"
                (actionClick)="handleActionClick($event, tax)"
                (click)="onShowDetail(tax)"
              >
              </app-data-card>
            }
          } @else {
            @for (tax of taxes(); track tax.id) {
              <div class="tax-row-item" (click)="onShowDetail(tax)">
                <div class="row-main">
                  <div class="tax-avatar" [style.background]="'var(--color-primary-subtle)'">
                    <ng-icon name="lucidePercent" [style.color]="'var(--color-accent-primary)'"></ng-icon>
                  </div>
                  <div class="tax-info">
                    <span class="tax-name">{{ tax.name }}</span>
                    <span class="tax-sub">{{ tax.code }}{{ tax.sriCode ? ' · ' + tax.sriCode : '' }}</span>
                  </div>
                </div>
                <div class="row-col">
                  <span class="row-label">Tipo</span>
                  <span [class]="'badge-type ' + (tax.type === 'PERCENTAGE' ? 'percentage' : 'fixed')">
                    {{ tax.type === 'PERCENTAGE' ? 'Porcentual' : 'Fijo' }}
                  </span>
                </div>
                <div class="row-col">
                  <span class="row-label">Tarifa</span>
                  <span class="row-value">
                    {{ tax.type === 'PERCENTAGE' ? (tax.percentage ?? 0) + '%' : '$ ' + (tax.fixedAmount) }}
                  </span>
                </div>
                <div class="row-col">
                  <span [class]="'badge-status ' + (tax.isActive ? 'active' : 'inactive')">
                    {{ tax.isActive ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
                <div class="row-actions" (click)="$event.stopPropagation()">
                  <app-actions-menu
                    [actions]="taxActions"
                    (actionClick)="handleActionClick($event, tax)"
                  ></app-actions-menu>
                </div>
              </div>
            }
          }
        } @else {
          <div class="taxes-page__empty">
            <app-empty-state
              [icon]="activeFiltersCount() > 0 || searchQuery() ? 'lucideSearch' : 'lucideInbox'"
              [title]="activeFiltersCount() > 0 || searchQuery() ? 'No encontramos lo que buscas' : 'No hay impuestos registrados'"
              [description]="activeFiltersCount() > 0 || searchQuery() ? 'Ajusta tus filtros o busca otro término.' : 'Configura los impuestos aplicables a tus productos.'"
              [actionLabel]="activeFiltersCount() > 0 || searchQuery() ? 'Limpiar Filtros' : 'Nuevo Impuesto'"
              (action)="activeFiltersCount() > 0 || searchQuery() ? clearAllFilters() : onAddTax()"
            ></app-empty-state>
          </div>
        }
      </div>

      <!-- Drawer de Detalle -->
      <app-drawer
        [isOpen]="isDetailOpen()"
        title="Detalle de Impuesto"
        (close)="isDetailOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          @if (selectedTax()) {
            <div class="tax-detail-view">

              <div class="td-section td-header">
                <div class="td-header-main">
                  <h2 class="td-name">{{ selectedTax()!.name }}</h2>
                  <span class="td-status-badge" [ngClass]="selectedTax()!.isActive ? 'active' : 'inactive'">
                    {{ selectedTax()!.isActive ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
                <p class="td-code">
                  Código: {{ selectedTax()!.code }}
                  @if (selectedTax()!.sriCode) { · SRI: {{ selectedTax()!.sriCode }} }
                </p>
              </div>

              <div class="td-kpi-grid">
                <div class="td-kpi-card">
                  <div class="td-kpi-icon td-kpi-type">
                    <ng-icon name="lucideTag"></ng-icon>
                  </div>
                  <div class="td-kpi-info">
                    <span class="td-kpi-label">Tipo</span>
                    <span class="td-kpi-value">{{ selectedTax()!.type === 'PERCENTAGE' ? 'Porcentual' : 'Monto Fijo' }}</span>
                  </div>
                </div>
                <div class="td-kpi-card">
                  <div class="td-kpi-icon td-kpi-rate">
                    <ng-icon name="lucidePercent"></ng-icon>
                  </div>
                  <div class="td-kpi-info">
                    <span class="td-kpi-label">Tarifa</span>
                    <span class="td-kpi-value">
                      {{ selectedTax()!.type === 'PERCENTAGE' ? (selectedTax()!.percentage ?? 0) + '%' : '$' + selectedTax()!.fixedAmount }}
                    </span>
                  </div>
                </div>
              </div>

              @if (selectedTax()!.sriCode) {
                <div class="td-section">
                  <h3 class="td-section-title">Configuración Fiscal</h3>
                  <div class="td-info-list">
                    <div class="td-info-item">
                      <div class="td-icon-box"><ng-icon name="lucideHash"></ng-icon></div>
                      <div class="td-item-content">
                        <span class="td-item-label">Código SRI</span>
                        <span class="td-item-text">{{ selectedTax()!.sriCode }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              }

            </div>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <button class="btn btn-secondary" (click)="onShowHistory(selectedTax()!.id)">
            <ng-icon name="lucideHistory"></ng-icon>
            Ver Historial
          </button>
          <button class="btn btn-primary" (click)="onEditTax(selectedTax()!)">
            <ng-icon name="lucidePencil"></ng-icon>
            Editar Impuesto
          </button>
        </div>
      </app-drawer>

      <!-- Drawer de Historial -->
      <app-drawer
        [isOpen]="isHistoryOpen()"
        title="Historial de Actividad"
        (close)="isHistoryOpen.set(false)">
        <div drawerBody class="history-container">
          @if (isHistoryLoading()) {
            <div class="history-loading">
              <app-spinner></app-spinner>
              <span>Cargando actividad...</span>
            </div>
          } @else {
            <app-dateline [items]="mappedLogs()"></app-dateline>
          }
        </div>
      </app-drawer>

      <app-pagination
        [totalItems]="totalItems()"
        [pageSize]="pageSize()"
        [currentPage]="currentPage()"
        (pageChange)="currentPage.set($event)"
      ></app-pagination>

      <!-- Drawer de Formulario -->
      <app-drawer
        [isOpen]="isDrawerOpen()"
        [title]="isEditing() ? 'Editar Impuesto' : 'Nuevo Impuesto'"
        [allowClose]="!taxFormRef?.isSubmitting()"
        (close)="onDrawerClose()"
        size="md">
        <div drawerBody>
          <app-tax-form #taxFormRef (saved)="onTaxSaved()"></app-tax-form>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button
            label="Cancelar"
            variant="secondary"
            [disabled]="!!taxFormRef?.isSubmitting()"
            (click)="onDrawerClose()"
          ></app-form-button>
          <app-form-button
            [label]="isEditing() ? 'Actualizar' : 'Guardar'"
            icon="lucideSave"
            [loading]="taxFormRef?.isSubmitting() ?? false"
            [disabled]="taxFormRef?.taxForm?.invalid ?? false"
            (click)="taxFormRef?.onSubmit()"
          ></app-form-button>
        </div>
      </app-drawer>

      <!-- Modal Salida sin guardar -->
      <app-modal
        [isOpen]="isConfirmationModalOpen()"
        title="Cambios sin guardar"
        (close)="onCancelExit()">
        <div modalBody>
          Tienes cambios en el formulario que no has guardado. ¿Estás seguro de que quieres salir?
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Continuar Editando" variant="secondary" (click)="onCancelExit()"></app-form-button>
          <app-form-button label="Salir sin Guardar" variant="danger" (click)="onConfirmExit()"></app-form-button>
        </div>
      </app-modal>

      <!-- Modal Confirmación Eliminación -->
      <app-modal
        [isOpen]="isDeleteModalOpen()"
        title="Confirmar Eliminación"
        (close)="isDeleteModalOpen.set(false)">
        <div modalBody>
          ¿Estás seguro de que deseas eliminar el impuesto <strong>"{{ taxToDelete()?.name }}"</strong>?
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isDeleteModalOpen.set(false)"></app-form-button>
          <app-form-button
            label="Eliminar"
            variant="danger"
            icon="lucideTrash2"
            [loading]="isDeleting()"
            [disabled]="isDeleting()"
            (click)="confirmDelete()"
          ></app-form-button>
        </div>
      </app-modal>
    </div>
  `,
  styleUrl: './taxes-list.component.scss'
})
export class TaxesListComponent {
  private taxService = inject(TaxService);
  private toastService = inject(ToastService);
  private modalService = inject(ModalService);

  @ViewChild('taxFormRef') taxFormRef?: TaxFormComponent;

  taxActions: ActionItem[] = [
    { id: 'edit', label: 'Editar', icon: 'lucidePencil' },
    { id: 'history', label: 'Historial', icon: 'lucideHistory' },
    { id: 'delete', label: 'Eliminar', icon: 'lucideTrash2', variant: 'danger' }
  ];

  searchQuery = signal('');
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile = signal(false);
  viewMode = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());

  refreshTrigger = signal(0);
  isLoading = signal(true);
  currentPage = signal(1);
  pageSize = signal(12);

  isDrawerOpen = signal(false);
  isEditing = signal(false);
  isDetailOpen = signal(false);
  selectedTax = signal<Tax | null>(null);
  isHistoryOpen = signal(false);
  isHistoryLoading = signal(false);
  isDeleteModalOpen = signal(false);
  isDeleting = signal(false);

  taxLogs = signal<any[]>([]);
  taxToDelete = signal<Tax | null>(null);
  isConfirmationModalOpen = signal(false);

  taxTabs = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Activos', value: 'Activos' },
    { label: 'Inactivos', value: 'Inactivos' }
  ];
  activeTab = signal('Todos');

  availableFields: FilterField[] = [
    { id: 'name', label: 'Nombre', type: 'text' },
    { id: 'code', label: 'Código', type: 'text' },
    { id: 'type', label: 'Tipo', type: 'text' },
    { id: 'createdAt', label: 'Creación', type: 'text' }
  ];

  filterTree = signal<FilterGroup>({
    type: 'group',
    id: 'root',
    logicalOperator: 'AND',
    children: []
  });

  private readonly response = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      filterModel: QueryMapper.toAgGridFilterModel(this.filterTree()),
      tab: this.activeTab(),
      refresh: this.refreshTrigger()
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        const { tab, ...filters } = params;
        if (tab === 'Activos') {
          filters.filterModel['isActive'] = { filterType: 'text', type: 'equals', filter: 'true' };
        } else if (tab === 'Inactivos') {
          filters.filterModel['isActive'] = { filterType: 'text', type: 'equals', filter: 'false' };
        }
        return this.taxService.findAll(filters).pipe(
          tap(() => this.isLoading.set(false))
        );
      })
    )
  );

  taxes = computed(() => this.response()?.data || []);
  totalItems = computed(() => this.response()?.total || 0);

  mappedLogs = computed<DatelineItem[]>(() =>
    this.taxLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: this.getLogActionLabel(log.action),
      user: log.userName || 'Sistema',
      icon: this.getLogIcon(log.action),
      changes: log.action === 'UPDATE' && log.details?.oldData
        ? this.getChanges(log.details.oldData, log.details.newData)
        : undefined
    }))
  );

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mq.matches);
      mq.addEventListener('change', e => this.isMobile.set(e.matches));
    }
  }

  onTabChange(tab: string) { this.activeTab.set(tab); this.currentPage.set(1); }
  onSearch(q: string) { this.searchQuery.set(q); this.currentPage.set(1); }
  onSortChange(_: any) { this.refreshTrigger.update(v => v + 1); }

  onAddTax() {
    this.isEditing.set(false);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.taxFormRef?.resetForm(), 0);
  }

  onShowDetail(tax: Tax) {
    this.selectedTax.set(tax);
    this.isDetailOpen.set(true);
  }

  onEditTax(tax: Tax) {
    this.isDetailOpen.set(false);
    this.isEditing.set(true);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.taxFormRef?.setTax(tax), 0);
  }

  handleActionClick(action: ActionItem, tax: Tax) {
    if (action.id === 'edit') this.onEditTax(tax);
    else if (action.id === 'history') this.onShowHistory(tax.id);
    else if (action.id === 'delete') { this.taxToDelete.set(tax); this.isDeleteModalOpen.set(true); }
  }

  onShowHistory(id: string) {
    this.isDetailOpen.set(false);
    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);
    this.taxService.getLogs(id).subscribe({
      next: logs => { this.taxLogs.set(logs); this.isHistoryLoading.set(false); },
      error: () => this.isHistoryLoading.set(false)
    });
  }

  confirmDelete() {
    const tax = this.taxToDelete();
    if (!tax) return;
    this.isDeleting.set(true);
    this.taxService.remove(tax.id).subscribe({
      next: () => {
        this.toastService.success('Impuesto eliminado');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleteModalOpen.set(false);
        this.isDeleting.set(false);
      },
      error: () => this.isDeleting.set(false)
    });
  }

  onDrawerClose() {
    if (this.taxFormRef?.hasUnsavedChanges()) {
      this.isConfirmationModalOpen.set(true);
    } else {
      this.closeDrawer();
    }
  }

  onConfirmExit() { this.isConfirmationModalOpen.set(false); this.closeDrawer(); }
  onCancelExit() { this.isConfirmationModalOpen.set(false); }

  private closeDrawer() {
    this.isDrawerOpen.set(false);
    this.taxFormRef?.resetForm();
  }

  onTaxSaved() {
    this.isDrawerOpen.set(false);
    this.refreshTrigger.update(v => v + 1);
  }

  openAdvancedFilters() {
    this.modalService.open(
      TaxesAdvancedFilters,
      'Filtros Avanzados',
      {
        filterTree: this.filterTree,
        availableFields: this.availableFields,
        onFilterTreeChange: (tree: FilterNode) => this.filterTree.set(tree as FilterGroup)
      },
      'Los filtros se aplican en tiempo real',
      [{ label: 'Hecho', variant: 'primary', action: () => this.modalService.close() }]
    );
  }

  activeFiltersCount = computed(() => {
    const count = (node: FilterNode): number => {
      if (node.type === 'group') return node.children.reduce((a, c) => a + count(c), 0);
      return (node as FilterRule).value ? 1 : 0;
    };
    return count(this.filterTree());
  });

  clearAllFilters() {
    this.searchQuery.set('');
    this.filterTree.set({ type: 'group', id: 'root', logicalOperator: 'AND', children: [] });
  }

  getLogIcon(action: string): string {
    const map: Record<string, string> = {
      CREATE: 'lucidePlusCircle', UPDATE: 'lucideRefreshCw', DELETE: 'lucideTrash'
    };
    return map[action] ?? 'lucideHistory';
  }

  getLogActionLabel(action: string): string {
    const map: Record<string, string> = {
      CREATE: 'Creación', UPDATE: 'Actualización', DELETE: 'Eliminación'
    };
    return map[action] ?? action;
  }

  private getChanges(oldData: any, newData: any) {
    if (!oldData || !newData) return [];
    const fields = [
      { field: 'name', label: 'Nombre' },
      { field: 'code', label: 'Código' },
      { field: 'sriCode', label: 'Código SRI' },
      { field: 'type', label: 'Tipo' },
      { field: 'percentage', label: 'Porcentaje' },
      { field: 'fixedAmount', label: 'Monto Fijo' },
      { field: 'isActive', label: 'Estado' }
    ];
    return fields
      .filter(f => JSON.stringify(oldData[f.field]) !== JSON.stringify(newData[f.field]))
      .map(f => ({
        ...f,
        oldValue: this.formatValue(f.field, oldData[f.field]),
        newValue: this.formatValue(f.field, newData[f.field])
      }));
  }

  private formatValue(field: string, val: any): string {
    if (field === 'isActive') return val ? 'Activo' : 'Inactivo';
    if (field === 'type') return val === 'PERCENTAGE' ? 'Porcentual' : 'Fijo';
    return String(val ?? '');
  }
}
