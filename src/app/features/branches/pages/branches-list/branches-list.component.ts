import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';

import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { BranchesAdvancedFilters } from './components/branches-advanced-filters/branches-advanced-filters';
import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { BranchService } from '../../../../core/services/branch.service';
import { Branch } from '../../../../core/models/branch.models';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';

import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { BranchFormComponent } from '../../components/branch-form/branch-form';
import { BranchImportModalComponent } from '../../components/branch-import-modal/branch-import-modal';
import { DatelineComponent, DatelineItem } from '../../../../shared/components/ui/dateline/dateline.component';
import { BranchDetailComponent } from '../../components/branch-detail/branch-detail.component';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { ActionItem, ActionsMenuComponent } from '../../../../shared/components/ui/actions-menu/actions-menu';

import { lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideDownload, lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash, lucideCloudDownload } from '@ng-icons/lucide';
import { ToastService } from '../../../../core/services/toast.service';

import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';

import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';

@Component({
  selector: 'app-branches-list',
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
    BranchFormComponent,
    BranchImportModalComponent,
    BranchDetailComponent,
    DatelineComponent,
    ModalComponent,
    NgIconComponent,
    SpinnerComponent,
    ActionsMenuComponent,
    FormButtonComponent,
    BranchesAdvancedFilters
  ],

  providers: [
    provideIcons({ lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideDownload, lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash, lucideCloudDownload })
  ],
  template: `
    <div class="branches-page">
      <app-page-header
        title="Sucursales"
        [tabs]="branchTabs"
        [activeTab]="activeTab()"
        ctaText="Nueva Sucursal"
        ctaIcon="lucidePlus"
        secondaryCtaText="Importar"
        secondaryCtaIcon="lucideDownload"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAddBranch()"
        (secondaryCtaClick)="onImportClick()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar sucursales..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="activeFiltersCount()"
        [viewMode]="viewModePreference()"
        (openFilters)="openAdvancedFilters()"
        (clearFilters)="clearAllFilters()"
        (searchChange)="onSearch($event)"
        (viewModeChange)="viewModePreference.set($event)"
        (sortChange)="onSortChange($event)"
      ></app-list-toolbar>

      <div [ngClass]="viewMode() === 'grid' ? 'branches-page__grid' : 'branches-page__list'">
        @if (isLoading()) {
          @for (n of [1,2,3,4,5,6]; track n) {
            @if (viewMode() === 'grid') {
              <!-- Branch Grid Skeleton -->
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
                  <div class="data-card__detail">
                    <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
                    <app-skeleton width="150px" height="0.875rem"></app-skeleton>
                  </div>
                </div>
                <footer class="data-card__footer">
                   <div style="display: flex; flex-direction: column; gap: 4px;">
                      <app-skeleton width="70px" height="11px"></app-skeleton>
                      <app-skeleton width="50px" height="1.25rem"></app-skeleton>
                   </div>
                   <div style="display: flex; margin-left: auto;">
                      <app-skeleton width="24px" height="24px" shape="circle"></app-skeleton>
                      <app-skeleton width="24px" height="24px" shape="circle" style="margin-left: -8px;"></app-skeleton>
                   </div>
                </footer>
              </div>
            } @else {
              <!-- Branch List Skeleton -->
              <div class="branch-row-item skeleton-row">
                 <div class="row-main">
                    <app-skeleton width="48px" height="48px" radius="8px"></app-skeleton>
                    <div class="branch-info">
                       <app-skeleton width="140px" height="1rem"></app-skeleton>
                       <app-skeleton width="180px" height="0.875rem" style="margin-top: 6px"></app-skeleton>
                    </div>
                 </div>
                 <div class="row-manager">
                    <app-skeleton width="60px" height="10px" style="margin-bottom: 4px"></app-skeleton>
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
        } @else if (branches().length > 0) {

          @for (branch of branches(); track branch.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                [title]="branch.name"
                [status]="branch.isActive ? 'Operativa' : 'Cerrada'"
                [statusConfig]="branch.isActive ? 'active' : 'inactive'"
                [details]="[
                  { icon: 'lucideMapPin', text: branch.address || 'Sin dirección' },
                  { icon: 'lucidePhone', text: branch.phone || 'Sin teléfono' },
                  { icon: 'lucideUser', text: branch.manager || 'Sin encargado' }
                ]"
                [metric]="{ label: 'Ingresos Hoy', value: branch.revenue || '$0' }"
                [avatars]="[
                  { url: 'https://ui-avatars.com/api/?name=C+D&background=random', name: 'User 1' },
                  { url: 'https://ui-avatars.com/api/?name=A+B&background=random', name: 'User 2' }
                ]"
                [actions]="branchActions"
                (actionClick)="handleActionClick($event, branch)"
                (click)="onShowDetail(branch)"
                class="clickable-card"
              ></app-data-card>
            } @else {
              <!-- Row View Mode -->
              <div class="branch-row-item shadow-sm" (click)="onShowDetail(branch)">
                 <div class="row-main">
                    <div class="branch-avatar" [style.background]="'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'">
                      <ng-icon name="lucideCloudDownload" *ngIf="branch.isMain"></ng-icon>
                      <span *ngIf="!branch.isMain">{{ branch.name[0].toUpperCase() }}</span>
                    </div>
                    <div class="branch-info">
                      <span class="branch-name">
                        {{ branch.name }}
                        @if (branch.isMain) {
                          <span class="badge-main">Principal</span>
                        }
                      </span>
                      <span class="branch-sub">
                        <ng-icon name="lucideMapPin"></ng-icon>
                        {{ branch.address || 'Sin dirección' }}
                      </span>
                    </div>
                 </div>
                 <div class="row-manager">
                    <span class="row-label">Encargado</span>
                    <span class="row-value">{{ branch.manager || 'No asignado' }}</span>
                 </div>
                 <div class="row-status">
                    <span [class]="'badge-status ' + (branch.isActive ? 'active' : 'inactive')">
                      {{ branch.isActive ? 'Operativa' : 'Cerrada' }}
                    </span>
                 </div>
                 <div class="row-actions" (click)="$event.stopPropagation()">
                    <app-actions-menu
                      [actions]="branchActions"
                      (actionClick)="handleActionClick($event, branch)"
                    ></app-actions-menu>
                 </div>
              </div>
            }
          }

        } @else {
          <div class="branches-page__empty">
            <app-empty-state
              [icon]="activeFiltersCount() > 0 || searchQuery() ? 'lucideSearch' : 'lucideInbox'"
              [image]="activeFiltersCount() > 0 || searchQuery() ? 'assets/images/empty_search.png' : ''"
              [title]="activeFiltersCount() > 0 || searchQuery() ? 'No encontramos lo que buscas' : 'No hay sucursales registradas'"
              [description]="activeFiltersCount() > 0 || searchQuery() ? 'Intenta con otros términos o ajusta tus filtros para encontrar la sucursal que necesitas.' : 'Parece que aún no has creado ninguna sucursal. ¡Comienza añadiendo la primera!'"
              [actionLabel]="activeFiltersCount() > 0 || searchQuery() ? 'Limpiar Filtros' : 'Añadir Sucursal'"
              (action)="activeFiltersCount() > 0 || searchQuery() ? clearAllFilters() : onAddBranch()"
            ></app-empty-state>
          </div>
        }
      </div>

      <!-- Drawer de Historial -->
      <app-drawer 
        [isOpen]="isHistoryOpen()" 
        title="Historial de Cambios"
        (close)="isHistoryOpen.set(false)">
        
        <div drawerBody class="history-container">
          @if (isHistoryLoading()) {
            <div class="history-loading">
              <app-spinner></app-spinner>
              <span>Cargando historial...</span>
            </div>
          } @else {
            <app-dateline [items]="mappedLogs()"></app-dateline>
            @if (mappedLogs().length === 0) {
              <div class="empty-logs">No hay registros de actividad para esta sucursal.</div>
            }
          }
        </div>
      </app-drawer>

      <app-drawer
        [isOpen]="isDetailOpen()"
        title="Detalle de Sucursal"
        (close)="isDetailOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          @if (selectedBranchDetail()) {
            <app-branch-detail
              [branch]="selectedBranchDetail()!"
            ></app-branch-detail>
          }
        </div>

        <div drawerFooter class="drawer-footer-actions">
           <button class="btn btn-secondary" (click)="onShowHistory(selectedBranchDetail()!.id)">
              <ng-icon name="lucideHistory"></ng-icon>
              Ver Historial
            </button>
            <button class="btn btn-primary" (click)="onEditBranch(selectedBranchDetail()!)">
              <ng-icon name="lucidePencil"></ng-icon>
              Editar Sucursal
            </button>
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
        size="md">
        <div drawerBody>
          <app-branches-advanced-filters
            #advancedFilters
            [filterTree]="filterTree"
            [availableFields]="availableFields"
            (applied)="onFilterTreeChange($event); isFiltersOpen.set(false)"
          ></app-branches-advanced-filters>
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

      <!-- Drawer para Nueva/Editar Sucursal -->
      <app-drawer
        [isOpen]="isDrawerOpen()"
        [title]="isEditing() ? 'Editar Sucursal' : 'Registrar Nueva Sucursal'"
        [allowClose]="!(branchForm?.isSubmitting)"
        (close)="onDrawerClose()"
        size="md">
        
        <div drawerBody>
          <app-branch-form 
            #branchForm
            (saved)="onBranchSaved()" 
            (cancelled)="onDrawerClose()">
          </app-branch-form>
        </div>

        <div drawerFooter class="drawer-footer-actions">
          <app-form-button
            label="Cancelar"
            variant="secondary"
            [disabled]="!!(branchForm?.isSubmitting)"
            (click)="onDrawerClose()"
          ></app-form-button>
          <app-form-button
            [label]="isEditing() ? 'Actualizar Sucursal' : 'Guardar Sucursal'"
            loadingLabel="Guardando..."
            icon="lucideSave"
            [loading]="!!(branchForm?.isSubmitting)"
            [disabled]="branchForm?.branchForm?.invalid ?? false"
            (click)="branchForm?.onSubmit()"
          ></app-form-button>
        </div>
      </app-drawer>

      <!-- Modal de Confirmación de Salida -->
      <app-modal
        [isOpen]="isConfirmationModalOpen()"
        [title]="'Cambios sin guardar'"
        size="sm"
        (close)="onCancelExit()">

        <div modalBody>
          Tienes cambios sin guardar. ¿Deseas salir? Se perderán los datos ingresados.
        </div>

        <div modalFooter class="modal-footer-actions">
          <app-form-button
            label="Continuar editando"
            variant="ghost"
            type="button"
            [fullWidth]="false"
            (click)="onCancelExit()"
          />
          <app-form-button
            label="Salir sin guardar"
            variant="danger"
            type="button"
            [fullWidth]="false"
            (click)="onConfirmExit()"
          />
        </div>
      </app-modal>

      <!-- Modal de Confirmación de Eliminación -->
      <app-modal
        [isOpen]="isDeleteModalOpen()"
        [title]="'Confirmar eliminación'"
        size="sm"
        [allowClose]="!isDeleting()"
        (close)="onCancelDelete()">

        <div modalBody>
          ¿Eliminar la sucursal <strong>"{{ branchToDelete()?.name }}"</strong>?
          Esta acción desactivará el acceso de forma inmediata.
        </div>

        <div modalFooter class="modal-footer-actions">
          <app-form-button
            label="Cancelar"
            variant="ghost"
            type="button"
            [fullWidth]="false"
            [disabled]="isDeleting()"
            (click)="onCancelDelete()"
          />
          <app-form-button
            label="Eliminar"
            loadingLabel="Eliminando..."
            variant="danger"
            type="button"
            [fullWidth]="false"
            [loading]="isDeleting()"
            (click)="confirmDelete()"
          />
        </div>
      </app-modal>

      <app-branch-import-modal
        #importModal
        (imported)="refreshTrigger.set(refreshTrigger() + 1)"
      ></app-branch-import-modal>
    </div>
  `,
  styleUrl: './branches-list.component.scss'
})
export class BranchesListComponent {
  private branchService = inject(BranchService);
  private toastService = inject(ToastService);

  // Acciones reutilizables para las tarjetas
  branchActions: ActionItem[] = [
    { id: 'edit', label: 'Editar', icon: 'lucidePencil' },
    { id: 'history', label: 'Historial', icon: 'lucideHistory' },
    { id: 'delete', label: 'Eliminar', icon: 'lucideTrash2', variant: 'danger' }
  ];

  // 2. Signals Mutables y Reactivos para UI State
  searchQuery = signal('');
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile = signal<boolean>(false);
  viewMode = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());
  isDrawerOpen = signal(false);
  isFiltersOpen = signal(false);
  isConfirmationModalOpen = signal(false);

  // SORTING STATE
  sortField = signal<string>('createdAt');
  sortOrder = signal<'ASC' | 'DESC'>('DESC');
 
  // PREMIUM DELETE STATE
  isDeleteModalOpen = signal(false);
  isDeleting = signal(false);
  branchToDelete = signal<Branch | null>(null);

  // AUDIT LOGS STATE
  isHistoryOpen = signal(false);
  isHistoryLoading = signal(false);
  branchLogs = signal<any[]>([]);

  isDetailOpen = signal(false);
  selectedBranchDetail = signal<Branch | null>(null);


  mappedLogs = computed<DatelineItem[]>(() => {
    return this.branchLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: this.getLogActionLabel(log.action),
      user: log.userName || 'Sistema',
      icon: this.getLogIcon(log.action),
      message: log.action === 'IMPORT' ? `Importación masiva de ${log.details?.count} sucursales.` : 
               log.action === 'CREATE' ? 'Configuración inicial y registro manual.' : undefined,
      changes: log.action === 'UPDATE' && log.details?.oldData ? 
               this.getChangedFields(log.details.oldData, log.details.newData) : undefined
    }));
  });

  refreshTrigger = signal(0);
  isLoading = signal(true);

  @ViewChild('branchForm') branchFormRef!: BranchFormComponent;
  @ViewChild('importModal') importModalRef!: BranchImportModalComponent;

  // 1. Estado Reactivo del Servidor
  private readonly branchesResponse = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      filterModel: QueryMapper.toAgGridFilterModel(this.filterTree(), this.availableFields),
      tab: this.activeTab(),
      sortField: this.sortField(),
      sortOrder: this.sortOrder(),
      refresh: this.refreshTrigger()
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        const { tab, ...filters } = params;
        // Aplicar tab filter si no es "Todas"
        if (tab === 'Activas') {
          filters.filterModel['isActive'] = { filterType: 'text', type: 'equals', filter: 'true' };
        } else if (tab === 'Inactivas') {
          filters.filterModel['isActive'] = { filterType: 'text', type: 'equals', filter: 'false' };
        }
        return this.branchService.findAll(filters).pipe(
          tap(() => this.isLoading.set(false))
        );
      })
    )
  );

  branches = computed(() => this.branchesResponse()?.data || []);
  totalItems = computed(() => this.branchesResponse()?.total || 0);

  branchTabs = [
    { label: 'Todas', value: 'Todas' },
    { label: 'Activas', value: 'Activas' },
    { label: 'Inactivas', value: 'Inactivas' },
  ];

  activeTab = signal('Todas');
  isEditing = signal(false);

  availableFields: FilterField[] = [
    { id: 'name', label: 'Nombre de Sucursal', type: 'text' },
    { id: 'city', label: 'Ciudad', type: 'text' },
    { id: 'address', label: 'Dirección', type: 'text' },
    { id: 'phone', label: 'Teléfono', type: 'text' },
    { id: 'manager', label: 'Encargado', type: 'text' },
    { id: 'revenue', label: 'Ingresos', type: 'number' },
    { id: 'isActive', label: 'Estado Operativo', type: 'status' },
    { id: 'isMain', label: 'Sucursal Principal', type: 'status' },
    { id: 'createdAt', label: 'Fecha de Creación', type: 'text' }
  ];

  filterTree = signal<FilterGroup>({
    type: 'group',
    id: 'root',
    logicalOperator: 'AND',
    children: []
  });

  onTabChange(tab: string) {
    this.activeTab.set(tab);
    this.resetPagination();
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
    this.resetPagination();
  }

  onSortChange(event: { field: string, order: string }) {
    this.sortField.set(event.field);
    this.sortOrder.set(event.order.toUpperCase() as 'ASC' | 'DESC');
    this.resetPagination();
  }
 
  onShowHistory(branchId: string) {
    // Si el detalle está abierto, lo cerramos para mostrar el historial
    this.isDetailOpen.set(false);
    
    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);
    this.branchService.getLogs(branchId).subscribe({
      next: (logs) => {
        this.branchLogs.set(logs);
        this.isHistoryLoading.set(false);
      },
      error: () => {
        this.toastService.error('No se pudo cargar el historial');
        this.isHistoryLoading.set(false);
        this.isHistoryOpen.set(false);
      }
    });
  }

  onShowDetail(branch: Branch) {
    this.selectedBranchDetail.set(branch);
    this.isDetailOpen.set(true);
    this.branchService.findOne(branch.id).subscribe({
      next: (full) => this.selectedBranchDetail.set(full),
      error: () => { /* mantiene datos básicos de la lista */ }
    });
  }


  onImportClick() {
    this.importModalRef.open();
  }

  onAddBranch() {
    this.isEditing.set(false);
    this.isDrawerOpen.set(true);
    // Shortcut: reset form if ref available
    setTimeout(() => {
      this.branchFormRef?.resetForm();
    }, 0);
  }

  handleActionClick(action: ActionItem, branch: Branch) {
    if (action.id === 'edit') {
      this.onEditBranch(branch);
    } else if (action.id === 'history') {
      this.onShowHistory(branch.id);
    } else if (action.id === 'delete') {
      this.onDeleteBranch(branch);
    }
  }

  onEditBranch(branch: Branch) {
    this.isDetailOpen.set(false);
    this.isEditing.set(true);
    this.isDrawerOpen.set(true);
    // Timeout para asegurar que el componente está renderizado
    setTimeout(() => {
      this.branchFormRef?.setBranch(branch);
    }, 0);
  }

  onDeleteBranch(branch: Branch) {
    this.branchToDelete.set(branch);
    this.isDeleteModalOpen.set(true);
  }

  onCancelDelete() {
    if (this.isDeleting()) return;
    this.isDeleteModalOpen.set(false);
    this.branchToDelete.set(null);
  }

  confirmDelete() {
    const branch = this.branchToDelete();
    if (!branch || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.branchService.remove(branch.id).subscribe({
      next: () => {
        this.toastService.success('Sucursal eliminada correctamente');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleting.set(false);
        this.onCancelDelete();
      },
      error: (err) => {
        console.error('Error deleting branch:', err);
        this.toastService.error('No se pudo eliminar la sucursal');
        this.isDeleting.set(false);
      }
    });
  }

  onDrawerClose() {
    // Si hay cambios sin guardar, mostrar modal de confirmación
    if (this.branchFormRef?.hasUnsavedChanges()) {
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
    this.branchFormRef?.resetForm();
  }

  onBranchSaved(branch?: Branch) {
    const wasEditing = this.isEditing();
    this.isDrawerOpen.set(false);
    this.refreshTrigger.update(v => v + 1);
    this.resetPagination();
    this.toastService.success(
      wasEditing
        ? `✅ Sucursal actualizada correctamente`
        : `✅ Sucursal creada correctamente`
    );
  }


  @ViewChild('advancedFilters') advancedFiltersRef!: BranchesAdvancedFilters;

  openAdvancedFilters() {
    this.isFiltersOpen.set(true);
    setTimeout(() => this.advancedFiltersRef?.refresh(), 0);
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const mobileQuery = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mobileQuery.matches);
      mobileQuery.addEventListener('change', (e) => this.isMobile.set(e.matches));
    }
  }

  onFilterTreeChange(newTree: FilterNode) {
    if (newTree.type === 'group') {
      this.filterTree.set(newTree as FilterGroup);
      this.resetPagination();
    }
  }

  clearAllFilters() {
    this.searchQuery.set('');
    this.filterTree.set({
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: []
    });
    this.resetPagination();
  }

  activeFiltersCount = computed(() => {
    const countLeaves = (node: FilterNode): number => {
      if (node.type === 'group') {
        return node.children.reduce((acc, child) => acc + countLeaves(child), 0);
      } else {
        const rule = node as FilterRule;
        return rule.value && rule.value.trim() !== '' ? 1 : 0;
      }
    };
    return countLeaves(this.filterTree());
  });

  // ========== ESTADO DE PAGINACIÓN ==========
  currentPage = signal(1);
  pageSize = signal(10);
  resetPagination = () => this.currentPage.set(1);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);

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

  getChangedFields(oldData: any, newData: any) {
    if (!oldData || !newData) return [];
    
    const fieldsToTrack = [
      { field: 'name', label: 'Nombre' },
      { field: 'address', label: 'Dirección' },
      { field: 'city', label: 'Ciudad' },
      { field: 'phone', label: 'Teléfono' },
      { field: 'manager', label: 'Encargado' },
      { field: 'isActive', label: 'Estado' },
      { field: 'isMain', label: 'Sucursal principal' },
      { field: 'revenue', label: 'Ingresos' },
      { field: 'codigoEstablecimiento', label: 'Código Establecimiento' },
      { field: 'dirEstablecimiento', label: 'Dirección Comprobantes' },
      { field: 'nombreComercialSucursal', label: 'Nombre Comercial' },
    ];

    return fieldsToTrack
      .filter(f => {
        const oldVal = oldData[f.field];
        const newVal = newData[f.field];
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
      })
      .map(f => ({
        ...f,
        oldValue: this.formatValue(oldData[f.field]),
        newValue: this.formatValue(newData[f.field])
      }));
  }

  private formatValue(val: any): string {
    if (val === true) return 'Activado';
    if (val === false) return 'Desactivado';
    if (val === null || val === undefined) return '';
    return String(val);
  }
}
