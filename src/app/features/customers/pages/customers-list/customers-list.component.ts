import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideSave, lucidePencil, lucideTrash2,
  lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash,
  lucideIdCard, lucideMail, lucidePhone,
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

import { CustomerService } from '../../../../core/services/customer.service';
import { Customer, CUSTOMER_ID_TYPES } from '../../../../core/models/customer.models';
import { ToastService } from '../../../../core/services/toast.service';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';

import { CustomerFormComponent } from '../../components/customer-form/customer-form';
import { CustomerDetailComponent } from '../../components/customer-detail/customer-detail';
import { CustomersAdvancedFilters } from './components/customers-advanced-filters/customers-advanced-filters';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DataCardComponent, SkeletonComponent, EmptyStateComponent,
    DrawerComponent, ModalComponent, SpinnerComponent,
    FormButtonComponent, ActionsMenuComponent, DatelineComponent,
    CustomerFormComponent, CustomerDetailComponent, CustomersAdvancedFilters,
    NgIconComponent,
  ],
  providers: [
    provideIcons({
      lucidePlus, lucideSave, lucidePencil, lucideTrash2,
      lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash,
      lucideIdCard, lucideMail, lucidePhone,
    })
  ],
  template: `
    <div class="page-shell">
    <div class="customers-page">
      <app-page-header
        title="Clientes"
        [tabs]="customerTabs"
        [activeTab]="activeTab()"
        ctaText="Nuevo Cliente"
        ctaIcon="lucidePlus"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAddCustomer()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar clientes..."
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

      <div [ngClass]="viewMode() === 'grid' ? 'customers-page__grid' : 'customers-page__list'">
        @if (isLoading()) {
          @for (n of [1,2,3,4,5,6]; track n) {
            @if (viewMode() === 'grid') {
              <div class="data-card skeleton-card">
                <header class="data-card__header">
                  <div class="data-card__title-container">
                    <app-skeleton width="150px" height="1.25rem"></app-skeleton>
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
                  <div class="data-card__detail">
                    <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
                    <app-skeleton width="120px" height="0.875rem"></app-skeleton>
                  </div>
                </div>
              </div>
            } @else {
              <div class="customer-row-item skeleton-row">
                <div class="row-main">
                  <app-skeleton width="44px" height="44px" radius="8px"></app-skeleton>
                  <div class="customer-info">
                    <app-skeleton width="140px" height="1rem"></app-skeleton>
                    <app-skeleton width="100px" height="0.875rem" style="margin-top: 6px"></app-skeleton>
                  </div>
                </div>
                <div class="row-id">
                  <app-skeleton width="100px" height="0.875rem"></app-skeleton>
                </div>
                <div class="row-status">
                  <app-skeleton width="70px" height="24px" radius="99px"></app-skeleton>
                </div>
                <div class="row-actions">
                  <app-skeleton width="32px" height="32px" shape="circle"></app-skeleton>
                </div>
              </div>
            }
          }
        } @else if (customers().length > 0) {
          @for (customer of customers(); track customer.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                [title]="customer.name"
                [status]="customer.isActive ? 'Activo' : 'Inactivo'"
                [statusConfig]="customer.isActive ? 'active' : 'inactive'"
                [details]="getCardDetails(customer)"
                [actions]="customerActions"
                (actionClick)="handleActionClick($event, customer)"
                (click)="onShowDetail(customer)"
                class="clickable-card"
              ></app-data-card>
            } @else {
              <div class="customer-row-item" (click)="onShowDetail(customer)">
                <div class="row-main">
                  <div class="customer-avatar">
                    <span>{{ customer.name[0].toUpperCase() }}</span>
                  </div>
                  <div class="customer-info">
                    <span class="customer-name">{{ customer.name }}</span>
                    <span class="customer-sub">{{ getIdTypeLabel(customer.tipoIdentificacion) }}: {{ customer.identificacion }}</span>
                  </div>
                </div>
                <div class="row-id">
                  {{ customer.email || '—' }}
                </div>
                <div class="row-status">
                  <span [class]="'badge-status ' + (customer.isActive ? 'active' : 'inactive')">
                    {{ customer.isActive ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
                <div class="row-actions" (click)="$event.stopPropagation()">
                  <app-actions-menu
                    [actions]="customerActions"
                    (actionClick)="handleActionClick($event, customer)"
                  ></app-actions-menu>
                </div>
              </div>
            }
          }
        } @else {
          <div class="customers-page__empty">
            <app-empty-state
              [icon]="activeFiltersCount() > 0 || searchQuery() ? 'lucideSearch' : 'lucideInbox'"
              [title]="activeFiltersCount() > 0 || searchQuery() ? 'No encontramos lo que buscas' : 'No hay clientes registrados'"
              [description]="activeFiltersCount() > 0 || searchQuery() ? 'Intenta con otros términos o ajusta tus filtros.' : 'Parece que aún no has creado ningún cliente.'"
              [actionLabel]="activeFiltersCount() > 0 || searchQuery() ? 'Limpiar Filtros' : 'Nuevo Cliente'"
              (action)="activeFiltersCount() > 0 || searchQuery() ? clearAllFilters() : onAddCustomer()"
            ></app-empty-state>
          </div>
        }
      </div>

      <!-- Drawer: Detalle -->
      <app-drawer
        [isOpen]="isDetailOpen()"
        title="Detalle de Cliente"
        (close)="isDetailOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          @if (selectedCustomer()) {
            <app-customer-detail [customer]="selectedCustomer()!"></app-customer-detail>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Historial" icon="lucideHistory" variant="ghost" type="button"
            [fullWidth]="false" (click)="onShowHistory(selectedCustomer()!.id)"></app-form-button>
          <app-form-button label="Editar Cliente" icon="lucidePencil" variant="secondary" type="button"
            [fullWidth]="false" (click)="onEditCustomer(selectedCustomer()!)"></app-form-button>
        </div>
      </app-drawer>

      <!-- Drawer: Historial -->
      <app-drawer
        [isOpen]="isHistoryOpen()"
        title="Historial de Actividad"
        (close)="isHistoryOpen.set(false)"
      >
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

      <!-- Drawer: Filtros Avanzados -->
      <app-drawer
        [isOpen]="isFiltersOpen()"
        title="Filtros Avanzados"
        (close)="isFiltersOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          <app-customers-advanced-filters
            #advancedFilters
            [filterTree]="filterTree"
            [availableFields]="availableFields"
            (applied)="onFilterTreeChange($event); isFiltersOpen.set(false)"
          ></app-customers-advanced-filters>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary"
            (click)="isFiltersOpen.set(false)"></app-form-button>
          <app-form-button label="Aplicar filtros" variant="primary"
            (click)="advancedFilters.applyFilters()"></app-form-button>
        </div>
      </app-drawer>

      <!-- Drawer: Crear/Editar Cliente -->
      <app-drawer
        [isOpen]="isDrawerOpen()"
        [title]="isEditing() ? 'Editar Cliente' : 'Nuevo Cliente'"
        [allowClose]="!(customerForm?.isSubmitting())"
        (close)="onDrawerClose()"
        size="md"
      >
        <div drawerBody>
          <app-customer-form
            #customerForm
            (saved)="onCustomerSaved($event)"
          ></app-customer-form>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" type="button"
            [disabled]="!!(customerForm?.isSubmitting())" (click)="onDrawerClose()"></app-form-button>
          <app-form-button
            [label]="isEditing() ? 'Actualizar Cliente' : 'Guardar Cliente'"
            loadingLabel="Guardando..." icon="lucideSave"
            [loading]="!!(customerForm?.isSubmitting())"
            [disabled]="customerForm?.customerForm?.invalid ?? true"
            (click)="customerForm?.onSubmit()"
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
          ¿Eliminar el cliente <strong>"{{ customerToDelete()?.name }}"</strong>?
          Esta acción no se puede deshacer.
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="ghost" type="button" [fullWidth]="false"
            [disabled]="isDeleting()" (click)="cancelDelete()"></app-form-button>
          <app-form-button label="Eliminar" loadingLabel="Eliminando..." variant="danger" type="button"
            [fullWidth]="false" [loading]="isDeleting()" (click)="confirmDelete()"></app-form-button>
        </div>
      </app-modal>
    </div>

    <!-- Mobile sticky footer -->
    <div class="mobile-fab">
      <button class="mobile-fab__btn" (click)="onAddCustomer()">
        <ng-icon name="lucidePlus" size="18"></ng-icon>
        <span>Nuevo Cliente</span>
      </button>
    </div>
    </div>
  `,
  styleUrl: './customers-list.component.scss'
})
export class CustomersListComponent {
  private customerService = inject(CustomerService);
  private toastService = inject(ToastService);

  @ViewChild('customerForm') customerFormRef?: CustomerFormComponent;
  @ViewChild('advancedFilters') advancedFiltersRef!: CustomersAdvancedFilters;

  customerActions: ActionItem[] = [
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
  selectedCustomer   = signal<Customer | null>(null);
  isHistoryOpen      = signal(false);
  isHistoryLoading   = signal(false);
  isDeleteModalOpen  = signal(false);
  isDeleting         = signal(false);
  customerToDelete   = signal<Customer | null>(null);
  customerLogs       = signal<any[]>([]);

  // ── Config ───────────────────────────────────────────────────────────────────
  customerTabs = [
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
    { id: 'identificacion', label: 'Identificación', type: 'text' },
    { id: 'email', label: 'Email', type: 'text' },
    { id: 'phone', label: 'Teléfono', type: 'text' },
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
    this.customerLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: this.getLogActionLabel(log.action),
      user: log.userName || 'Sistema',
      icon: this.getLogIcon(log.action),
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
        if (tab === 'Activos') filters.filterModel['isActive'] = { filterType: 'boolean', type: 'equals', filter: true };
        else if (tab === 'Inactivos') filters.filterModel['isActive'] = { filterType: 'boolean', type: 'equals', filter: false };
        return this.customerService.findAll(filters).pipe(tap(() => this.isLoading.set(false)));
      })
    )
  );

  customers = computed(() => this.response()?.data || []);
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
  onAddCustomer() {
    this.isEditing.set(false);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.customerFormRef?.resetForm(), 0);
  }

  onEditCustomer(customer: Customer) {
    this.isDetailOpen.set(false);
    this.isEditing.set(true);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.customerFormRef?.setCustomer(customer), 0);
  }

  onCustomerSaved(_customer: Customer) {
    this.isDrawerOpen.set(false);
    this.refreshTrigger.update(v => v + 1);
    this.resetPagination();
  }

  onDrawerClose() {
    if (this.customerFormRef?.hasUnsavedChanges()) {
      this.isConfirmCloseOpen.set(true);
    } else {
      this.isDrawerOpen.set(false);
      this.customerFormRef?.resetForm();
    }
  }

  forceCloseDrawer() {
    this.isConfirmCloseOpen.set(false);
    this.isDrawerOpen.set(false);
    this.customerFormRef?.resetForm();
  }

  // ── Detail & History ──────────────────────────────────────────────────────────
  onShowDetail(customer: Customer) {
    this.selectedCustomer.set(customer);
    this.isDetailOpen.set(true);
  }

  handleActionClick(action: ActionItem, customer: Customer) {
    if (action.id === 'edit') this.onEditCustomer(customer);
    else if (action.id === 'history') this.onShowHistory(customer.id);
    else if (action.id === 'delete') {
      this.customerToDelete.set(customer);
      this.isDeleteModalOpen.set(true);
    }
  }

  onShowHistory(id: string) {
    this.isDetailOpen.set(false);
    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);
    this.customerService.getLogs(id).subscribe({
      next: logs => {
        this.customerLogs.set(logs);
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
    this.customerToDelete.set(null);
  }

  confirmDelete() {
    const c = this.customerToDelete();
    if (!c || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.customerService.remove(c.id).subscribe({
      next: () => {
        this.toastService.success('Cliente eliminado correctamente');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleting.set(false);
        this.cancelDelete();
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? 'No se pudo eliminar el cliente');
        this.isDeleting.set(false);
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  getCardDetails(customer: Customer) {
    const details = [
      { icon: 'lucideIdCard', text: `${this.getIdTypeLabel(customer.tipoIdentificacion)}: ${customer.identificacion}` },
    ];
    if (customer.email) details.push({ icon: 'lucideMail', text: customer.email });
    if (customer.phone) details.push({ icon: 'lucidePhone', text: customer.phone });
    return details;
  }

  getIdTypeLabel(tipo: string): string {
    return CUSTOMER_ID_TYPES.find(t => t.value === tipo)?.label || tipo;
  }

  private resetPagination() { this.currentPage.set(1); }

  private getLogIcon(action: string): string {
    switch (action) {
      case 'CREATE': return 'lucidePlusCircle';
      case 'UPDATE': return 'lucideRefreshCw';
      case 'DELETE': return 'lucideTrash';
      default: return 'lucideHistory';
    }
  }

  private getLogActionLabel(action: string): string {
    switch (action) {
      case 'CREATE': return 'Creación';
      case 'UPDATE': return 'Actualización';
      case 'DELETE': return 'Eliminación';
      default: return action;
    }
  }

  private getChanges(oldData: any, newData: any) {
    if (!oldData || !newData) return [];
    const fields = [
      { field: 'name', label: 'Nombre' },
      { field: 'tipoIdentificacion', label: 'Tipo ID' },
      { field: 'identificacion', label: 'Identificación' },
      { field: 'email', label: 'Email' },
      { field: 'phone', label: 'Teléfono' },
      { field: 'address', label: 'Dirección' },
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
    if (field === 'tipoIdentificacion') return this.getIdTypeLabel(val);
    return String(val || '');
  }
}
