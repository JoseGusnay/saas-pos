import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus,
  lucideSearch,
  lucidePencil,
  lucideTrash2,
  lucideHistory,
  lucideInbox,
  lucideSave,
  lucideFolder,
  lucideInfo,
  lucidePlusCircle,
  lucideRefreshCw,
  lucideTrash,
  lucideCloudDownload,
  lucideDownload,
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

import { CategoryService } from '../../../../core/services/category.service';
import { Category } from '../../../../core/models/category.models';
import { ToastService } from '../../../../core/services/toast.service';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap, tap } from 'rxjs';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';

import { CategoryFormComponent } from '../../components/category-form/category-form.component';
import { CategoriesAdvancedFilters } from '../../components/categories-advanced-filters/categories-advanced-filters';
import { CategoryDetailComponent } from '../../components/category-detail/category-detail.component';
import { CategoryImportModalComponent } from '../../components/category-import-modal/category-import-modal';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [
    CommonModule,
    NgIconComponent,
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
    FormButtonComponent,
    CategoryFormComponent,
    CategoriesAdvancedFilters,
    CategoryDetailComponent,
    CategoryImportModalComponent,
  ],
  providers: [
    provideIcons({
      lucidePlus, lucideSearch, lucidePencil, lucideTrash2,
      lucideFolder, lucideInfo,
      lucidePlusCircle, lucideRefreshCw, lucideTrash, lucideCloudDownload,
      lucideDownload, lucideHistory,
    })
  ],
  template: `
    <div class="categories-page">
      <app-page-header
        title="Categorías"
        [tabs]="categoryTabs"
        [activeTab]="activeTab()"
        ctaText="Nueva Categoría"
        ctaIcon="lucidePlus"
        secondaryCtaText="Importar"
        secondaryCtaIcon="lucideDownload"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAddCategory()"
        (secondaryCtaClick)="importModal.open()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar categorías..."
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

      <div [ngClass]="viewMode() === 'grid' ? 'categories-page__grid' : 'categories-page__list'">
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
                    <app-skeleton width="180px" height="0.875rem"></app-skeleton>
                  </div>
                </div>
              </div>
            } @else {
              <div class="category-row-item skeleton-row">
                <div class="row-main">
                  <app-skeleton width="44px" height="44px" radius="12px"></app-skeleton>
                  <div class="category-info">
                    <app-skeleton width="140px" height="1rem"></app-skeleton>
                    <app-skeleton width="180px" height="0.875rem" style="margin-top: 4px"></app-skeleton>
                  </div>
                </div>
                <div class="row-parent">
                  <app-skeleton width="80px" height="10px" style="margin-bottom: 4px"></app-skeleton>
                  <app-skeleton width="120px" height="13px"></app-skeleton>
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
        } @else if (categories().length > 0) {
          @if (viewMode() === 'grid') {
            @for (category of categories(); track category.id) {
              <app-data-card
                [title]="category.name"
                [status]="category.status === 'ACTIVE' ? 'Activa' : 'Inactiva'"
                [statusConfig]="category.status === 'ACTIVE' ? 'active' : 'inactive'"
                [details]="[
                  { icon: 'lucideInfo', text: category.description || 'Sin descripción' }
                ]"
                [actions]="categoryActions"
                (actionClick)="handleActionClick($event, category)"
                (click)="onShowDetail(category)"
              >
                <div cardBody class="category-card-info">
                  @if (category.parent) {
                    <div class="parent-info">
                      <span class="label">Padre:</span>
                      <span class="value">{{ category.parent.name }}</span>
                    </div>
                  }
                </div>
              </app-data-card>
            }
          } @else {
            @for (category of categories(); track category.id) {
              <div class="category-row-item" (click)="onShowDetail(category)">
                <div class="row-main">
                  <div class="category-avatar">
                    <ng-icon name="lucideFolder"></ng-icon>
                  </div>
                  <div class="category-info">
                    <span class="category-name">{{ category.name }}</span>
                    <span class="category-sub">{{ category.description || 'Sin descripción' }}</span>
                  </div>
                </div>
                <div class="row-parent">
                  <span class="row-label">Categoría Padre</span>
                  <span class="row-value">{{ category.parent?.name || 'Nivel Raíz' }}</span>
                </div>
                <div class="row-status">
                  <span [class]="'badge-status ' + (category.status === 'ACTIVE' ? 'active' : 'inactive')">
                    {{ category.status === 'ACTIVE' ? 'Activa' : 'Inactiva' }}
                  </span>
                </div>
                <div class="row-actions" (click)="$event.stopPropagation()">
                  <app-actions-menu
                    [actions]="categoryActions"
                    (actionClick)="handleActionClick($event, category)"
                  ></app-actions-menu>
                </div>
              </div>
            }
          }
        } @else {
          <div class="categories-page__empty">
            <app-empty-state
              [icon]="activeFiltersCount() > 0 || searchQuery() ? 'lucideSearch' : 'lucideInbox'"
              [title]="activeFiltersCount() > 0 || searchQuery() ? 'No encontramos lo que buscas' : 'No hay categorías registradas'"
              [description]="activeFiltersCount() > 0 || searchQuery() ? 'Ajusta tus filtros o busca otro término.' : 'Parece que aún no tienes categorías configuradas.'"
              [actionLabel]="activeFiltersCount() > 0 || searchQuery() ? 'Limpiar Filtros' : 'Nueva Categoría'"
              (action)="activeFiltersCount() > 0 || searchQuery() ? clearAllFilters() : onAddCategory()"
            ></app-empty-state>
          </div>
        }
      </div>

      <!-- Drawer de Detalle -->
      <app-drawer
        [isOpen]="isDetailOpen()"
        title="Detalle de Categoría"
        (close)="isDetailOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          @if (selectedCategory()) {
            <app-category-detail
              [category]="selectedCategory()!"
            ></app-category-detail>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button
            label="Historial"
            icon="lucideHistory"
            variant="ghost"
            type="button"
            [fullWidth]="false"
            (click)="onShowHistory(selectedCategory()!.id)"
          ></app-form-button>
          <app-form-button
            label="Editar Categoría"
            icon="lucidePencil"
            variant="secondary"
            type="button"
            [fullWidth]="false"
            (click)="onEditCategory(selectedCategory()!)"
          ></app-form-button>
        </div>
      </app-drawer>

      <!-- Drawer de Historial -->
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

      <!-- Drawer de Filtros Avanzados -->
      <app-drawer
        [isOpen]="isFiltersOpen()"
        title="Filtros Avanzados"
        (close)="isFiltersOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          <app-categories-advanced-filters
            #advancedFilters
            [filterTree]="filterTree"
            [availableFields]="availableFields"
            (applied)="onFilterTreeChange($event); isFiltersOpen.set(false)"
          ></app-categories-advanced-filters>
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

      <!-- Drawer de Crear/Editar Categoría -->
      <app-drawer
        [isOpen]="isDrawerOpen()"
        [title]="isEditing() ? 'Editar Categoría' : 'Nueva Categoría'"
        [allowClose]="!(catForm?.isSubmitting())"
        (close)="onDrawerClose()"
        size="md"
      >
        <div drawerBody>
          <app-category-form
            #catForm
            (saved)="onCategorySaved($event)"
          ></app-category-form>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button
            label="Cancelar"
            variant="secondary"
            type="button"
            [disabled]="!!(catForm?.isSubmitting())"
            (click)="onDrawerClose()"
          ></app-form-button>
          <app-form-button
            [label]="isEditing() ? 'Actualizar Categoría' : 'Guardar Categoría'"
            loadingLabel="Guardando..."
            icon="lucideSave"
            [loading]="!!(catForm?.isSubmitting())"
            [disabled]="catForm?.categoryForm?.invalid ?? true"
            (click)="catForm?.onSubmit()"
          ></app-form-button>
        </div>
      </app-drawer>

      <!-- Modal de Cambios Sin Guardar -->
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

      <!-- Modal de Confirmación de Eliminación -->
      <app-modal
        [isOpen]="isDeleteModalOpen()"
        title="Confirmar Eliminación"
        size="sm"
        [allowClose]="!isDeleting()"
        (close)="cancelDelete()"
      >
        <div modalBody>
          ¿Eliminar la categoría <strong>"{{ categoryToDelete()?.name }}"</strong>?
          Esta acción no se puede deshacer.
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="ghost" type="button" [fullWidth]="false"
            [disabled]="isDeleting()" (click)="cancelDelete()"></app-form-button>
          <app-form-button label="Eliminar" loadingLabel="Eliminando..." variant="danger" type="button"
            [fullWidth]="false" [loading]="isDeleting()" (click)="confirmDelete()"></app-form-button>
        </div>
      </app-modal>

      <app-category-import-modal
        #importModal
        (imported)="refreshTrigger.update(v => v + 1)"
      ></app-category-import-modal>
    </div>
  `,
  styleUrl: './categories-list.component.scss'
})
export class CategoriesListComponent {
  private categoryService = inject(CategoryService);
  private toastService = inject(ToastService);

  @ViewChild('catForm') catFormRef?: CategoryFormComponent;
  @ViewChild('advancedFilters') advancedFiltersRef!: CategoriesAdvancedFilters;
  @ViewChild('importModal') importModal!: CategoryImportModalComponent;

  categoryActions: ActionItem[] = [
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
  pageSize           = signal(12);

  isDrawerOpen       = signal(false);
  isEditing          = signal(false);
  isFiltersOpen      = signal(false);
  isConfirmCloseOpen = signal(false);
  isDetailOpen       = signal(false);
  selectedCategory   = signal<Category | null>(null);
  isHistoryOpen      = signal(false);
  isHistoryLoading   = signal(false);
  isDeleteModalOpen  = signal(false);
  isDeleting         = signal(false);
  categoryToDelete   = signal<Category | null>(null);
  categoryLogs       = signal<any[]>([]);

  // ── Config ───────────────────────────────────────────────────────────────────
  categoryTabs = [
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
    { id: 'description', label: 'Descripción', type: 'text' },
    { id: 'status', label: 'Estado', type: 'status' },
    { id: 'createdAt', label: 'Creación', type: 'text' },
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
    this.categoryLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: this.getLogActionLabel(log.action),
      user: log.userName || 'Sistema',
      icon: this.getLogIcon(log.action),
      message: log.action === 'IMPORT' ? `Importación masiva de ${log.details?.count} categorías.` : undefined,
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
        if (tab === 'Activas') {
          filters.filterModel['status'] = { filterType: 'text', type: 'equals', filter: 'ACTIVE' };
        } else if (tab === 'Inactivas') {
          filters.filterModel['status'] = { filterType: 'text', type: 'equals', filter: 'INACTIVE' };
        }
        return this.categoryService.findAll(filters).pipe(
          tap(() => this.isLoading.set(false))
        );
      })
    )
  );

  categories = computed(() => this.response()?.data || []);
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
  onAddCategory() {
    this.isEditing.set(false);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.catFormRef?.resetForm(), 0);
  }

  onEditCategory(cat: Category) {
    this.isDetailOpen.set(false);
    this.isEditing.set(true);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.catFormRef?.setCategory(cat), 0);
  }

  onCategorySaved(_cat: Category) {
    this.isDrawerOpen.set(false);
    this.refreshTrigger.update(v => v + 1);
    this.resetPagination();
  }

  onDrawerClose() {
    if (this.catFormRef?.hasUnsavedChanges()) {
      this.isConfirmCloseOpen.set(true);
    } else {
      this.isDrawerOpen.set(false);
      this.catFormRef?.resetForm();
    }
  }

  forceCloseDrawer() {
    this.isConfirmCloseOpen.set(false);
    this.isDrawerOpen.set(false);
    this.catFormRef?.resetForm();
  }

  // ── Detail & History ──────────────────────────────────────────────────────────
  onShowDetail(cat: Category) {
    this.selectedCategory.set(cat);
    this.isDetailOpen.set(true);
  }

  handleActionClick(action: ActionItem, cat: Category) {
    if (action.id === 'edit') this.onEditCategory(cat);
    else if (action.id === 'history') this.onShowHistory(cat.id);
    else if (action.id === 'delete') {
      this.categoryToDelete.set(cat);
      this.isDeleteModalOpen.set(true);
    }
  }

  onShowHistory(id: string) {
    this.isDetailOpen.set(false);
    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);
    this.categoryService.getLogs(id).subscribe({
      next: logs => {
        this.categoryLogs.set(logs);
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
    this.categoryToDelete.set(null);
  }

  confirmDelete() {
    const cat = this.categoryToDelete();
    if (!cat || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.categoryService.remove(cat.id).subscribe({
      next: () => {
        this.toastService.success('Categoría eliminada correctamente');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleting.set(false);
        this.cancelDelete();
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? 'No se pudo eliminar la categoría');
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
      { field: 'description', label: 'Descripción' },
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
