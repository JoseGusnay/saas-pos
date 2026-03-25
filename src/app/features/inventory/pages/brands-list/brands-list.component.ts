import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideDownload,
  lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash,
  lucideGlobe, lucideCloudDownload,
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

import { BrandService } from '../../../../core/services/brand.service';
import { Brand } from '../../../../core/models/brand.models';
import { ToastService } from '../../../../core/services/toast.service';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';

import { BrandFormComponent } from '../../components/brand-form/brand-form';
import { BrandDetailComponent } from '../../components/brand-detail/brand-detail.component';
import { BrandsAdvancedFilters } from './components/brands-advanced-filters/brands-advanced-filters';
import { BrandImportModalComponent } from '../../components/brand-import-modal/brand-import-modal';

@Component({
  selector: 'app-brands-list',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DataCardComponent, SkeletonComponent, EmptyStateComponent,
    DrawerComponent, ModalComponent, SpinnerComponent,
    FormButtonComponent, ActionsMenuComponent, DatelineComponent,
    BrandFormComponent, BrandDetailComponent, BrandsAdvancedFilters,
    BrandImportModalComponent, NgIconComponent,
  ],
  providers: [
    provideIcons({
      lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideDownload,
      lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash,
      lucideGlobe, lucideCloudDownload,
    })
  ],
  template: `
    <div class="page-shell">
    <div class="brands-page">
      <app-page-header
        title="Marcas"
        [tabs]="brandTabs"
        [activeTab]="activeTab()"
        ctaText="Nueva Marca"
        ctaIcon="lucidePlus"
        secondaryCtaText="Importar"
        secondaryCtaIcon="lucideDownload"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAddBrand()"
        (secondaryCtaClick)="importModal.open()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar marcas..."
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

      <div [ngClass]="viewMode() === 'grid' ? 'brands-page__grid' : 'brands-page__list'">
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
                </div>
              </div>
            } @else {
              <div class="brand-row-item skeleton-row">
                <div class="row-main">
                  <app-skeleton width="44px" height="44px" radius="8px"></app-skeleton>
                  <div class="brand-info">
                    <app-skeleton width="140px" height="1rem"></app-skeleton>
                    <app-skeleton width="100px" height="0.875rem" style="margin-top: 6px"></app-skeleton>
                  </div>
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
        } @else if (brands().length > 0) {
          @for (brand of brands(); track brand.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                [title]="brand.name"
                [status]="brand.status === 'ACTIVE' ? 'Activa' : 'Inactiva'"
                [statusConfig]="brand.status === 'ACTIVE' ? 'active' : 'inactive'"
                [details]="[
                  { icon: 'lucideGlobe', text: brand.country || 'Nacional' }
                ]"
                [actions]="brandActions"
                (actionClick)="handleActionClick($event, brand)"
                (click)="onShowDetail(brand)"
                class="clickable-card"
              ></app-data-card>
            } @else {
              <div class="brand-row-item" (click)="onShowDetail(brand)">
                <div class="row-main">
                  <div class="brand-avatar">
                    <span>{{ brand.name[0].toUpperCase() }}</span>
                  </div>
                  <div class="brand-info">
                    <span class="brand-name">{{ brand.name }}</span>
                    <span class="brand-sub">{{ brand.country || 'Nacional' }}</span>
                  </div>
                </div>
                <div class="row-status">
                  <span [class]="'badge-status ' + (brand.status === 'ACTIVE' ? 'active' : 'inactive')">
                    {{ brand.status === 'ACTIVE' ? 'Activa' : 'Inactiva' }}
                  </span>
                </div>
                <div class="row-actions" (click)="$event.stopPropagation()">
                  <app-actions-menu
                    [actions]="brandActions"
                    (actionClick)="handleActionClick($event, brand)"
                  ></app-actions-menu>
                </div>
              </div>
            }
          }
        } @else {
          <div class="brands-page__empty">
            <app-empty-state
              [icon]="activeFiltersCount() > 0 || searchQuery() ? 'lucideSearch' : 'lucideInbox'"
              [title]="activeFiltersCount() > 0 || searchQuery() ? 'No encontramos lo que buscas' : 'No hay marcas registradas'"
              [description]="activeFiltersCount() > 0 || searchQuery() ? 'Intenta con otros términos o ajusta tus filtros.' : 'Parece que aún no has creado ninguna marca.'"
              [actionLabel]="activeFiltersCount() > 0 || searchQuery() ? 'Limpiar Filtros' : 'Nueva Marca'"
              (action)="activeFiltersCount() > 0 || searchQuery() ? clearAllFilters() : onAddBrand()"
            ></app-empty-state>
          </div>
        }
      </div>

      <!-- Drawer: Detalle -->
      <app-drawer
        [isOpen]="isDetailOpen()"
        title="Detalle de Marca"
        (close)="isDetailOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          @if (selectedBrand()) {
            <app-brand-detail [brand]="selectedBrand()!"></app-brand-detail>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Historial" icon="lucideHistory" variant="ghost" type="button"
            [fullWidth]="false" (click)="onShowHistory(selectedBrand()!.id)"></app-form-button>
          <app-form-button label="Editar Marca" icon="lucidePencil" variant="secondary" type="button"
            [fullWidth]="false" (click)="onEditBrand(selectedBrand()!)"></app-form-button>
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
          <app-brands-advanced-filters
            #advancedFilters
            [filterTree]="filterTree"
            [availableFields]="availableFields"
            (applied)="onFilterTreeChange($event); isFiltersOpen.set(false)"
          ></app-brands-advanced-filters>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary"
            (click)="isFiltersOpen.set(false)"></app-form-button>
          <app-form-button label="Aplicar filtros" variant="primary"
            (click)="advancedFilters.applyFilters()"></app-form-button>
        </div>
      </app-drawer>

      <!-- Drawer: Crear/Editar Marca -->
      <app-drawer
        [isOpen]="isDrawerOpen()"
        [title]="isEditing() ? 'Editar Marca' : 'Nueva Marca'"
        [allowClose]="!(brandForm?.isSubmitting())"
        (close)="onDrawerClose()"
        size="md"
      >
        <div drawerBody>
          <app-brand-form
            #brandForm
            (saved)="onBrandSaved($event)"
          ></app-brand-form>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" type="button"
            [disabled]="!!(brandForm?.isSubmitting())" (click)="onDrawerClose()"></app-form-button>
          <app-form-button
            [label]="isEditing() ? 'Actualizar Marca' : 'Guardar Marca'"
            loadingLabel="Guardando..." icon="lucideSave"
            [loading]="!!(brandForm?.isSubmitting())"
            [disabled]="brandForm?.brandForm?.invalid ?? true"
            (click)="brandForm?.onSubmit()"
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
          ¿Eliminar la marca <strong>"{{ brandToDelete()?.name }}"</strong>?
          Esta acción no se puede deshacer.
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="ghost" type="button" [fullWidth]="false"
            [disabled]="isDeleting()" (click)="cancelDelete()"></app-form-button>
          <app-form-button label="Eliminar" loadingLabel="Eliminando..." variant="danger" type="button"
            [fullWidth]="false" [loading]="isDeleting()" (click)="confirmDelete()"></app-form-button>
        </div>
      </app-modal>

      <app-brand-import-modal
        #importModal
        (imported)="refreshTrigger.update(v => v + 1)"
      ></app-brand-import-modal>
    </div>

    <!-- Mobile sticky footer -->
    <div class="mobile-fab">
      <button class="mobile-fab__btn" (click)="onAddBrand()">
        <ng-icon name="lucidePlus" size="18"></ng-icon>
        <span>Nueva Marca</span>
      </button>
    </div>
    </div>
  `,
  styleUrl: './brands-list.component.scss'
})
export class BrandsListComponent {
  private brandService = inject(BrandService);
  private toastService = inject(ToastService);

  @ViewChild('brandForm') brandFormRef?: BrandFormComponent;
  @ViewChild('advancedFilters') advancedFiltersRef!: BrandsAdvancedFilters;
  @ViewChild('importModal') importModal!: BrandImportModalComponent;

  brandActions: ActionItem[] = [
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
  selectedBrand      = signal<Brand | null>(null);
  isHistoryOpen      = signal(false);
  isHistoryLoading   = signal(false);
  isDeleteModalOpen  = signal(false);
  isDeleting         = signal(false);
  brandToDelete      = signal<Brand | null>(null);
  brandLogs          = signal<any[]>([]);

  // ── Config ───────────────────────────────────────────────────────────────────
  brandTabs = [
    { label: 'Todas', value: 'Todas' },
    { label: 'Activas', value: 'Activas' },
    { label: 'Inactivas', value: 'Inactivas' },
  ];
  activeTab = signal('Todas');

  sortOptions = [
    { label: 'Más Recientes', value: 'createdAt:desc' },
    { label: 'Más Antiguos', value: 'createdAt:asc' },
    { label: 'Nombre (A-Z)', value: 'name:asc' },
    { label: 'Nombre (Z-A)', value: 'name:desc' },
  ];

  availableFields: FilterField[] = [
    { id: 'name', label: 'Nombre', type: 'text' },
    { id: 'country', label: 'País', type: 'text' },
    { id: 'status', label: 'Estado', type: 'status' },
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
    this.brandLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: this.getLogActionLabel(log.action),
      user: log.userName || 'Sistema',
      icon: this.getLogIcon(log.action),
      message: log.action === 'IMPORT' ? `Importación masiva de ${log.details?.count} marcas.` : undefined,
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
        if (tab === 'Activas') filters.filterModel['status'] = { filterType: 'text', type: 'equals', filter: 'ACTIVE' };
        else if (tab === 'Inactivas') filters.filterModel['status'] = { filterType: 'text', type: 'equals', filter: 'INACTIVE' };
        return this.brandService.findAll(filters).pipe(tap(() => this.isLoading.set(false)));
      })
    )
  );

  brands = computed(() => this.response()?.data || []);
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
  onAddBrand() {
    this.isEditing.set(false);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.brandFormRef?.resetForm(), 0);
  }

  onEditBrand(brand: Brand) {
    this.isDetailOpen.set(false);
    this.isEditing.set(true);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.brandFormRef?.setBrand(brand), 0);
  }

  onBrandSaved(_brand: Brand) {
    this.isDrawerOpen.set(false);
    this.refreshTrigger.update(v => v + 1);
    this.resetPagination();
  }

  onDrawerClose() {
    if (this.brandFormRef?.hasUnsavedChanges()) {
      this.isConfirmCloseOpen.set(true);
    } else {
      this.isDrawerOpen.set(false);
      this.brandFormRef?.resetForm();
    }
  }

  forceCloseDrawer() {
    this.isConfirmCloseOpen.set(false);
    this.isDrawerOpen.set(false);
    this.brandFormRef?.resetForm();
  }

  // ── Detail & History ──────────────────────────────────────────────────────────
  onShowDetail(brand: Brand) {
    this.selectedBrand.set(brand);
    this.isDetailOpen.set(true);
  }

  handleActionClick(action: ActionItem, brand: Brand) {
    if (action.id === 'edit') this.onEditBrand(brand);
    else if (action.id === 'history') this.onShowHistory(brand.id);
    else if (action.id === 'delete') {
      this.brandToDelete.set(brand);
      this.isDeleteModalOpen.set(true);
    }
  }

  onShowHistory(id: string) {
    this.isDetailOpen.set(false);
    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);
    this.brandService.getLogs(id).subscribe({
      next: logs => {
        this.brandLogs.set(logs);
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
    this.brandToDelete.set(null);
  }

  confirmDelete() {
    const b = this.brandToDelete();
    if (!b || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.brandService.remove(b.id).subscribe({
      next: () => {
        this.toastService.success('Marca eliminada correctamente');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleting.set(false);
        this.cancelDelete();
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? 'No se pudo eliminar la marca');
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
      { field: 'country', label: 'País' },
      { field: 'status', label: 'Estado' },
    ];
    return fields
      .filter(f => JSON.stringify(oldData[f.field]) !== JSON.stringify(newData[f.field]))
      .map(f => ({
        ...f,
        oldValue: this.formatValue(oldData[f.field]),
        newValue: this.formatValue(newData[f.field]),
      }));
  }

  private formatValue(val: any): string {
    if (val === 'ACTIVE') return 'Activa';
    if (val === 'INACTIVE') return 'Inactiva';
    return String(val || '');
  }
}
