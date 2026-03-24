import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';
import { provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideDownload,
  lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash,
  lucideHash, lucideLayers, lucideCloudDownload,
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

import { UnitsService } from '../../../../core/services/units.service';
import { Unit, UnitType, UNIT_TYPE_LABELS } from '../../../../core/models/unit.models';
import { ToastService } from '../../../../core/services/toast.service';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';

import { UnitFormComponent } from '../../components/unit-form/unit-form';
import { UnitDetailComponent } from '../../components/unit-detail/unit-detail.component';
import { UnitsAdvancedFilters } from './components/units-advanced-filters/units-advanced-filters';
import { UnitImportModalComponent } from '../../components/unit-import-modal/unit-import-modal';

@Component({
  selector: 'app-units-list',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DataCardComponent, SkeletonComponent, EmptyStateComponent,
    DrawerComponent, ModalComponent, SpinnerComponent,
    FormButtonComponent, ActionsMenuComponent, DatelineComponent,
    UnitFormComponent, UnitDetailComponent, UnitsAdvancedFilters,
    UnitImportModalComponent,
  ],
  providers: [
    provideIcons({
      lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideDownload,
      lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash,
      lucideHash, lucideLayers, lucideCloudDownload,
    })
  ],
  template: `
    <div class="units-page">
      <app-page-header
        title="Unidades de Medida"
        [tabs]="unitTabs"
        [activeTab]="activeTab()"
        ctaText="Nueva Unidad"
        ctaIcon="lucidePlus"
        secondaryCtaText="Importar"
        secondaryCtaIcon="lucideDownload"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAddUnit()"
        (secondaryCtaClick)="importModal.open()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar unidades..."
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

      <div [ngClass]="viewMode() === 'grid' ? 'units-page__grid' : 'units-page__list'">
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
                    <app-skeleton width="60px" height="0.875rem"></app-skeleton>
                  </div>
                  <div class="data-card__detail">
                    <app-skeleton width="14px" height="14px" shape="circle"></app-skeleton>
                    <app-skeleton width="90px" height="0.875rem"></app-skeleton>
                  </div>
                </div>
              </div>
            } @else {
              <div class="unit-row-item skeleton-row">
                <div class="row-main">
                  <app-skeleton width="44px" height="44px" radius="8px"></app-skeleton>
                  <div class="unit-info">
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
        } @else if (units().length > 0) {
          @for (unit of units(); track unit.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                [title]="unit.name"
                [status]="unit.isActive ? 'Activa' : 'Inactiva'"
                [statusConfig]="unit.isActive ? 'active' : 'inactive'"
                [details]="[
                  { icon: 'lucideHash', text: unit.abbreviation },
                  { icon: 'lucideLayers', text: typeLabel(unit.type) }
                ]"
                [actions]="unitActions"
                (actionClick)="handleActionClick($event, unit)"
                (click)="onShowDetail(unit)"
                class="clickable-card"
              ></app-data-card>
            } @else {
              <div class="unit-row-item" (click)="onShowDetail(unit)">
                <div class="row-main">
                  <div class="unit-avatar">
                    <span>{{ unit.abbreviation }}</span>
                  </div>
                  <div class="unit-info">
                    <span class="unit-name">{{ unit.name }}</span>
                    <span class="unit-sub">{{ typeLabel(unit.type) }}</span>
                  </div>
                </div>
                <div class="row-status">
                  <span [class]="'badge-status ' + (unit.isActive ? 'active' : 'inactive')">
                    {{ unit.isActive ? 'Activa' : 'Inactiva' }}
                  </span>
                </div>
                <div class="row-actions" (click)="$event.stopPropagation()">
                  <app-actions-menu
                    [actions]="unitActions"
                    (actionClick)="handleActionClick($event, unit)"
                  ></app-actions-menu>
                </div>
              </div>
            }
          }
        } @else {
          <div class="units-page__empty">
            <app-empty-state
              [icon]="activeFiltersCount() > 0 || searchQuery() ? 'lucideSearch' : 'lucideRuler'"
              [title]="activeFiltersCount() > 0 || searchQuery() ? 'No encontramos lo que buscas' : 'No hay unidades registradas'"
              [description]="activeFiltersCount() > 0 || searchQuery() ? 'Intenta con otros términos o ajusta tus filtros.' : 'Crea la primera unidad de medida.'"
              [actionLabel]="activeFiltersCount() > 0 || searchQuery() ? 'Limpiar Filtros' : 'Nueva Unidad'"
              (action)="activeFiltersCount() > 0 || searchQuery() ? clearAllFilters() : onAddUnit()"
            ></app-empty-state>
          </div>
        }
      </div>

      <!-- Drawer: Detalle -->
      <app-drawer
        [isOpen]="isDetailOpen()"
        title="Detalle de Unidad"
        (close)="isDetailOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          @if (selectedUnit()) {
            <app-unit-detail [unit]="selectedUnit()!"></app-unit-detail>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Historial" icon="lucideHistory" variant="ghost" type="button"
            [fullWidth]="false" (click)="onShowHistory(selectedUnit()!.id)"></app-form-button>
          <app-form-button label="Editar Unidad" icon="lucidePencil" variant="secondary" type="button"
            [fullWidth]="false" (click)="onEditUnit(selectedUnit()!)"></app-form-button>
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
          <app-units-advanced-filters
            #advancedFilters
            [filterTree]="filterTree"
            [availableFields]="availableFields"
            (applied)="onFilterTreeChange($event); isFiltersOpen.set(false)"
          ></app-units-advanced-filters>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary"
            (click)="isFiltersOpen.set(false)"></app-form-button>
          <app-form-button label="Aplicar filtros" variant="primary"
            (click)="advancedFilters.applyFilters()"></app-form-button>
        </div>
      </app-drawer>

      <!-- Drawer: Crear/Editar Unidad -->
      <app-drawer
        [isOpen]="isDrawerOpen()"
        [title]="isEditing() ? 'Editar Unidad' : 'Nueva Unidad'"
        [allowClose]="!(unitForm?.isSubmitting())"
        (close)="onDrawerClose()"
        size="md"
      >
        <div drawerBody>
          <app-unit-form
            #unitForm
            (saved)="onUnitSaved($event)"
          ></app-unit-form>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" type="button"
            [disabled]="!!(unitForm?.isSubmitting())" (click)="onDrawerClose()"></app-form-button>
          <app-form-button
            [label]="isEditing() ? 'Actualizar Unidad' : 'Guardar Unidad'"
            loadingLabel="Guardando..." icon="lucideSave"
            [loading]="!!(unitForm?.isSubmitting())"
            [disabled]="unitForm?.unitForm?.invalid ?? true"
            (click)="unitForm?.onSubmit()"
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
          ¿Eliminar la unidad <strong>"{{ unitToDelete()?.name }}"</strong>?
          Esta acción no se puede deshacer.
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="ghost" type="button" [fullWidth]="false"
            [disabled]="isDeleting()" (click)="cancelDelete()"></app-form-button>
          <app-form-button label="Eliminar" loadingLabel="Eliminando..." variant="danger" type="button"
            [fullWidth]="false" [loading]="isDeleting()" (click)="confirmDelete()"></app-form-button>
        </div>
      </app-modal>

      <app-unit-import-modal
        #importModal
        (imported)="refreshTrigger.update(v => v + 1)"
      ></app-unit-import-modal>
    </div>
  `,
  styleUrl: './units-list.component.scss'
})
export class UnitsListComponent {
  private unitsSvc = inject(UnitsService);
  private toastService = inject(ToastService);

  @ViewChild('unitForm') unitFormRef?: UnitFormComponent;
  @ViewChild('advancedFilters') advancedFiltersRef!: UnitsAdvancedFilters;
  @ViewChild('importModal') importModal!: UnitImportModalComponent;

  unitActions: ActionItem[] = [
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
  selectedUnit       = signal<Unit | null>(null);
  isHistoryOpen      = signal(false);
  isHistoryLoading   = signal(false);
  isDeleteModalOpen  = signal(false);
  isDeleting         = signal(false);
  unitToDelete       = signal<Unit | null>(null);
  unitLogs           = signal<any[]>([]);

  // ── Config ───────────────────────────────────────────────────────────────────
  unitTabs = [
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
    { id: 'abbreviation', label: 'Abreviación', type: 'text' },
    { id: 'type', label: 'Tipo', type: 'text' },
    { id: 'isActive', label: 'Estado', type: 'status' },
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
    this.unitLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: this.getLogActionLabel(log.action),
      user: log.userName || 'Sistema',
      icon: this.getLogIcon(log.action),
      message: log.action === 'IMPORT' ? `Importación masiva de ${log.details?.count} unidades.` : undefined,
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
        if (tab === 'Activas') filters.filterModel['isActive'] = { filterType: 'boolean', filter: true };
        else if (tab === 'Inactivas') filters.filterModel['isActive'] = { filterType: 'boolean', filter: false };
        return this.unitsSvc.findAll(filters).pipe(tap(() => this.isLoading.set(false)));
      })
    )
  );

  units = computed(() => this.response()?.data || []);
  totalItems = computed(() => this.response()?.total || 0);

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mq.matches);
      mq.addEventListener('change', e => this.isMobile.set(e.matches));
    }
  }

  typeLabel(type: UnitType): string { return UNIT_TYPE_LABELS[type] ?? type; }

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
  onAddUnit() {
    this.isEditing.set(false);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.unitFormRef?.resetForm(), 0);
  }

  onEditUnit(unit: Unit) {
    this.isDetailOpen.set(false);
    this.isEditing.set(true);
    this.isDrawerOpen.set(true);
    setTimeout(() => this.unitFormRef?.setUnit(unit), 0);
  }

  onUnitSaved(_unit: Unit) {
    this.isDrawerOpen.set(false);
    this.refreshTrigger.update(v => v + 1);
    this.resetPagination();
  }

  onDrawerClose() {
    if (this.unitFormRef?.hasUnsavedChanges()) {
      this.isConfirmCloseOpen.set(true);
    } else {
      this.isDrawerOpen.set(false);
      this.unitFormRef?.resetForm();
    }
  }

  forceCloseDrawer() {
    this.isConfirmCloseOpen.set(false);
    this.isDrawerOpen.set(false);
    this.unitFormRef?.resetForm();
  }

  // ── Detail & History ──────────────────────────────────────────────────────────
  onShowDetail(unit: Unit) {
    this.selectedUnit.set(unit);
    this.isDetailOpen.set(true);
  }

  handleActionClick(action: ActionItem, unit: Unit) {
    if (action.id === 'edit') this.onEditUnit(unit);
    else if (action.id === 'history') this.onShowHistory(unit.id);
    else if (action.id === 'delete') {
      this.unitToDelete.set(unit);
      this.isDeleteModalOpen.set(true);
    }
  }

  onShowHistory(id: string) {
    this.isDetailOpen.set(false);
    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);
    this.unitsSvc.getLogs(id).subscribe({
      next: logs => {
        this.unitLogs.set(logs);
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
    this.unitToDelete.set(null);
  }

  confirmDelete() {
    const u = this.unitToDelete();
    if (!u || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.unitsSvc.remove(u.id).subscribe({
      next: () => {
        this.toastService.success('Unidad eliminada correctamente');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleting.set(false);
        this.cancelDelete();
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? 'No se pudo eliminar la unidad');
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
      { field: 'abbreviation', label: 'Abreviación' },
      { field: 'type', label: 'Tipo' },
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
    if (field === 'isActive') return val ? 'Activa' : 'Inactiva';
    if (field === 'type') return UNIT_TYPE_LABELS[val as UnitType] ?? String(val || '');
    return String(val || '');
  }
}
