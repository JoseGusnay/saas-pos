import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap, map } from 'rxjs';
import { Router } from '@angular/router';

import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';
import { ModalService } from '../../../../core/components/modal/modal.service';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { ProductService } from '../../services/product.service';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';

import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { DatelineComponent, DatelineItem } from '../../../../shared/components/ui/dateline/dateline.component';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { ActionItem, ActionsMenuComponent } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideDownload, lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash, lucideGlobe, lucideSearch, lucideCheckCircle2, lucideXCircle, lucideCloudDownload, lucideFileText, lucideInbox, lucideTag, lucideDollarSign, lucideChevronDown, lucideHash, lucideBarcode, lucideClock, lucidePackage } from '@ng-icons/lucide';
import { ToastService } from '../../../../core/services/toast.service';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { ProductImportModalComponent } from '../../components/product-import-modal/product-import-modal';
import { QueryNodeComponent } from '../../../../core/components/query-node/query-node.component';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    ListToolbarComponent,
    PaginationComponent,
    DataCardComponent,
    SkeletonComponent,
    EmptyStateComponent,
    DrawerComponent,
    DatelineComponent,
    ModalComponent,
    SpinnerComponent,
    ActionsMenuComponent,
    FormButtonComponent,
    ProductImportModalComponent,
    QueryNodeComponent,
    NgIconComponent
  ],
  providers: [
    provideIcons({ lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideDownload, lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash, lucideGlobe, lucideSearch, lucideCheckCircle2, lucideXCircle, lucideCloudDownload, lucideFileText, lucideInbox, lucideTag, lucideDollarSign, lucideChevronDown, lucideHash, lucideBarcode, lucideClock, lucidePackage })
  ],
  template: `
    <div class="products-page">
      <app-page-header
        title="Catálogo de Productos"
        [tabs]="productTabs"
        [activeTab]="activeTab()"
        ctaText="Nuevo Producto"
        ctaIcon="lucidePlus"
        secondaryCtaText="Importar"
        secondaryCtaIcon="lucideDownload"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onFullAddProduct()"
        (secondaryCtaClick)="importModal.open()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar por nombre, SKU, código de barras..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="activeFiltersCount()"
        [viewMode]="viewModePreference()"
        (openFilters)="openAdvancedFilters()"
        (clearFilters)="clearAllFilters()"
        (searchChange)="onSearch($event)"
        (viewModeChange)="viewModePreference.set($event)"
        (sortChange)="onSortChange($event)"
      ></app-list-toolbar>

      <div [ngClass]="viewMode() === 'grid' ? 'products-page__grid' : 'products-page__list'">
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
                  <div class="data-card__detail">
                    <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
                    <app-skeleton width="140px" height="0.875rem"></app-skeleton>
                  </div>
                  <div class="data-card__detail">
                    <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
                    <app-skeleton width="130px" height="0.875rem"></app-skeleton>
                  </div>
                  <div class="data-card__detail data-card__price">
                    <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
                    <app-skeleton width="100px" height="1rem"></app-skeleton>
                  </div>
                  <div class="data-card__detail data-card__footer-info">
                    <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
                    <app-skeleton width="80px" height="0.75rem"></app-skeleton>
                  </div>
                </div>
              </div>
            } @else {
              <div class="product-row-item skeleton-row">
                 <div class="row-main">
                    <app-skeleton width="44px" height="44px" radius="10px"></app-skeleton>
                    <div class="product-info">
                       <app-skeleton width="140px" height="1.1rem"></app-skeleton>
                       <app-skeleton width="100px" height="0.875rem" style="margin-top: 4px"></app-skeleton>
                    </div>
                 </div>
                 <div class="row-stats" style="flex: 1; display: flex; justify-content: space-around;">
                   <div class="stat-group">
                      <app-skeleton width="60px" height="12px" style="margin-bottom: 4px;"></app-skeleton>
                      <app-skeleton width="80px" height="16px"></app-skeleton>
                   </div>
                   <div class="stat-group">
                      <app-skeleton width="40px" height="12px" style="margin-bottom: 4px;"></app-skeleton>
                      <app-skeleton width="60px" height="16px"></app-skeleton>
                   </div>
                   <div class="stat-group">
                      <app-skeleton width="60px" height="12px" style="margin-bottom: 4px;"></app-skeleton>
                      <app-skeleton width="80px" height="16px"></app-skeleton>
                   </div>
                 </div>
                 <app-skeleton width="80px" height="24px" radius="99px" style="margin-left: 1rem;"></app-skeleton>
                 <app-skeleton width="32px" height="32px" shape="circle"></app-skeleton>
              </div>
            }
          }
        } @else if (response().data.length > 0) {
          @for (product of response().data; track product.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                [title]="product.name"
                [status]="product.isActive ? 'Activo' : 'Inactivo'"
                [statusConfig]="product.isActive ? 'active' : 'inactive'"
                [actions]="productActions"
                (click)="onShowDetail(product)"
                (actionClick)="handleActionClick($event, product)"
              >
                  <div class="data-card__detail">
                    <ng-icon name="lucideTag"></ng-icon>
                    <span>{{ product.category?.name || 'Varios' }} • {{ product.brand?.name || 'Sin Marca' }}</span>
                  </div>
                  <div class="data-card__detail">
                    <ng-icon name="lucidePackage"></ng-icon>
                    <span>Tipo: {{ product.type || 'Físico' }}</span>
                  </div>
                  <div class="data-card__detail">
                    <ng-icon name="lucideHash"></ng-icon>
                    <span>{{ product.variants?.length || 0 }} Variante(s)</span>
                  </div>
                  <div class="data-card__detail">
                    <ng-icon name="lucideBarcode"></ng-icon>
                    <span>SKU: {{ product.variants?.[0]?.sku || 'N/A' }}</span>
                  </div>
                  <div class="data-card__detail data-card__price">
                    <ng-icon name="lucideDollarSign"></ng-icon>
                    <span>Desde {{ (getMinPrice(product) || 0) | currency }}</span>
                  </div>
                  <div class="data-card__detail data-card__footer-info">
                    <ng-icon name="lucideClock"></ng-icon>
                    <span>Act. {{ product.updatedAt | date:'shortDate' }}</span>
                  </div>
              </app-data-card>
            } @else {
              <div class="product-row-item" (click)="onShowDetail(product)">
                 <div class="row-main">
                    <div class="product-avatar">
                      @if (product.imageUrl) {
                        <img [src]="product.imageUrl" class="product-avatar-img">
                      } @else {
                        {{ product.name[0].toUpperCase() }}
                      }
                    </div>
                    <div class="product-info">
                       <span class="product-name">{{ product.name }}</span>
                       <span class="product-sub">
                         {{ product.category?.name || 'Sin Categoría' }} • {{ product.brand?.name || 'Sin Marca' }}
                       </span>
                    </div>
                 </div>
                 <div class="row-stats" style="flex: 1; display: flex; justify-content: space-around;">
                   <div class="stat-group">
                     <span class="stat-label">SKU Principal</span>
                     <span class="stat-value">{{ product.variants?.[0]?.sku || 'N/A' }}</span>
                   </div>
                   <div class="stat-group">
                     <span class="stat-label">Variantes</span>
                     <span class="stat-value">{{ product.variants?.length || 0 }}</span>
                   </div>
                   <div class="stat-group">
                     <span class="stat-label">Desde</span>
                     <span class="stat-value" style="color: var(--color-success-text); font-weight: var(--font-weight-bold);">
                       {{ (getMinPrice(product) || 0) | currency }}
                     </span>
                   </div>
                 </div>
                 <div class="row-status" style="margin-left: 1rem;">
                    <span [class]="'badge-status ' + (product.isActive ? 'active' : 'inactive')">
                      {{ product.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                 </div>
                 <div class="row-actions" (click)="$event.stopPropagation()">
                    <app-actions-menu
                      [actions]="productActions"
                      (actionClick)="handleActionClick($event, product)"
                    ></app-actions-menu>
                 </div>
              </div>
            }
          }
        } @else {
          <div class="products-page__empty">
            <app-empty-state
              [icon]="activeFiltersCount() > 0 || searchQuery() ? 'lucideSearch' : 'lucideInbox'"
              [title]="activeFiltersCount() > 0 || searchQuery() ? 'No encontramos lo que buscas' : 'No hay productos registrados'"
              [description]="activeFiltersCount() > 0 || searchQuery() ? 'Intenta con otros términos o ajusta tus filtros.' : 'Parece que aún no has creado ningún producto.'"
              [actionLabel]="activeFiltersCount() > 0 || searchQuery() ? 'Limpiar Filtros' : 'Nuevo Producto'"
              (action)="activeFiltersCount() > 0 || searchQuery() ? clearAllFilters() : onFullAddProduct()"
            ></app-empty-state>
          </div>
        }
      </div>

      <!-- Drawer de Historial -->
      <app-drawer 
        [isOpen]="isHistoryOpen()" 
        title="Historial de Producto"
        (close)="isHistoryOpen.set(false)"
        size="md">
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

      <!-- Drawer de Filtros Avanzados -->
      <app-drawer
        [isOpen]="isFiltersOpen()"
        title="Filtros Avanzados"
        (close)="isFiltersOpen.set(false)"
      >
        <div drawerBody>
          <app-query-node
            [node]="$any(filterTree())"
            [availableFields]="filterConfig"
            [isRoot]="true"
            (nodeChange)="onFilterTreeChange($any($event))"
          ></app-query-node>
        </div>
        <div drawerFooter class="drawer-footer-actions">
           <app-form-button label="Limpiar Filtros" variant="secondary" (click)="clearAllFilters()"></app-form-button>
           <app-form-button label="Aplicar Filtros" (click)="applyFilters()"></app-form-button>
        </div>
      </app-drawer>

      <!-- Modal de Eliminar -->
      <app-modal [isOpen]="isDeleteModalOpen()" title="Confirmar Eliminación" (close)="isDeleteModalOpen.set(false)">
        <div modalBody>¿Estás seguro de eliminar "{{ productToDelete()?.name }}"?</div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isDeleteModalOpen.set(false)"></app-form-button>
          <app-form-button label="Eliminar" variant="danger" icon="lucideTrash2" [loading]="isDeleting()" (click)="confirmDelete()"></app-form-button>
        </div>
      </app-modal>

      <app-pagination
        [totalItems]="totalItems()"
        [pageSize]="pageSize()"
        [currentPage]="currentPage()"
        (pageChange)="currentPage.set($event)"
      ></app-pagination>

      <app-product-import-modal
        #importModal
        (imported)="refreshTrigger.update(v => v + 1)"
      ></app-product-import-modal>
    </div>
  `,
  styleUrl: './products-list.component.scss'
})
export class ProductsListComponent {
  private productService = inject(ProductService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  modalService = inject(ModalService);

  productActions: ActionItem[] = [
    { id: 'edit', label: 'Editar', icon: 'lucidePencil' },
    { id: 'history', label: 'Historial', icon: 'lucideHistory' },
    { id: 'delete', label: 'Eliminar', icon: 'lucideTrash2', variant: 'danger' }
  ];

  searchQuery = signal('');
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile = signal(false);
  viewMode = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());
  
  isDeleteModalOpen = signal(false);
  isDeleting = signal(false);
  productToDelete = signal<any | null>(null);
  
  @ViewChild('importModal') importModal!: ProductImportModalComponent;

  isHistoryOpen = signal(false);
  isHistoryLoading = signal(false);
  productLogs = signal<any[]>([]);

  refreshTrigger = signal(0);
  isLoading = signal(true);
  currentPage = signal(1);
  pageSize = signal(10);
  activeTab = signal('Todos');
  sortField = signal('createdAt');
  sortOrder = signal<'ASC' | 'DESC'>('DESC');
  
  productTabs = [{ label: 'Todos', value: 'Todos' }, { label: 'Activos', value: 'Activos' }, { label: 'Inactivos', value: 'Inactivos' }];
  
  filterTree = signal<FilterGroup>({ type: 'group', id: 'root', logicalOperator: 'AND', children: [] });
  isFiltersOpen = signal(false);

  filterConfig: FilterField[] = [
    { id: 'name', label: 'Nombre', type: 'text' },
    { id: 'variants.sku', label: 'SKU / Código', type: 'text' },
    { id: 'category.name', label: 'Categoría', type: 'text' },
    { id: 'brand.name', label: 'Marca', type: 'text' },
    { id: 'variants.barcode', label: 'Código de Barras (EAN)', type: 'text' },
    { id: 'type', label: 'Tipo de Producto', type: 'select', options: [
      { label: 'Físico', value: 'PHYSICAL' },
      { label: 'Servicio', value: 'SERVICE' }
    ]},
    { id: 'variants.salePrice', label: 'Precio de Venta', type: 'number' }
  ];

  activeFiltersCount = computed(() => {
    const countLeaves = (node: FilterNode): number => {
      if (node.type === 'group') {
        return node.children.reduce((acc, child) => acc + countLeaves(child), 0);
      } else {
        const rule = node as FilterRule;
        const noValueOps: string[] = ['blank', 'notBlank'];
        if (noValueOps.includes(rule.operator)) return 1;
        return rule.value && String(rule.value).trim() !== '' ? 1 : 0;
      }
    };
    return countLeaves(this.filterTree());
  });

  onFilterTreeChange(newTree: FilterNode) {
    if (newTree.type === 'group') {
      this.filterTree.set(newTree as FilterGroup);
      this.currentPage.set(1);
    }
  }

  clearAllFilters() {
    this.filterTree.set({ type: 'group', id: 'root', logicalOperator: 'AND', children: [] });
    this.searchQuery.set('');
    this.isFiltersOpen.set(false);
  }

  applyFilters() {
    this.isFiltersOpen.set(false);
  }

  // ACCORDION STATE
  expandedRows = signal<Set<string>>(new Set());

  toggleExpand(productId: string) {
    const current = new Set(this.expandedRows());
    if (current.has(productId)) {
      current.delete(productId);
    } else {
      current.add(productId);
    }
    this.expandedRows.set(current);
  }

  isExpanded(productId: string): boolean {
    return this.expandedRows().has(productId);
  }

  goToDetail(id: string) {
    this.router.navigate(['/inventory/productos', id]);
  }

  getMinPrice(product: any): number {
    if (!product.variants || product.variants.length === 0) return 0;
    return Math.min(...product.variants.map((v: any) => parseFloat(v.salePrice) || 0));
  }

  readonly response = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      filterModel: QueryMapper.toAgGridFilterModel(this.filterTree()),
      tab: this.activeTab(),
      sortField: this.sortField(),
      sortOrder: this.sortOrder(),
      refresh: this.refreshTrigger()
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        return this.productService.findAll(params).pipe(
            tap(() => this.isLoading.set(false))
        );
      })
    ),
    { initialValue: { data: [] as any[], total: 0 } }
  );

  totalItems = computed(() => this.response().total);

  mappedLogs = computed<DatelineItem[]>(() => this.productLogs().map(log => ({
    id: log.id, 
    date: log.createdAt, 
    action: log.action,
    actionLabel: this.getLogActionLabel(log.action), 
    user: log.userName || 'Sistema', 
    icon: this.getLogIcon(log.action),
    message: log.action === 'IMPORT' ? `Importación masiva de ${log.details?.count} productos.` : undefined,
    changes: log.action === 'UPDATE' && log.details?.updatedData ? 
             this.getChanges(log.details.oldData || {}, log.details.updatedData) : undefined
  })));

  getChanges(oldData: any, newData: any) {
    if (!oldData || !newData) return [];
    const fields = [
      { field: 'name', label: 'Nombre' },
      { field: 'description', label: 'Descripción' },
      { field: 'categoryId', label: 'Categoría' },
      { field: 'brandId', label: 'Marca' },
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

  formatValue(field: string, val: any): string {
    if (field === 'isActive') return val ? 'Activo' : 'Inactivo';
    return String(val || 'N/D');
  }

  getLogIcon(action: string): string {
    switch (action) {
      case 'CREATE': return 'lucidePlusCircle';
      case 'UPDATE': return 'lucideRefreshCw';
      case 'DELETE': return 'lucideTrash';
      case 'IMPORT': return 'lucideCloudDownload';
      default: return 'lucideHistory';
    }
  }

  getLogActionLabel(action: string): string {
    switch (action) {
      case 'CREATE': return 'Creación';
      case 'UPDATE': return 'Actualización';
      case 'DELETE': return 'Eliminación';
      case 'IMPORT': return 'Importación';
      default: return action;
    }
  }

  onTabChange(tab: string) { this.activeTab.set(tab); this.currentPage.set(1); }
  onSearch(q: string) { this.searchQuery.set(q); this.currentPage.set(1); }
  onSortChange(ev: any) { this.sortField.set(ev.field); this.sortOrder.set(ev.order.toUpperCase()); this.currentPage.set(1); }
  
  onFullAddProduct() {
      this.router.navigate(['/inventario/productos/nuevo']);
  }
  
  onShowDetail(product: any) {
    this.router.navigate(['/inventario/productos', product.id]);
  }

  handleActionClick(action: ActionItem, product: any) {
    if (action.id === 'edit') this.router.navigate(['/inventario/productos', product.id, 'editar']);
    else if (action.id === 'history') {
        this.isHistoryOpen.set(true);
        this.isHistoryLoading.set(true);
        this.productService.getLogs(product.id).subscribe({
           next: (logs) => {
              this.productLogs.set(logs);
              this.isHistoryLoading.set(false);
           },
           error: () => {
              this.toastService.error('Error al cargar historial.');
              this.isHistoryLoading.set(false);
           }
        });
    }
    else if (action.id === 'delete') { 
        this.productToDelete.set(product); 
        this.isDeleteModalOpen.set(true); 
    }
  }

  confirmDelete() {
    const p = this.productToDelete(); 
    if (!p) return;
    this.isDeleting.set(true);
    this.productService.remove(p.id).subscribe({
      next: () => { 
          this.toastService.success('Producto eliminado correctamente'); 
          this.refreshTrigger.update(v => v + 1); 
          this.isDeleting.set(false); 
          this.isDeleteModalOpen.set(false); 
      },
      error: () => { 
          this.toastService.error('Error al eliminar'); 
          this.isDeleting.set(false); 
      }
    });
  }

  openAdvancedFilters() {
    this.isFiltersOpen.set(true);
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const mobileQuery = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mobileQuery.matches);
      mobileQuery.addEventListener('change', (e) => this.isMobile.set(e.matches));
    }
  }
}
