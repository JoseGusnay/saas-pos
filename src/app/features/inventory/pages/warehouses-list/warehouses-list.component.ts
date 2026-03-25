import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideWarehouse, lucideMapPin, lucideGrid3x3, lucideHistory } from '@ng-icons/lucide';

import { WarehouseService } from '../../../../core/services/warehouse.service';
import { Warehouse } from '../../../../core/models/warehouse.models';
import { ToastService } from '../../../../core/services/toast.service';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { ActionItem, ActionsMenuComponent } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { WarehouseFormComponent } from '../../components/warehouse-form/warehouse-form';
import { WarehousesAdvancedFilters } from './components/warehouses-advanced-filters/warehouses-advanced-filters';

@Component({
  selector: 'app-warehouses-list',
  standalone: true,
  imports: [
    CommonModule, NgIconComponent,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DataCardComponent, DrawerComponent, ModalComponent, FormButtonComponent,
    SkeletonComponent, EmptyStateComponent, ActionsMenuComponent,
    WarehouseFormComponent, WarehousesAdvancedFilters,
  ],
  providers: [
    provideIcons({ lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideWarehouse, lucideMapPin, lucideGrid3x3, lucideHistory })
  ],
  template: `
    <div class="page-shell">
    <div class="wh-page">
      <app-page-header
        title="Bodegas"
        [tabs]="tabs"
        [activeTab]="activeTab()"
        ctaText="Nueva Bodega"
        ctaIcon="lucidePlus"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAdd()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar bodegas..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="activeFiltersCount()"
        [viewMode]="viewModePreference()"
        [sortOptions]="sortOptions"
        (searchChange)="onSearch($event)"
        (openFilters)="openAdvancedFilters()"
        (clearFilters)="clearAllFilters()"
        (viewModeChange)="viewModePreference.set($event)"
        (sortChange)="onSortChange($event)"
      ></app-list-toolbar>

      <div [ngClass]="viewMode() === 'grid' ? 'wh-page__grid' : 'wh-page__list'">
        @if (isLoading()) {
          @for (n of [1,2,3,4,5,6]; track n) {
            @if (viewMode() === 'grid') {
              <!-- Grid Skeleton -->
              <div class="data-card skeleton-card">
                <header class="data-card__header">
                  <div class="data-card__title-container">
                    <app-skeleton width="160px" height="1.25rem"></app-skeleton>
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
                    <app-skeleton width="190px" height="0.875rem"></app-skeleton>
                  </div>
                  <div class="data-card__detail">
                    <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
                    <app-skeleton width="130px" height="0.875rem"></app-skeleton>
                  </div>
                </div>
              </div>
            } @else {
              <!-- List Skeleton -->
              <div class="wh-row-item skeleton-row">
                <div class="row-main">
                  <app-skeleton width="44px" height="44px" radius="12px"></app-skeleton>
                  <div class="wh-info">
                    <app-skeleton width="140px" height="1rem"></app-skeleton>
                    <app-skeleton width="180px" height="0.875rem" style="margin-top: 6px"></app-skeleton>
                  </div>
                </div>
                <div class="row-config">
                  <app-skeleton width="60px" height="10px" style="margin-bottom: 4px"></app-skeleton>
                  <app-skeleton width="100px" height="13px"></app-skeleton>
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
        } @else if (warehouses().length > 0) {

          @for (wh of warehouses(); track wh.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                [title]="wh.name"
                [status]="wh.isActive ? 'Activa' : 'Inactiva'"
                [statusConfig]="wh.isActive ? 'active' : 'inactive'"
                [details]="[
                  { icon: 'lucideWarehouse', text: wh.isDefault ? 'Bodega principal' : 'Bodega secundaria' },
                  { icon: 'lucideGrid3x3', text: wh.hasLocations ? 'Con ubicaciones' : 'Sin ubicaciones' }
                ]"
                [actions]="cardActions"
                (actionClick)="handleAction($event, wh)"
                (click)="onShowDetail(wh)"
                class="clickable-card"
              ></app-data-card>
            } @else {
              <!-- Row View -->
              <div class="wh-row-item" (click)="onShowDetail(wh)">
                <div class="row-main">
                  <div class="wh-avatar">
                    <ng-icon name="lucideWarehouse"></ng-icon>
                  </div>
                  <div class="wh-info">
                    <span class="wh-name">
                      {{ wh.name }}
                      @if (wh.isDefault) {
                        <span class="badge-default">Principal</span>
                      }
                    </span>
                    <span class="wh-sub">
                      {{ wh.description || 'Sin descripción' }}
                    </span>
                  </div>
                </div>
                <div class="row-config">
                  <span class="row-label">Ubicaciones</span>
                  <span class="row-value">{{ wh.hasLocations ? 'Habilitadas' : 'No' }}</span>
                </div>
                <div class="row-status">
                  <span [class]="'badge-status ' + (wh.isActive ? 'active' : 'inactive')">
                    {{ wh.isActive ? 'Activa' : 'Inactiva' }}
                  </span>
                </div>
                <div class="row-actions" (click)="$event.stopPropagation()">
                  <app-actions-menu
                    [actions]="cardActions"
                    (actionClick)="handleAction($event, wh)"
                  ></app-actions-menu>
                </div>
              </div>
            }
          }

        } @else {
          <div class="wh-page__empty">
            <app-empty-state
              [icon]="activeFiltersCount() > 0 || searchQuery() ? 'lucideSearch' : 'lucideWarehouse'"
              [title]="activeFiltersCount() > 0 || searchQuery() ? 'No encontramos lo que buscas' : 'No hay bodegas registradas'"
              [description]="activeFiltersCount() > 0 || searchQuery() ? 'Intenta con otros términos o ajusta tus filtros.' : 'Las bodegas se crean automáticamente con cada sucursal. También puedes crear una manualmente.'"
              [actionLabel]="activeFiltersCount() > 0 || searchQuery() ? 'Limpiar Filtros' : 'Nueva Bodega'"
              (action)="activeFiltersCount() > 0 || searchQuery() ? clearAllFilters() : onAdd()"
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

      <!-- Drawer: Crear/Editar Bodega -->
      <app-drawer
        [isOpen]="isDrawerOpen()"
        [title]="isEditing() ? 'Editar Bodega' : 'Nueva Bodega'"
        [allowClose]="!(warehouseForm?.isSubmitting)"
        (close)="onDrawerClose()"
        size="md"
      >
        <div drawerBody>
          <app-warehouse-form
            #warehouseForm
            (saved)="onSaved()"
            (cancelled)="onDrawerClose()"
          ></app-warehouse-form>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button
            label="Cancelar"
            variant="secondary"
            type="button"
            [disabled]="!!(warehouseForm?.isSubmitting)"
            (click)="onDrawerClose()"
          ></app-form-button>
          <app-form-button
            [label]="isEditing() ? 'Actualizar Bodega' : 'Crear Bodega'"
            loadingLabel="Guardando..."
            icon="lucideSave"
            [loading]="!!(warehouseForm?.isSubmitting)"
            [disabled]="warehouseForm?.form?.invalid ?? false"
            (click)="warehouseForm?.onSubmit()"
          ></app-form-button>
        </div>
      </app-drawer>

      <!-- Drawer: Filtros Avanzados -->
      <app-drawer
        [isOpen]="isFiltersOpen()"
        title="Filtros Avanzados"
        (close)="isFiltersOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          <app-warehouses-advanced-filters
            #advancedFilters
            [filterTree]="filterTree"
            [availableFields]="availableFields"
            (applied)="onFilterTreeChange($event); isFiltersOpen.set(false)"
          ></app-warehouses-advanced-filters>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button
            label="Cancelar"
            variant="secondary"
            (click)="isFiltersOpen.set(false)"
          ></app-form-button>
          <app-form-button
            label="Aplicar filtros"
            variant="primary"
            (click)="advancedFilters.applyFilters()"
          ></app-form-button>
        </div>
      </app-drawer>

      <!-- Modal: Confirmar eliminación -->
      <app-modal
        [isOpen]="isDeleteModalOpen()"
        title="Confirmar eliminación"
        size="sm"
        [allowClose]="!isDeleting()"
        (close)="cancelDelete()"
      >
        <div modalBody>
          ¿Eliminar la bodega <strong>"{{ warehouseToDelete()?.name }}"</strong>?
          Esta acción no se puede deshacer.
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="ghost" type="button" [fullWidth]="false" [disabled]="isDeleting()" (click)="cancelDelete()"></app-form-button>
          <app-form-button label="Eliminar" loadingLabel="Eliminando..." variant="danger" type="button" [fullWidth]="false" [loading]="isDeleting()" (click)="confirmDelete()"></app-form-button>
        </div>
      </app-modal>

      <!-- Modal: Cambios sin guardar -->
      <app-modal
        [isOpen]="isConfirmCloseOpen()"
        title="Cambios sin guardar"
        size="sm"
        (close)="isConfirmCloseOpen.set(false)"
      >
        <div modalBody>Tienes cambios sin guardar. ¿Deseas salir? Se perderán los datos ingresados.</div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Continuar editando" variant="ghost" type="button" [fullWidth]="false" (click)="isConfirmCloseOpen.set(false)"></app-form-button>
          <app-form-button label="Salir sin guardar" variant="danger" type="button" [fullWidth]="false" (click)="forceCloseDrawer()"></app-form-button>
        </div>
      </app-modal>
    </div>

    <!-- Mobile sticky footer -->
    <div class="mobile-fab">
      <button class="mobile-fab__btn" (click)="onAdd()">
        <ng-icon name="lucidePlus" size="18"></ng-icon>
        <span>Nueva Bodega</span>
      </button>
    </div>
    </div>
  `,
  styleUrl: './warehouses-list.component.scss'
})
export class WarehousesListComponent {
  private warehouseService = inject(WarehouseService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  @ViewChild('warehouseForm') warehouseFormRef!: WarehouseFormComponent;
  @ViewChild('advancedFilters') advancedFiltersRef!: WarehousesAdvancedFilters;

  // ── State ─────────────────────────────────────────────────────────────────
  searchQuery        = signal('');
  currentPage        = signal(1);
  pageSize           = signal(10);
  activeTab          = signal('Todas');
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile           = signal(false);
  viewMode           = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());
  sortField          = signal('createdAt');
  sortOrder          = signal<'ASC' | 'DESC'>('DESC');
  refreshTrigger     = signal(0);
  isLoading          = signal(true);

  isDrawerOpen       = signal(false);
  isEditing          = signal(false);
  isFiltersOpen      = signal(false);
  isConfirmCloseOpen = signal(false);
  isDeleteModalOpen  = signal(false);
  isDeleting         = signal(false);
  warehouseToDelete  = signal<Warehouse | null>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  filterTree = signal<FilterGroup>({
    type: 'group', id: 'root', logicalOperator: 'AND', children: []
  });

  availableFields: FilterField[] = [
    { id: 'name', label: 'Nombre', type: 'text' },
    { id: 'description', label: 'Descripción', type: 'text' },
    { id: 'isActive', label: 'Estado', type: 'status' },
    { id: 'hasLocations', label: 'Ubicaciones', type: 'status' },
    { id: 'createdAt', label: 'Fecha de Creación', type: 'text' },
  ];

  activeFiltersCount = computed(() => {
    const countLeaves = (node: FilterNode): number => {
      if (node.type === 'group') return node.children.reduce((acc, c) => acc + countLeaves(c), 0);
      const rule = node as FilterRule;
      return rule.value?.trim() ? 1 : 0;
    };
    return countLeaves(this.filterTree());
  });

  tabs = [
    { label: 'Todas', value: 'Todas' },
    { label: 'Activas', value: 'Activas' },
    { label: 'Inactivas', value: 'Inactivas' },
  ];

  sortOptions = [
    { label: 'Más Recientes', value: 'createdAt:desc' },
    { label: 'Más Antiguos', value: 'createdAt:asc' },
    { label: 'Nombre (A-Z)', value: 'name:asc' },
    { label: 'Nombre (Z-A)', value: 'name:desc' },
  ];

  cardActions: ActionItem[] = [
    { id: 'edit', label: 'Editar', icon: 'lucidePencil' },
    { id: 'history', label: 'Historial', icon: 'lucideHistory' },
    { id: 'delete', label: 'Eliminar', icon: 'lucideTrash2', variant: 'danger' },
  ];

  // ── Reactive data ─────────────────────────────────────────────────────────
  private readonly response = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      filterModel: QueryMapper.toAgGridFilterModel(this.filterTree(), this.availableFields),
      sortField: this.sortField(),
      sortOrder: this.sortOrder(),
      tab: this.activeTab(),
      refresh: this.refreshTrigger(),
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(p => {
        const filters: any = {
          page: p.page, limit: p.limit, search: p.search,
          sortField: p.sortField, sortOrder: p.sortOrder,
          filterModel: p.filterModel,
        };
        if (p.tab === 'Activas') filters.isActive = true;
        else if (p.tab === 'Inactivas') filters.isActive = false;
        return this.warehouseService.findAll(filters).pipe(
          tap(() => this.isLoading.set(false))
        );
      })
    )
  );

  warehouses = computed(() => this.response()?.data ?? []);
  totalItems = computed(() => this.response()?.total ?? 0);

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mq.matches);
      mq.addEventListener('change', e => this.isMobile.set(e.matches));
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  onTabChange(tab: string) { this.activeTab.set(tab); this.resetPagination(); }
  onSearch(q: string) { this.searchQuery.set(q); this.resetPagination(); }
  onSortChange(e: { field: string; order: string }) {
    this.sortField.set(e.field);
    this.sortOrder.set(e.order.toUpperCase() as 'ASC' | 'DESC');
    this.resetPagination();
  }

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

  onAdd() {
    this.isEditing.set(false);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.warehouseFormRef?.resetForm(), 0);
  }

  handleAction(action: ActionItem, wh: Warehouse) {
    if (action.id === 'edit') this.onEdit(wh);
    else if (action.id === 'history') this.onShowDetail(wh);
    else if (action.id === 'delete') this.onDelete(wh);
  }

  onShowDetail(wh: Warehouse) {
    this.router.navigate(['/inventario/bodegas', wh.id]);
  }

  onEdit(wh: Warehouse) {
    this.isEditing.set(true);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.warehouseFormRef?.setWarehouse(wh), 0);
  }

  onDelete(wh: Warehouse) {
    this.warehouseToDelete.set(wh);
    this.isDeleteModalOpen.set(true);
  }

  cancelDelete() {
    if (this.isDeleting()) return;
    this.isDeleteModalOpen.set(false);
    this.warehouseToDelete.set(null);
  }

  confirmDelete() {
    const wh = this.warehouseToDelete();
    if (!wh || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.warehouseService.remove(wh.id).subscribe({
      next: () => {
        this.toastService.success('Bodega eliminada correctamente');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleting.set(false);
        this.cancelDelete();
      },
      error: (err) => {
        this.toastService.error(err?.error?.data?.message ?? 'No se pudo eliminar la bodega');
        this.isDeleting.set(false);
      }
    });
  }

  onSaved() {
    this.isDrawerOpen.set(false);
    this.refreshTrigger.update(v => v + 1);
    this.resetPagination();
  }

  onDrawerClose() {
    if (this.warehouseFormRef?.hasUnsavedChanges()) {
      this.isConfirmCloseOpen.set(true);
    } else {
      this.isDrawerOpen.set(false);
      this.warehouseFormRef?.resetForm();
    }
  }

  forceCloseDrawer() {
    this.isConfirmCloseOpen.set(false);
    this.isDrawerOpen.set(false);
    this.warehouseFormRef?.resetForm();
  }

  private resetPagination() { this.currentPage.set(1); }
}
