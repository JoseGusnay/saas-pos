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
  lucideFolder,
  lucideInfo,
  lucideTag
} from '@ng-icons/lucide';

// UI Components
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

// Services & Models
import { CategoryService } from '../../../../core/services/category.service';
import { Category } from '../../../../core/models/category.models';
import { ToastService } from '../../../../core/services/toast.service';
import { ModalService } from '../../../../core/components/modal/modal.service';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap, tap } from 'rxjs';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';

// Componentes del Módulo
import { CategoriesAdvancedFilters } from '../../components/categories-advanced-filters/categories-advanced-filters';
import { CategoryFormComponent } from '../../components/category-form/category-form.component';
import { CategoryDetailComponent } from '../../components/category-detail/category-detail.component';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    NgIconComponent,
    CategoryFormComponent,
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
    CategoryDetailComponent
  ],
  providers: [
    provideIcons({ 
      lucidePlus, lucideSearch, lucideLayoutGrid, lucideList, 
      lucideFilter, lucideMoreVertical, lucidePencil, lucideTrash2, 
      lucideHistory, lucideInbox, lucideSave, lucideX,
      lucideChevronRight, lucideFolder, lucideInfo, lucideTag
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
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAddCategory()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar categorías..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="activeFiltersCount()"
        [viewMode]="viewModePreference()"
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
                   <div class="category-avatar" [style.background]="'var(--color-primary-subtle)'">
                      <ng-icon name="lucideFolder" [style.color]="'var(--color-primary)'"></ng-icon>
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
           <button class="btn btn-secondary" (click)="onShowHistory(selectedCategory()!.id)">
              <ng-icon name="lucideHistory"></ng-icon>
              Ver Historial
            </button>
            <button class="btn btn-primary" (click)="onEditCategory(selectedCategory()!)">
              <ng-icon name="lucidePencil"></ng-icon>
              Editar Categoría
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

      <app-drawer 
        [isOpen]="isDrawerOpen()" 
        [title]="isEditing() ? 'Editar Categoría' : 'Nueva Categoría'"
        [allowClose]="!catForm.isSubmitting()"
        (close)="onDrawerClose()"
        size="md">
        <div drawerBody>
          <app-category-form #catForm (saved)="onCategorySaved()"></app-category-form>
        </div>
        <div drawerFooter class="drawer-footer-actions">
           <app-form-button 
             label="Cancelar" 
             variant="secondary" 
             [disabled]="catForm.isSubmitting()"
             (click)="onDrawerClose()"
           ></app-form-button>
           <app-form-button 
             [label]="isEditing() ? 'Actualizar' : 'Guardar'"
             icon="lucideSave"
             [loading]="catForm.isSubmitting()"
             [disabled]="catForm.categoryForm.invalid"
             (click)="catForm.onSubmit()"
           ></app-form-button>
        </div>
      </app-drawer>

      <!-- Modal de Confirmación de Salida -->
      <app-modal 
        [isOpen]="isConfirmationModalOpen()" 
        [title]="'Cambios sin guardar'"
        (close)="onCancelExit()">
        
        <div modalBody>
          Tienes cambios en el formulario que no has guardado. ¿Estás seguro de que quieres salir? Se perderán todos los datos ingresados.
        </div>

        <div modalFooter class="modal-footer-actions">
          <app-form-button
            label="Continuar Editando"
            variant="secondary"
            (click)="onCancelExit()"
          ></app-form-button>
          <app-form-button
            label="Salir sin Guardar"
            variant="danger"
            (click)="onConfirmExit()"
          ></app-form-button>
        </div>
      </app-modal>

      <!-- Modal de Confirmación de Eliminación -->
      <app-modal 
        [isOpen]="isDeleteModalOpen()" 
        title="Confirmar Eliminación"
        (close)="isDeleteModalOpen.set(false)">
        <div modalBody>
          ¿Estás seguro de que deseas eliminar la categoría <strong>"{{ categoryToDelete()?.name }}"</strong>?
          Esta acción usará Soft Delete para mantener la integridad referencial.
        </div>
        <div modalFooter class="modal-footer-actions">
           <app-form-button
             label="Cancelar"
             variant="secondary"
             (click)="isDeleteModalOpen.set(false)"
           ></app-form-button>
           <app-form-button
             label="Eliminar Categoría"
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
  styleUrl: './categories-list.component.scss'
})
export class CategoriesListComponent {
  private categoryService = inject(CategoryService);
  private toastService = inject(ToastService);
  private modalService = inject(ModalService);

  categoryActions: ActionItem[] = [
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
  selectedCategory = signal<Category | null>(null);
  isHistoryOpen = signal(false);
  isHistoryLoading = signal(false);
  isDeleteModalOpen = signal(false);
  isDeleting = signal(false);
  
  categoryLogs = signal<any[]>([]);
  categoryToDelete = signal<Category | null>(null);
  isConfirmationModalOpen = signal(false);

  @ViewChild('catForm') categoryFormRef?: CategoryFormComponent;

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
        if (tab === 'Inactivas') {
          filters.filterModel['status'] = { filterType: 'text', type: 'equals', filter: 'INACTIVE' };
        } else if (tab === 'Activas') {
          filters.filterModel['status'] = { filterType: 'text', type: 'equals', filter: 'ACTIVE' };
        }
        return this.categoryService.findAll(filters).pipe(
          tap(() => this.isLoading.set(false))
        );
      })
    )
  );

  categories = computed(() => this.response()?.data || []);
  totalItems = computed(() => this.response()?.total || 0);

  categoryTabs = [
    { label: 'Todas', value: 'Todas' },
    { label: 'Activas', value: 'Activas' },
    { label: 'Inactivas', value: 'Inactivas' },
  ];
  activeTab = signal('Todas');

  availableFields: FilterField[] = [
    { id: 'name', label: 'Nombre', type: 'text' },
    { id: 'description', label: 'Descripción', type: 'text' },
    { id: 'status', label: 'Estado', type: 'status' },
    { id: 'createdAt', label: 'Creación', type: 'text' }
  ];

  filterTree = signal<FilterGroup>({
    type: 'group',
    id: 'root',
    logicalOperator: 'AND',
    children: []
  });

  mappedLogs = computed<DatelineItem[]>(() => {
    return this.categoryLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: log.action === 'CREATE' ? 'Creación' : log.action === 'UPDATE' ? 'Edición' : 'Borrado',
      user: log.userName || 'Sistema',
      icon: log.action === 'CREATE' ? 'lucideFolder' : 'lucidePencil',
      changes: log.action === 'UPDATE' ? this.getChanges(log.details) : undefined
    }));
  });

  onTabChange(tab: string) {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  onSearch(q: string) {
    this.searchQuery.set(q);
    this.currentPage.set(1);
  }

  onAddCategory() {
    this.isEditing.set(false);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.categoryFormRef?.resetForm(), 0);
  }

  onShowDetail(cat: Category) {
    this.selectedCategory.set(cat);
    this.isDetailOpen.set(true);
  }

  onEditCategory(cat: Category) {
    this.isDetailOpen.set(false);
    this.isEditing.set(true);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.categoryFormRef?.setCategory(cat), 0);
  }

  handleActionClick(action: ActionItem, cat: Category) {
    if (action.id === 'edit') {
      this.onEditCategory(cat);
    } else if (action.id === 'history') {
      this.onShowHistory(cat.id);
    } else if (action.id === 'delete') {
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
      error: () => this.isHistoryLoading.set(false)
    });
  }

  confirmDelete() {
    const cat = this.categoryToDelete();
    if (!cat) return;
    this.isDeleting.set(true);
    this.categoryService.remove(cat.id).subscribe({
      next: () => {
        this.toastService.success('Categoría eliminada');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleteModalOpen.set(false);
        this.isDeleting.set(false);
      },
      error: () => this.isDeleting.set(false)
    });
  }

  onDrawerClose() {
    if (this.categoryFormRef?.hasUnsavedChanges()) {
      this.isConfirmationModalOpen.set(true);
    } else {
      this.closeDrawer();
    }
  }

  onConfirmExit() {
    this.isConfirmationModalOpen.set(false);
    this.closeDrawer();
  }

  onCancelExit() {
    this.isConfirmationModalOpen.set(false);
  }

  private closeDrawer() {
    this.isDrawerOpen.set(false);
    this.categoryFormRef?.resetForm();
  }

  onSortChange(event: { field: string, order: 'asc' | 'desc' }) {
    // Current pagination implementation might need adjustment for backend sorting
    // but we can pass it through a refresh trigger or similar if service supports it
    // For now, let's just log or implement if service expects it
    this.refreshTrigger.update(v => v + 1);
  }

  onCategorySaved() {
    this.isDrawerOpen.set(false);
    this.refreshTrigger.update(v => v + 1);
  }

  openAdvancedFilters() {
    this.modalService.open(
      CategoriesAdvancedFilters,
      'Filtros Avanzados',
      {
        filterTree: this.filterTree,
        availableFields: this.availableFields,
        onFilterTreeChange: (tree: FilterNode) => this.filterTree.set(tree as FilterGroup)
      },
      'Los filtros se aplican en tiempo real',
      [
        {
          label: 'Hecho',
          variant: 'primary',
          action: () => this.modalService.close()
        }
      ]
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

  private getChanges(details: any) {
    // Basic change set calculation logic
    return [];
  }
}
