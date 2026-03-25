import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideDownload,
  lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash,
  lucidePercent, lucideHash, lucideCloudDownload,
} from '@ng-icons/lucide';

import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';
import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { ActionItem, ActionsMenuComponent } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { DatelineComponent, DatelineItem } from '../../../../shared/components/ui/dateline/dateline.component';

import { TaxService } from '../../../../core/services/tax.service';
import { Tax } from '../../../../core/models/tax.models';
import { ToastService } from '../../../../core/services/toast.service';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';

import { TaxFormComponent } from './components/tax-form/tax-form.component';
import { TaxDetailComponent } from '../../components/tax-detail/tax-detail.component';
import { TaxesAdvancedFilters } from './components/taxes-advanced-filters/taxes-advanced-filters';
import { TaxImportModalComponent } from '../../components/tax-import-modal/tax-import-modal';

@Component({
  selector: 'app-taxes-list',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DataCardComponent, SkeletonComponent, EmptyStateComponent,
    DrawerComponent, ModalComponent, SpinnerComponent,
    FormButtonComponent, ActionsMenuComponent, DatelineComponent,
    TaxFormComponent, TaxDetailComponent, TaxesAdvancedFilters,
    TaxImportModalComponent, NgIconComponent,
  ],
  providers: [
    provideIcons({
      lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideDownload,
      lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash,
      lucidePercent, lucideHash, lucideCloudDownload,
    })
  ],
  template: `
    <div class="page-shell">
    <div class="taxes-page">
      <app-page-header
        title="Impuestos"
        [tabs]="taxTabs"
        [activeTab]="activeTab()"
        ctaText="Nuevo Impuesto"
        ctaIcon="lucidePlus"
        secondaryCtaText="Importar"
        secondaryCtaIcon="lucideDownload"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAddTax()"
        (secondaryCtaClick)="importModal.open()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar impuestos..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="activeFiltersCount()"
        [viewMode]="viewModePreference()"
        [sortOptions]="sortOptions"
        (openFilters)="openAdvancedFilters()"
        (clearFilters)="clearAllFilters()"
        (searchChange)="onSearch($event)"
        (viewModeChange)="viewModePreference.set($event)"
        (sortChange)="onSortChange($event)"
      ></app-list-toolbar>

      <div [ngClass]="viewMode() === 'grid' ? 'taxes-page__grid' : 'taxes-page__list'">
        @if (isLoading()) {
          @for (n of [1,2,3,4,5,6]; track n) {
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
          @for (tax of taxes(); track tax.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                [title]="tax.name"
                [status]="tax.isActive ? 'Activo' : 'Inactivo'"
                [statusConfig]="tax.isActive ? 'active' : 'inactive'"
                [details]="[
                  { icon: 'lucideHash', text: tax.code + (tax.sriCode ? ' · SRI: ' + tax.sriCode : '') },
                  { icon: 'lucidePercent', text: tax.type === 'PERCENTAGE' ? (tax.percentage ?? 0) + '%' : '$ ' + tax.fixedAmount }
                ]"
                [actions]="taxActions"
                (actionClick)="handleActionClick($event, tax)"
                (click)="onShowDetail(tax)"
                class="clickable-card"
              ></app-data-card>
            } @else {
              <div class="tax-row-item" (click)="onShowDetail(tax)">
                <div class="row-main">
                  <div class="tax-avatar">
                    <span>%</span>
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
                    {{ tax.type === 'PERCENTAGE' ? (tax.percentage ?? 0) + '%' : '$ ' + tax.fixedAmount }}
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
              [icon]="activeFiltersCount() > 0 || searchQuery() ? 'lucideSearch' : 'lucidePercent'"
              [title]="activeFiltersCount() > 0 || searchQuery() ? 'No encontramos lo que buscas' : 'No hay impuestos registrados'"
              [description]="activeFiltersCount() > 0 || searchQuery() ? 'Ajusta tus filtros o busca otro término.' : 'Configura los impuestos aplicables a tus productos.'"
              [actionLabel]="activeFiltersCount() > 0 || searchQuery() ? 'Limpiar Filtros' : 'Nuevo Impuesto'"
              (action)="activeFiltersCount() > 0 || searchQuery() ? clearAllFilters() : onAddTax()"
            ></app-empty-state>
          </div>
        }
      </div>

      <!-- Drawer: Detalle -->
      <app-drawer
        [isOpen]="isDetailOpen()"
        title="Detalle de Impuesto"
        (close)="isDetailOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          @if (selectedTax()) {
            <app-tax-detail [tax]="selectedTax()!"></app-tax-detail>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Historial" icon="lucideHistory" variant="ghost" type="button"
            [fullWidth]="false" (click)="onShowHistory(selectedTax()!.id)"></app-form-button>
          <app-form-button label="Editar Impuesto" icon="lucidePencil" variant="secondary" type="button"
            [fullWidth]="false" (click)="onEditTax(selectedTax()!)"></app-form-button>
        </div>
      </app-drawer>

      <!-- Drawer: Historial -->
      <app-drawer
        [isOpen]="isHistoryOpen()"
        title="Historial de Auditoría"
        (close)="isHistoryOpen.set(false)"
      >
        <div drawerBody class="history-container">
          @if (isHistoryLoading()) {
            <div class="history-loading">
              <app-spinner></app-spinner>
              <span>Cargando historial...</span>
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

      <!-- Drawer: Filtros Avanzados -->
      <app-drawer
        [isOpen]="isFiltersOpen()"
        title="Filtros Avanzados"
        (close)="isFiltersOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          <app-taxes-advanced-filters
            #advancedFilters
            [filterTree]="filterTree"
            [availableFields]="availableFields"
            (applied)="onFilterTreeChange($event); isFiltersOpen.set(false)"
          ></app-taxes-advanced-filters>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary"
            (click)="isFiltersOpen.set(false)"></app-form-button>
          <app-form-button label="Aplicar filtros" variant="primary"
            (click)="advancedFilters.applyFilters()"></app-form-button>
        </div>
      </app-drawer>

      <!-- Drawer: Crear/Editar Impuesto -->
      <app-drawer
        [isOpen]="isDrawerOpen()"
        [title]="isEditing() ? 'Editar Impuesto' : 'Nuevo Impuesto'"
        [allowClose]="!(taxForm?.isSubmitting())"
        (close)="onDrawerClose()"
        size="md"
      >
        <div drawerBody>
          <app-tax-form
            #taxForm
            (saved)="onTaxSaved()"
          ></app-tax-form>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" type="button"
            [disabled]="!!(taxForm?.isSubmitting())" (click)="onDrawerClose()"></app-form-button>
          <app-form-button
            [label]="isEditing() ? 'Actualizar Impuesto' : 'Guardar Impuesto'"
            loadingLabel="Guardando..." icon="lucideSave"
            [loading]="!!(taxForm?.isSubmitting())"
            [disabled]="taxForm?.taxForm?.invalid ?? true"
            (click)="taxForm?.onSubmit()"
          ></app-form-button>
        </div>
      </app-drawer>

      <!-- Modal: Cambios sin guardar -->
      <app-modal
        [isOpen]="isConfirmCloseOpen()"
        title="Cambios sin guardar"
        size="sm"
        (close)="isConfirmCloseOpen.set(false)"
      >
        <div modalBody>Tienes cambios sin guardar. ¿Deseas salir? Se perderán los datos ingresados.</div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Continuar editando" variant="ghost" type="button" [fullWidth]="false"
            (click)="isConfirmCloseOpen.set(false)"></app-form-button>
          <app-form-button label="Salir sin guardar" variant="danger" type="button" [fullWidth]="false"
            (click)="forceCloseDrawer()"></app-form-button>
        </div>
      </app-modal>

      <!-- Modal: Confirmar eliminación -->
      <app-modal
        [isOpen]="isDeleteModalOpen()"
        title="Confirmar Eliminación"
        size="sm"
        [allowClose]="!isDeleting()"
        (close)="cancelDelete()"
      >
        <div modalBody>
          ¿Eliminar el impuesto <strong>"{{ taxToDelete()?.name }}"</strong>?
          Esta acción no se puede deshacer.
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="ghost" type="button" [fullWidth]="false"
            [disabled]="isDeleting()" (click)="cancelDelete()"></app-form-button>
          <app-form-button label="Eliminar" loadingLabel="Eliminando..." variant="danger" type="button"
            [fullWidth]="false" [loading]="isDeleting()" (click)="confirmDelete()"></app-form-button>
        </div>
      </app-modal>

      <app-tax-import-modal
        #importModal
        (imported)="refreshTrigger.update(v => v + 1)"
      ></app-tax-import-modal>
    </div>

    <!-- Mobile sticky footer -->
    <div class="mobile-fab">
      <button class="mobile-fab__btn" (click)="onAddTax()">
        <ng-icon name="lucidePlus" size="18"></ng-icon>
        <span>Nuevo Impuesto</span>
      </button>
    </div>
    </div>
  `,
  styleUrl: './taxes-list.component.scss'
})
export class TaxesListComponent {
  private taxService = inject(TaxService);
  private toastService = inject(ToastService);

  @ViewChild('taxForm') taxFormRef?: TaxFormComponent;
  @ViewChild('advancedFilters') advancedFiltersRef!: TaxesAdvancedFilters;
  @ViewChild('importModal') importModal!: TaxImportModalComponent;

  taxActions: ActionItem[] = [
    { id: 'edit', label: 'Editar', icon: 'lucidePencil' },
    { id: 'history', label: 'Historial', icon: 'lucideHistory' },
    { id: 'delete', label: 'Eliminar', icon: 'lucideTrash2', variant: 'danger' },
  ];

  // ── State ────────────────────────────────────────────────────────────────────
  searchQuery        = signal('');
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile           = signal(false);
  viewMode           = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());
  sortField          = signal('createdAt');
  sortOrder          = signal<'ASC' | 'DESC'>('DESC');
  refreshTrigger     = signal(0);
  isLoading          = signal(true);
  currentPage        = signal(1);
  pageSize           = signal(10);

  isDrawerOpen       = signal(false);
  isEditing          = signal(false);
  isFiltersOpen      = signal(false);
  isConfirmCloseOpen = signal(false);
  isDetailOpen       = signal(false);
  selectedTax        = signal<Tax | null>(null);
  isHistoryOpen      = signal(false);
  isHistoryLoading   = signal(false);
  isDeleteModalOpen  = signal(false);
  isDeleting         = signal(false);
  taxToDelete        = signal<Tax | null>(null);
  taxLogs            = signal<any[]>([]);

  // ── Config ───────────────────────────────────────────────────────────────────
  taxTabs = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Activos', value: 'Activos' },
    { label: 'Inactivos', value: 'Inactivos' },
  ];
  activeTab = signal('Todos');

  sortOptions = [
    { label: 'Más Recientes', value: 'createdAt:desc' },
    { label: 'Más Antiguos', value: 'createdAt:asc' },
    { label: 'Nombre (A-Z)', value: 'name:asc' },
    { label: 'Nombre (Z-A)', value: 'name:desc' },
  ];

  availableFields: FilterField[] = [
    { id: 'name', label: 'Nombre', type: 'text' },
    { id: 'code', label: 'Código', type: 'text' },
    { id: 'type', label: 'Tipo', type: 'text' },
  ];

  filterTree = signal<FilterGroup>({
    type: 'group', id: 'root', logicalOperator: 'AND', children: []
  });

  activeFiltersCount = computed(() => {
    const count = (node: FilterNode): number => {
      if (node.type === 'group') return node.children.reduce((a, c) => a + count(c), 0);
      return (node as FilterRule).value ? 1 : 0;
    };
    return count(this.filterTree());
  });

  mappedLogs = computed<DatelineItem[]>(() =>
    this.taxLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: this.getLogActionLabel(log.action),
      user: log.userName || 'Sistema',
      icon: this.getLogIcon(log.action),
      message: log.action === 'IMPORT' ? `Importación masiva de ${log.details?.count} impuestos.` : undefined,
      changes: log.action === 'UPDATE' && log.details?.oldData
        ? this.getChanges(log.details.oldData, log.details.newData) : undefined,
    }))
  );

  // ── Reactive data ────────────────────────────────────────────────────────────
  private readonly response = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      filterModel: QueryMapper.toAgGridFilterModel(this.filterTree()),
      sortField: this.sortField(),
      sortOrder: this.sortOrder(),
      tab: this.activeTab(),
      refresh: this.refreshTrigger(),
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        const { tab, ...filters } = params;
        if (tab === 'Activos') filters.filterModel['isActive'] = { filterType: 'text', type: 'equals', filter: 'true' };
        else if (tab === 'Inactivos') filters.filterModel['isActive'] = { filterType: 'text', type: 'equals', filter: 'false' };
        return this.taxService.findAll(filters).pipe(tap(() => this.isLoading.set(false)));
      })
    )
  );

  taxes = computed(() => this.response()?.data || []);
  totalItems = computed(() => this.response()?.total || 0);

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mq.matches);
      mq.addEventListener('change', e => this.isMobile.set(e.matches));
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  onTabChange(tab: string) { this.activeTab.set(tab); this.resetPagination(); }
  onSearch(q: string) { this.searchQuery.set(q); this.resetPagination(); }
  onSortChange(e: { field: string; order: string }) {
    this.sortField.set(e.field);
    this.sortOrder.set(e.order.toUpperCase() as 'ASC' | 'DESC');
    this.resetPagination();
  }

  // ── Filters ──────────────────────────────────────────────────────────────────
  openAdvancedFilters() {
    this.isFiltersOpen.set(true);
    setTimeout(() => this.advancedFiltersRef?.refresh(), 0);
  }

  onFilterTreeChange(newTree: FilterNode) {
    if (newTree.type === 'group') {
      this.filterTree.set(newTree as FilterGroup);
      this.resetPagination();
    }
  }

  clearAllFilters() {
    this.searchQuery.set('');
    this.filterTree.set({ type: 'group', id: 'root', logicalOperator: 'AND', children: [] });
    this.resetPagination();
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────────
  onAddTax() {
    this.isEditing.set(false);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.taxFormRef?.resetForm(), 0);
  }

  onEditTax(tax: Tax) {
    this.isDetailOpen.set(false);
    this.isEditing.set(true);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.taxFormRef?.setTax(tax), 0);
  }

  onTaxSaved() {
    this.isDrawerOpen.set(false);
    this.refreshTrigger.update(v => v + 1);
    this.resetPagination();
  }

  onDrawerClose() {
    if (this.taxFormRef?.hasUnsavedChanges()) {
      this.isConfirmCloseOpen.set(true);
    } else {
      this.isDrawerOpen.set(false);
      this.taxFormRef?.resetForm();
    }
  }

  forceCloseDrawer() {
    this.isConfirmCloseOpen.set(false);
    this.isDrawerOpen.set(false);
    this.taxFormRef?.resetForm();
  }

  // ── Detail & History ──────────────────────────────────────────────────────────
  onShowDetail(tax: Tax) {
    this.selectedTax.set(tax);
    this.isDetailOpen.set(true);
  }

  handleActionClick(action: ActionItem, tax: Tax) {
    if (action.id === 'edit') this.onEditTax(tax);
    else if (action.id === 'history') this.onShowHistory(tax.id);
    else if (action.id === 'delete') {
      this.taxToDelete.set(tax);
      this.isDeleteModalOpen.set(true);
    }
  }

  onShowHistory(id: string) {
    this.isDetailOpen.set(false);
    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);
    this.taxService.getLogs(id).subscribe({
      next: logs => {
        this.taxLogs.set(logs);
        this.isHistoryLoading.set(false);
      },
      error: () => {
        this.toastService.error('No se pudo cargar el historial');
        this.isHistoryLoading.set(false);
        this.isHistoryOpen.set(false);
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  cancelDelete() {
    if (this.isDeleting()) return;
    this.isDeleteModalOpen.set(false);
    this.taxToDelete.set(null);
  }

  confirmDelete() {
    const t = this.taxToDelete();
    if (!t || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.taxService.remove(t.id).subscribe({
      next: () => {
        this.toastService.success('Impuesto eliminado correctamente');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleting.set(false);
        this.cancelDelete();
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? 'No se pudo eliminar el impuesto');
        this.isDeleting.set(false);
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  private resetPagination() { this.currentPage.set(1); }

  private getLogIcon(action: string): string {
    switch (action) {
      case 'CREATE': return 'lucidePlusCircle';
      case 'UPDATE': return 'lucideRefreshCw';
      case 'DELETE': return 'lucideTrash';
      case 'IMPORT': return 'lucideCloudDownload';
      default: return 'lucideHistory';
    }
  }

  private getLogActionLabel(action: string): string {
    switch (action) {
      case 'CREATE': return 'Creación';
      case 'UPDATE': return 'Actualización';
      case 'DELETE': return 'Eliminación';
      case 'IMPORT': return 'Importación';
      default: return action;
    }
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
      { field: 'isActive', label: 'Estado' },
    ];
    return fields
      .filter(f => JSON.stringify(oldData[f.field]) !== JSON.stringify(newData[f.field]))
      .map(f => ({
        ...f,
        oldValue: this.formatValue(f.field, oldData[f.field]),
        newValue: this.formatValue(f.field, newData[f.field]),
      }));
  }

  private formatValue(field: string, val: any): string {
    if (field === 'isActive') return val ? 'Activo' : 'Inactivo';
    if (field === 'type') return val === 'PERCENTAGE' ? 'Porcentual' : 'Fijo';
    return String(val ?? '');
  }
}
