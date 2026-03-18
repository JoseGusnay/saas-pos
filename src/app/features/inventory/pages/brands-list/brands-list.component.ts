import { Component, computed, inject, signal, ViewChild, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';

import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';
import { ModalService } from '../../../../core/components/modal/modal.service';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { BrandsAdvancedFilters } from './components/brands-advanced-filters/brands-advanced-filters';
import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { BrandService } from '../../../../core/services/brand.service';
import { Brand } from '../../../../core/models/brand.models';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';

import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { BrandFormComponent } from './components/brand-form/brand-form.component';
import { DatelineComponent, DatelineItem } from '../../../../shared/components/ui/dateline/dateline.component';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { ActionItem, ActionsMenuComponent } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { BrandDetailComponent } from '../../components/brand-detail/brand-detail.component';
import { BrandImportModalComponent } from '../../components/brand-import-modal/brand-import-modal';
import { lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideDownload, lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash, lucideGlobe, lucideSearch, lucideCheckCircle2, lucideXCircle, lucideCloudDownload } from '@ng-icons/lucide';
import { ToastService } from '../../../../core/services/toast.service';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';

@Component({
  selector: 'app-brands-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    ListToolbarComponent,
    PaginationComponent,
    DataCardComponent,
    SkeletonComponent,
    EmptyStateComponent,
    DrawerComponent,
    BrandFormComponent,
    DatelineComponent,
    ModalComponent,
    SpinnerComponent,
    ActionsMenuComponent,
    FormButtonComponent,
    BrandDetailComponent,
    BrandImportModalComponent,
    NgIconComponent
  ],
  providers: [
    provideIcons({ lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideDownload, lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash, lucideGlobe, lucideSearch, lucideCheckCircle2, lucideXCircle, lucideCloudDownload })
  ],
  template: `
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
              <div class="brand-row-item shadow-sm" (click)="onShowDetail(brand)">
                 <div class="row-main">
                    <div class="brand-avatar" [style.background]="'var(--color-primary-subtle)'">
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

      <!-- Drawer de Detalle -->
      <app-drawer
        [isOpen]="isDetailOpen()"
        title="Detalle de Marca"
        (close)="isDetailOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          @if (selectedBrand()) {
            <app-brand-detail
              [brand]="selectedBrand()!"
            ></app-brand-detail>
          }
        </div>

        <div drawerFooter class="drawer-footer-actions">
           <button class="btn btn-secondary" (click)="onShowHistory(selectedBrand()!.id)">
              <ng-icon name="lucideHistory"></ng-icon>
              Ver Historial
            </button>
            <button class="btn btn-primary" (click)="onEditBrand(selectedBrand()!)">
              <ng-icon name="lucidePencil"></ng-icon>
              Editar Marca
            </button>
        </div>
      </app-drawer>

      <!-- Drawer de Historial -->
      <app-drawer 
        [isOpen]="isHistoryOpen()" 
        title="Historial de Auditoría"
        (close)="isHistoryOpen.set(false)">
        <div drawerBody class="history-container">
          @if (isHistoryLoading()) {
            <app-spinner></app-spinner>
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
        [title]="isEditing() ? 'Editar Marca' : 'Nueva Marca'"
        [allowClose]="!(brandForm?.isSubmitting?.() ?? false)"
        (close)="onDrawerClose()"
        size="md">
        <div drawerBody>
          <app-brand-form 
            #brandForm
            (saved)="onBrandSaved()" 
            (cancelled)="onDrawerClose()">
          </app-brand-form>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" [disabled]="brandForm?.isSubmitting?.() ?? false" (click)="onDrawerClose()"></app-form-button>
          <app-form-button
            [label]="isEditing() ? 'Actualizar Marca' : 'Guardar Marca'"
            loadingLabel="Guardando..."
            icon="lucideSave"
            [loading]="brandForm?.isSubmitting?.() ?? false"
            [disabled]="brandForm?.brandForm?.invalid ?? true"
            type="button"
            (click)="brandForm?.onSubmit()"
          ></app-form-button>
        </div>
      </app-drawer>

      <app-modal [isOpen]="isConfirmationModalOpen()" title="Cambios sin guardar" (close)="onCancelExit()">
        <div modalBody>Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?</div>
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

      <app-modal [isOpen]="isDeleteModalOpen()" title="Confirmar Eliminación" (close)="onCancelDelete()">
        <div modalBody>¿Estás seguro de eliminar la marca "{{ brandToDelete()?.name }}"?</div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button
            label="Cancelar"
            variant="secondary"
            (click)="onCancelDelete()"
          ></app-form-button>
          <app-form-button
            label="Eliminar Marca"
            variant="danger"
            icon="lucideTrash2"
            [loading]="isDeleting()"
            [disabled]="isDeleting()"
            (click)="confirmDelete()"
          ></app-form-button>
        </div>
      </app-modal>

      <app-brand-import-modal 
        #importModal
        (imported)="refreshTrigger.update(v => v + 1)"
      ></app-brand-import-modal>
    </div>
  `,
  styles: [`
    .brands-page { display: flex; flex-direction: column; min-height: 100%; width: 100%; }
    .brands-page__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
    .brands-page__list { display: flex; flex-direction: column; gap: 0.75rem; }
    
    .data-card { background: var(--color-bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border-light); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; box-shadow: var(--shadow-sm); }
    .skeleton-card { height: 180px; pointer-events: none; }
    .data-card__header { display: flex; justify-content: space-between; align-items: flex-start; }
    .data-card__title-container { display: flex; flex-direction: column; gap: 0.25rem; }
    .data-card__detail { display: flex; align-items: center; gap: 0.5rem; color: var(--color-text-muted); }
    
    .brand-row-item { 
      display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; background: var(--color-bg-surface); 
      border: 1px solid var(--color-border-light); border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-base);
      position: relative; z-index: 1;
    }
    .brand-row-item:hover { transform: translateX(4px); border-color: var(--color-accent-primary); background: var(--color-bg-hover); z-index: 10; }
    .brand-row-item:has(.actions-menu-open) { z-index: 50; }
    .skeleton-row { pointer-events: none; }
    
    .row-main { display: flex; align-items: center; gap: 1rem; }
    .brand-avatar { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-semibold); color: var(--color-accent-primary); background: var(--color-border-subtle); font-size: 1.25rem; }
    .brand-info { display: flex; flex-direction: column; }
    .brand-name { font-weight: var(--font-weight-semibold); color: var(--color-text-main); }
    .brand-sub { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .badge-status { padding: 0.25rem 0.75rem; border-radius: 99px; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }
    .badge-status.active { background: var(--color-success-bg); color: var(--color-success-text); }
    .badge-status.inactive { background: var(--color-border-subtle); color: var(--color-text-muted); }
    .history-container { padding: 1rem; }
    .brands-page__empty { grid-column: 1 / -1; display: flex; justify-content: center; width: 100%; padding: 4rem 1rem; }
    .drawer-footer-actions { 
      display: flex; 
      justify-content: flex-end; 
      gap: 12px; 
      width: 100%; 

      @media (max-width: 768px) {
        flex-direction: column-reverse;
        ::ng-deep .btn { width: 100%; }
      }
    }
    .modal-footer-actions { display: flex; gap: 1rem; justify-content: flex-end; }
  `]
})
export class BrandsListComponent {
  private brandService = inject(BrandService);
  private toastService = inject(ToastService);
  modalService = inject(ModalService);

  brandActions: ActionItem[] = [
    { id: 'edit', label: 'Editar', icon: 'lucidePencil' },
    { id: 'history', label: 'Historial', icon: 'lucideHistory' },
    { id: 'delete', label: 'Eliminar', icon: 'lucideTrash2', variant: 'danger' }
  ];

  searchQuery = signal('');
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile = signal(false);
  viewMode = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());
  isDrawerOpen = signal(false);
  isConfirmationModalOpen = signal(false);
  sortField = signal('createdAt');
  sortOrder = signal<'ASC' | 'DESC'>('DESC');
  isDeleteModalOpen = signal(false);
  isDeleting = signal(false);
  brandToDelete = signal<Brand | null>(null);
  isHistoryOpen = signal(false);
  isHistoryLoading = signal(false);
  isDetailOpen = signal(false);
  selectedBrand = signal<Brand | null>(null);
  brandLogs = signal<any[]>([]);
  refreshTrigger = signal(0);
  isLoading = signal(true);
  currentPage = signal(1);
  pageSize = signal(10);
  activeTab = signal('Todas');
  brandTabs = [{ label: 'Todas', value: 'Todas' }, { label: 'Activas', value: 'Activas' }, { label: 'Inactivas', value: 'Inactivas' }];
  
  @ViewChild('brandForm') brandFormRef?: BrandFormComponent;
  @ViewChild('importModal') importModal!: BrandImportModalComponent;

  filterTree = signal<FilterGroup>({ type: 'group', id: 'root', logicalOperator: 'AND', children: [] });
  availableFields: FilterField[] = [
    { id: 'name', label: 'Nombre', type: 'text' },
    { id: 'country', label: 'País', type: 'text' },
    { id: 'status', label: 'Estado', type: 'status' }
  ];

  private readonly brandsResponse = toSignal(
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
        const { tab, ...filters } = params;
        if (tab === 'Activas') filters.filterModel['status'] = { filterType: 'text', type: 'equals', filter: 'ACTIVE' };
        else if (tab === 'Inactivas') filters.filterModel['status'] = { filterType: 'text', type: 'equals', filter: 'INACTIVE' };
        return this.brandService.findAll(filters).pipe(tap(() => this.isLoading.set(false)));
      })
    )
  );

  brands = computed(() => this.brandsResponse()?.data || []);
  totalItems = computed(() => this.brandsResponse()?.total || 0);

  mappedLogs = computed<DatelineItem[]>(() => this.brandLogs().map(log => ({
    id: log.id, 
    date: log.createdAt, 
    action: log.action,
    actionLabel: this.getLogActionLabel(log.action), 
    user: log.userName || 'Sistema', 
    icon: this.getLogIcon(log.action),
    message: log.action === 'IMPORT' ? `Importación masiva de ${log.details?.count} marcas.` : undefined,
    changes: log.action === 'UPDATE' && log.details?.oldData ? 
             this.getChanges(log.details.oldData, log.details.newData) : undefined
  })));

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
  
  onShowHistory(id: string) {
    this.isDetailOpen.set(false);
    this.isHistoryOpen.set(true); 
    this.isHistoryLoading.set(true);
    this.brandService.getLogs(id).subscribe({
      next: logs => { this.brandLogs.set(logs); this.isHistoryLoading.set(false); },
      error: () => { this.toastService.error('Error al cargar historial'); this.isHistoryLoading.set(false); }
    });
  }

  onAddBrand() { this.isEditing.set(false); this.isDrawerOpen.set(true); setTimeout(() => this.brandFormRef?.resetForm(), 0); }
  
  onShowDetail(brand: Brand) {
    this.selectedBrand.set(brand);
    this.isDetailOpen.set(true);
  }

  onEditBrand(b: Brand) { 
    this.isDetailOpen.set(false);
    this.isEditing.set(true); 
    this.isDrawerOpen.set(true); 
    setTimeout(() => this.brandFormRef?.setBrand(b), 0); 
  }
  isEditing = signal(false);

  handleActionClick(action: ActionItem, brand: Brand) {
    if (action.id === 'edit') this.onEditBrand(brand);
    else if (action.id === 'history') this.onShowHistory(brand.id);
    else if (action.id === 'delete') { this.brandToDelete.set(brand); this.isDeleteModalOpen.set(true); }
  }

  confirmDelete() {
    const b = this.brandToDelete(); if (!b) return;
    this.isDeleting.set(true);
    this.brandService.remove(b.id).subscribe({
      next: () => { this.toastService.success('Marca eliminada correctamente'); this.refreshTrigger.update(v => v + 1); this.isDeleting.set(false); this.isDeleteModalOpen.set(false); },
      error: () => { this.toastService.error('Error al eliminar'); this.isDeleting.set(false); }
    });
  }

  onDrawerClose() { if (this.brandFormRef?.hasUnsavedChanges()) this.isConfirmationModalOpen.set(true); else this.closeDrawer(); }
  onConfirmExit() { this.isConfirmationModalOpen.set(false); this.closeDrawer(); }
  onCancelExit() { this.isConfirmationModalOpen.set(false); }
  onCancelDelete() { this.isDeleteModalOpen.set(false); }
  private closeDrawer() { this.isDrawerOpen.set(false); this.brandFormRef?.resetForm(); }

  onBrandSaved() { this.isDrawerOpen.set(false); this.refreshTrigger.update(v => v + 1); }

  openAdvancedFilters() {
    this.modalService.open(
      BrandsAdvancedFilters, 
      'Filtros Avanzados', 
      {
        filterTree: () => this.filterTree(),
        availableFields: this.availableFields,
        onFilterTreeChange: (tree: FilterNode) => { this.filterTree.set(tree as FilterGroup); this.currentPage.set(1); }
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

  clearAllFilters() {
    this.searchQuery.set('');
    this.filterTree.set({ type: 'group', id: 'root', logicalOperator: 'AND', children: [] });
    this.currentPage.set(1);
  }

  activeFiltersCount = computed(() => {
    const count = (node: any): number => node.type === 'group' ? node.children.reduce((a: any, c: any) => a + count(c), 0) : (node.value ? 1 : 0);
    return count(this.filterTree());
  });

  constructor() {
    if (typeof window !== 'undefined') {
      const mobileQuery = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mobileQuery.matches);
      mobileQuery.addEventListener('change', (e) => this.isMobile.set(e.matches));
    }
  }

  private getChanges(oldData: any, newData: any) {
    if (!oldData || !newData) return [];
    const fields = [
      { field: 'name', label: 'Nombre' },
      { field: 'country', label: 'País' },
      { field: 'description', label: 'Descripción' },
      { field: 'status', label: 'Estado' }
    ];

    return fields
      .filter(f => JSON.stringify(oldData[f.field]) !== JSON.stringify(newData[f.field]))
      .map(f => ({
        ...f,
        oldValue: this.formatValue(oldData[f.field]),
        newValue: this.formatValue(newData[f.field])
      }));
  }

  private formatValue(val: any): string {
    if (val === 'ACTIVE') return 'Activa';
    if (val === 'INACTIVE') return 'Inactiva';
    return String(val || '');
  }
}
