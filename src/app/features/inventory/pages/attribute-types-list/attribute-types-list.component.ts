import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';
import { provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucidePencil, lucideTrash2, lucideSearch, lucideSave,
  lucideSliders, lucideHash, lucideType, lucideHistory,
  lucidePlusCircle, lucideRefreshCw, lucideTrash
} from '@ng-icons/lucide';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { ActionsMenuComponent, ActionItem } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { ToggleSwitchComponent } from '../../../../shared/components/ui/toggle-switch/toggle-switch';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/ui/custom-select/custom-select.component';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { DatelineComponent, DatelineItem } from '../../../../shared/components/ui/dateline/dateline.component';

import { AttributeTypeDetailComponent } from '../../components/attribute-type-detail/attribute-type-detail.component';
import { AttributeTypesAdvancedFilters } from '../../components/attribute-types-advanced-filters/attribute-types-advanced-filters';

import { AttributeTypeService } from '../../../../core/services/attribute-type.service';
import { ModalService } from '../../../../core/components/modal/modal.service';
import { ToastService } from '../../../../core/services/toast.service';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';
import { AttributeType } from '../../models/product.model';

const DATA_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Texto', NUMBER: 'Numérico', COLOR: 'Color', BOOLEAN: 'Sí/No',
};

@Component({
  selector: 'app-attribute-types-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DataCardComponent, SkeletonComponent, EmptyStateComponent,
    ModalComponent, FormButtonComponent, ActionsMenuComponent,
    DrawerComponent, FieldInputComponent, ToggleSwitchComponent,
    SpinnerComponent, DatelineComponent,
    AttributeTypeDetailComponent, CustomSelectComponent,
  ],
  providers: [
    provideIcons({
      lucidePlus, lucidePencil, lucideTrash2, lucideSearch, lucideSave,
      lucideSliders, lucideHash, lucideType, lucideHistory,
      lucidePlusCircle, lucideRefreshCw, lucideTrash
    })
  ],
  template: `
    <div class="attr-page">
      <app-page-header
        title="Tipos de Atributo"
        [tabs]="tabs"
        [activeTab]="activeTab()"
        ctaText="Nuevo Atributo"
        ctaIcon="lucidePlus"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAdd()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar atributos..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="activeFiltersCount()"
        [viewMode]="viewMode()"
        (searchChange)="onSearch($event)"
        (viewModeChange)="viewMode.set($event)"
        (sortChange)="onSortChange($event)"
        (openFilters)="openAdvancedFilters()"
      ></app-list-toolbar>

      <div [ngClass]="viewMode() === 'grid' ? 'attr-page__grid' : 'attr-page__list'">

        @if (isLoading()) {
          @for (n of [1,2,3,4,5,6]; track n) {
            @if (viewMode() === 'grid') {
              <div class="data-card skeleton-card">
                <header class="sk-header">
                  <div class="sk-title-container">
                    <app-skeleton width="140px" height="1rem"></app-skeleton>
                    <app-skeleton width="56px" height="18px" radius="999px"></app-skeleton>
                  </div>
                  <app-skeleton width="28px" height="28px" shape="circle"></app-skeleton>
                </header>
                <div class="sk-body">
                  <div class="sk-detail"><app-skeleton width="14px" height="14px" radius="3px"></app-skeleton><app-skeleton width="70px" height="0.8125rem"></app-skeleton></div>
                  <div class="sk-detail"><app-skeleton width="14px" height="14px" radius="3px"></app-skeleton><app-skeleton width="50px" height="0.8125rem"></app-skeleton></div>
                </div>
              </div>
            } @else {
              <div class="attr-row-item skeleton-row">
                <div class="row-main">
                  <app-skeleton width="44px" height="44px" radius="10px"></app-skeleton>
                  <div class="sk-attr-info"><app-skeleton width="140px" height="0.875rem"></app-skeleton><app-skeleton width="80px" height="0.75rem"></app-skeleton></div>
                </div>
                <app-skeleton width="64px" height="22px" radius="999px"></app-skeleton>
                <app-skeleton width="28px" height="28px" shape="circle"></app-skeleton>
              </div>
            }
          }
        } @else if (items().length > 0) {
          @for (attr of items(); track attr.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                [title]="attr.name"
                [status]="attr.isActive ? 'Activo' : 'Inactivo'"
                [statusConfig]="attr.isActive ? 'active' : 'inactive'"
                [details]="[
                  { icon: 'lucideType', text: dataTypeLabel(attr.dataType) },
                  { icon: 'lucideHash', text: attr.unit || 'Sin unidad' }
                ]"
                [actions]="attr.isSystem ? systemActions : itemActions"
                (actionClick)="handleAction($event, attr)"
                (click)="onShowDetail(attr)"
              ></app-data-card>
            } @else {
              <div class="attr-row-item" (click)="onShowDetail(attr)">
                <div class="row-main">
                  <div class="attr-avatar"><span>{{ attr.name[0]?.toUpperCase() }}</span></div>
                  <div class="attr-info">
                    <span class="attr-name">{{ attr.name }}</span>
                    <span class="attr-sub">{{ dataTypeLabel(attr.dataType) }}{{ attr.unit ? ' · ' + attr.unit : '' }}</span>
                  </div>
                </div>
                <div class="row-badges">
                  @if (attr.isSystem) { <span class="badge-status system">Sistema</span> }
                  <span [class]="'badge-status ' + (attr.isActive ? 'active' : 'inactive')">{{ attr.isActive ? 'Activo' : 'Inactivo' }}</span>
                </div>
                <div (click)="$event.stopPropagation()">
                  <app-actions-menu [actions]="attr.isSystem ? systemActions : itemActions" (actionClick)="handleAction($event, attr)"></app-actions-menu>
                </div>
              </div>
            }
          }
        } @else {
          <div class="attr-page__empty">
            <app-empty-state
              [icon]="searchQuery() ? 'lucideSearch' : 'lucideSliders'"
              [title]="searchQuery() ? 'No encontramos lo que buscas' : 'No hay tipos de atributo'"
              [description]="searchQuery() ? 'Intenta con otros términos.' : 'Crea el primer tipo de atributo para diferenciar variantes.'"
              [actionLabel]="searchQuery() ? 'Limpiar búsqueda' : 'Nuevo Atributo'"
              (action)="searchQuery() ? clearSearch() : onAdd()"
            ></app-empty-state>
          </div>
        }
      </div>

      <app-pagination [totalItems]="totalItems()" [pageSize]="pageSize()" [currentPage]="currentPage()" (pageChange)="currentPage.set($event)"></app-pagination>

      <!-- Drawer: Detalle -->
      <app-drawer [isOpen]="isDetailOpen()" title="Detalle del Atributo" (close)="isDetailOpen.set(false)" size="md">
        <div drawerBody>
          @if (selectedAttr()) {
            <app-attribute-type-detail [attr]="selectedAttr()!"></app-attribute-type-detail>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Ver Historial" icon="lucideHistory" variant="secondary" (click)="onShowHistory(selectedAttr()!.id)"></app-form-button>
          @if (selectedAttr() && !selectedAttr()!.isSystem) {
            <app-form-button label="Editar" icon="lucidePencil" (click)="onEditFromDetail(selectedAttr()!)"></app-form-button>
          }
        </div>
      </app-drawer>

      <!-- Drawer: Historial -->
      <app-drawer [isOpen]="isHistoryOpen()" title="Historial de Actividad" (close)="isHistoryOpen.set(false)" size="md">
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

      <!-- Drawer: Crear / Editar -->
      <app-drawer
        [isOpen]="formDrawerOpen()"
        [title]="editingAttr() ? 'Editar Atributo' : 'Nuevo Atributo'"
        size="md"
        (close)="formDrawerOpen.set(false)"
      >
        <div drawerBody class="drawer-form" [formGroup]="drawerForm">
          <app-field-input
            formControlName="name"
            label="Nombre"
            placeholder="Ej: Talla, Color, Memoria..."
            [required]="true"
            [errorMessages]="{ required: 'Nombre requerido', maxlength: 'Máximo 100 caracteres' }"
          ></app-field-input>

          <div class="pff">
            <label class="pff__label">Tipo de Dato <span class="pff__req">*</span></label>
            <app-custom-select
              [options]="dataTypeOptions"
              [value]="drawerForm.get('dataType')?.value"
              (valueChange)="drawerForm.get('dataType')?.setValue($event)"
            ></app-custom-select>
          </div>

          <app-field-input
            formControlName="unit"
            label="Unidad"
            placeholder="Ej: ml, cm, kg..."
            [optional]="true"
            hint="Unidad de referencia que se muestra junto al campo"
          ></app-field-input>

          <div class="pff__toggle-row" (click)="isActiveToggle.toggle()">
            <div class="pff__toggle-info">
              <span class="pff__toggle-label">Activo</span>
              <small class="pff__toggle-hint">Los atributos inactivos no aparecen al configurar variantes</small>
            </div>
            <app-toggle-switch #isActiveToggle formControlName="isActive" (click)="$event.stopPropagation()"></app-toggle-switch>
          </div>
        </div>

        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" [disabled]="isSaving()" (click)="formDrawerOpen.set(false)"></app-form-button>
          <app-form-button
            [label]="editingAttr() ? 'Actualizar' : 'Guardar'"
            icon="lucideSave"
            [loading]="isSaving()"
            [disabled]="drawerForm.invalid || isSaving()"
            (click)="onSave()"
          ></app-form-button>
        </div>
      </app-drawer>

      <!-- Modal: Confirmar eliminación -->
      <app-modal [isOpen]="deleteModalOpen()" title="Confirmar Eliminación" (close)="deleteModalOpen.set(false)">
        <div modalBody>
          ¿Estás seguro de eliminar el atributo "<strong>{{ attrToDelete()?.name }}</strong>"?
          Si está asignado a categorías, se desvinculará automáticamente.
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="deleteModalOpen.set(false)"></app-form-button>
          <app-form-button label="Eliminar" variant="danger" icon="lucideTrash2" [loading]="isDeleting()" [disabled]="isDeleting()" (click)="confirmDelete()"></app-form-button>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    .attr-page { display: flex; flex-direction: column; min-height: 100%; width: 100%; }
    .attr-page__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
    .attr-page__list { display: flex; flex-direction: column; gap: 0.75rem; }
    .attr-page__empty { grid-column: 1 / -1; display: flex; justify-content: center; width: 100%; padding: 4rem 1rem; }

    .skeleton-card { pointer-events: none; background: var(--color-bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border-light); padding: 20px; }
    .skeleton-row { pointer-events: none; }
    .sk-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .sk-title-container { display: flex; flex-direction: column; gap: 6px; }
    .sk-body { display: flex; flex-direction: column; gap: 10px; }
    .sk-detail { display: flex; align-items: center; gap: 8px; }
    .sk-attr-info { display: flex; flex-direction: column; gap: 5px; }

    .attr-row-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.5rem; background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-lg);
      cursor: pointer; transition: all var(--transition-base);
      &:hover { border-color: var(--color-accent-primary); background: var(--color-bg-hover); }
    }

    .row-main { display: flex; align-items: center; gap: 1rem; }
    .row-badges { display: flex; align-items: center; gap: 6px; }
    .attr-avatar {
      width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-weight: var(--font-weight-bold); font-size: var(--font-size-sm);
      background: var(--color-primary-subtle); color: var(--color-accent-primary);
    }
    .attr-info { display: flex; flex-direction: column; gap: 5px; }
    .attr-name { font-weight: var(--font-weight-semibold); color: var(--color-text-main); }
    .attr-sub { font-size: var(--font-size-sm); color: var(--color-text-muted); }

    .badge-status { padding: 0.25rem 0.75rem; border-radius: 99px; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }
    .badge-status.active { background: var(--color-success-bg); color: var(--color-success-text); }
    .badge-status.inactive { background: var(--color-border-subtle); color: var(--color-text-muted); }
    .badge-status.system { background: rgba(79, 70, 229, 0.08); color: var(--color-accent-primary); }

    .drawer-form { display: flex; flex-direction: column; gap: 20px; }
    .drawer-footer-actions { display: flex; gap: 1rem; justify-content: flex-end; }
    .modal-footer-actions { display: flex; gap: 1rem; justify-content: flex-end; }

    .history-container { min-height: 200px; }
    .history-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 3rem 1rem; color: var(--color-text-muted); font-size: var(--font-size-sm); }
  `]
})
export class AttributeTypesListComponent {
  private attrSvc     = inject(AttributeTypeService);
  private toastSvc    = inject(ToastService);
  private modalSvc    = inject(ModalService);
  private fb          = inject(FormBuilder);

  readonly itemActions: ActionItem[] = [
    { id: 'edit',    label: 'Editar',      icon: 'lucidePencil' },
    { id: 'history', label: 'Historial',   icon: 'lucideHistory' },
    { id: 'delete',  label: 'Eliminar',    icon: 'lucideTrash2', variant: 'danger' },
  ];
  readonly systemActions: ActionItem[] = [
    { id: 'history', label: 'Historial',   icon: 'lucideHistory' },
  ];

  readonly dataTypeOptions: SelectOption[] = [
    { label: 'Texto', value: 'TEXT' },
    { label: 'Numérico', value: 'NUMBER' },
    { label: 'Color', value: 'COLOR' },
    { label: 'Sí / No', value: 'BOOLEAN' },
  ];

  readonly tabs = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Activos', value: 'Activos' },
    { label: 'Inactivos', value: 'Inactivos' },
  ];

  // List state
  activeTab      = signal('Todos');
  searchQuery    = signal('');
  viewMode       = signal<'grid' | 'list'>('grid');
  currentPage    = signal(1);
  pageSize       = signal(12);
  sortField      = signal('name');
  sortOrder      = signal<'ASC' | 'DESC'>('ASC');
  refreshTrigger = signal(0);
  isLoading      = signal(true);

  // Detail drawer
  isDetailOpen   = signal(false);
  selectedAttr   = signal<AttributeType | null>(null);

  // History drawer
  isHistoryOpen   = signal(false);
  isHistoryLoading = signal(false);
  attrLogs        = signal<any[]>([]);

  // Form drawer
  formDrawerOpen = signal(false);
  editingAttr    = signal<AttributeType | null>(null);
  isSaving       = signal(false);

  // Delete modal
  deleteModalOpen = signal(false);
  attrToDelete    = signal<AttributeType | null>(null);
  isDeleting      = signal(false);

  // Advanced filters
  filterTree = signal<FilterGroup>({ type: 'group', id: 'root', logicalOperator: 'AND', children: [] });
  readonly filterConfig: FilterField[] = [
    { id: 'name', label: 'Nombre', type: 'text' },
    { id: 'dataType', label: 'Tipo de Dato', type: 'select', options: [
      { label: 'Texto', value: 'TEXT' }, { label: 'Numérico', value: 'NUMBER' },
      { label: 'Color', value: 'COLOR' }, { label: 'Sí/No', value: 'BOOLEAN' },
    ]},
    { id: 'unit', label: 'Unidad', type: 'text' },
  ];

  activeFiltersCount = computed(() => {
    const count = (node: FilterNode): number => {
      if (node.type === 'group') return (node as FilterGroup).children.reduce((a, c) => a + count(c), 0);
      const rule = node as FilterRule;
      if (['blank', 'notBlank'].includes(rule.operator)) return 1;
      return rule.value && String(rule.value).trim() !== '' ? 1 : 0;
    };
    return count(this.filterTree());
  });

  drawerForm!: FormGroup;

  constructor() {
    this.drawerForm = this.fb.group({
      name:     ['', [Validators.required, Validators.maxLength(100)]],
      dataType: ['TEXT', Validators.required],
      unit:     [''],
      isActive: [true],
    });
  }

  // ── Data pipeline ──────────────────────────────────────────────────────
  private readonly response = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(), limit: this.pageSize(),
      search: this.searchQuery(), sortField: this.sortField(), sortOrder: this.sortOrder(),
      tab: this.activeTab(), filterModel: QueryMapper.toAgGridFilterModel(this.filterTree(), this.filterConfig),
      refresh: this.refreshTrigger(),
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        const filters: any = {
          page: params.page, limit: params.limit, search: params.search,
          sortField: params.sortField, sortOrder: params.sortOrder, filterModel: params.filterModel,
        };
        if (params.tab === 'Activos')   filters.onlyActive = true;
        if (params.tab === 'Inactivos') filters.onlyActive = false;
        return this.attrSvc.findAll(filters).pipe(tap(() => this.isLoading.set(false)));
      })
    )
  );

  items      = computed(() => this.response()?.data  ?? []);
  totalItems = computed(() => this.response()?.total ?? 0);

  mappedLogs = computed<DatelineItem[]>(() =>
    this.attrLogs().map((l: any) => ({
      id: l.id,
      date: l.createdAt,
      action: l.action,
      actionLabel: this.getLogActionLabel(l.action),
      user: l.userName || 'Sistema',
      icon: this.getLogIcon(l.action),
    }))
  );

  dataTypeLabel(dt: string): string { return DATA_TYPE_LABELS[dt] ?? dt; }

  private getLogActionLabel(action: string): string {
    const m: Record<string, string> = { CREATE: 'Creado', UPDATE: 'Actualizado', DELETE: 'Eliminado' };
    return m[action] ?? action;
  }

  private getLogIcon(action: string): string {
    const m: Record<string, string> = { CREATE: 'lucidePlusCircle', UPDATE: 'lucideRefreshCw', DELETE: 'lucideTrash' };
    return m[action] ?? 'lucideHistory';
  }

  // ── List actions ───────────────────────────────────────────────────────
  onTabChange(tab: string) { this.activeTab.set(tab); this.currentPage.set(1); }
  onSearch(q: string)      { this.searchQuery.set(q); this.currentPage.set(1); }
  onSortChange(ev: any)    { this.sortField.set(ev.field); this.sortOrder.set(ev.order.toUpperCase()); this.currentPage.set(1); }
  clearSearch()            { this.searchQuery.set(''); }

  handleAction(action: ActionItem, attr: AttributeType) {
    if (action.id === 'edit')    this.onEditFromDetail(attr);
    if (action.id === 'history') this.onShowHistory(attr.id);
    if (action.id === 'delete')  { this.attrToDelete.set(attr); this.deleteModalOpen.set(true); }
  }

  // ── Detail ─────────────────────────────────────────────────────────────
  onShowDetail(attr: AttributeType) {
    this.selectedAttr.set(attr);
    this.isDetailOpen.set(true);
  }

  // ── History ────────────────────────────────────────────────────────────
  onShowHistory(id: string) {
    this.isDetailOpen.set(false);
    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);
    this.attrSvc.findLogs(id).subscribe({
      next: logs => { this.attrLogs.set(logs); this.isHistoryLoading.set(false); },
      error: () => { this.attrLogs.set([]); this.isHistoryLoading.set(false); }
    });
  }

  // ── Form drawer ────────────────────────────────────────────────────────
  onAdd() {
    this.editingAttr.set(null);
    this.drawerForm.reset({ name: '', dataType: 'TEXT', unit: '', isActive: true });
    this.drawerForm.get('name')?.enable();
    this.drawerForm.get('dataType')?.enable();
    this.formDrawerOpen.set(true);
  }

  onEditFromDetail(attr: AttributeType) {
    this.isDetailOpen.set(false);
    this.editingAttr.set(attr);
    this.drawerForm.patchValue({ name: attr.name, dataType: attr.dataType, unit: attr.unit ?? '', isActive: attr.isActive });
    if (attr.isSystem) {
      this.drawerForm.get('name')?.disable();
      this.drawerForm.get('dataType')?.disable();
    } else {
      this.drawerForm.get('name')?.enable();
      this.drawerForm.get('dataType')?.enable();
    }
    this.formDrawerOpen.set(true);
  }

  onSave() {
    this.drawerForm.markAllAsTouched();
    if (this.drawerForm.invalid) return;
    this.isSaving.set(true);
    const val = this.drawerForm.getRawValue();
    const dto = { name: val.name, dataType: val.dataType, unit: val.unit || undefined, isActive: val.isActive };
    const editing = this.editingAttr();
    const obs$ = editing ? this.attrSvc.update(editing.id, dto) : this.attrSvc.create(dto);
    obs$.subscribe({
      next: () => {
        this.toastSvc.success(editing ? 'Atributo actualizado' : 'Atributo creado');
        this.formDrawerOpen.set(false);
        this.isSaving.set(false);
        this.refreshTrigger.update(v => v + 1);
      },
      error: () => { this.toastSvc.error('Error al guardar el atributo'); this.isSaving.set(false); }
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  confirmDelete() {
    const a = this.attrToDelete(); if (!a) return;
    this.isDeleting.set(true);
    this.attrSvc.remove(a.id).subscribe({
      next: () => {
        this.toastSvc.success('Atributo eliminado');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleting.set(false);
        this.deleteModalOpen.set(false);
      },
      error: () => { this.toastSvc.error('Error al eliminar el atributo'); this.isDeleting.set(false); }
    });
  }

  // ── Advanced Filters ───────────────────────────────────────────────────
  openAdvancedFilters() {
    this.modalSvc.open(
      AttributeTypesAdvancedFilters,
      'Filtros Avanzados',
      {
        filterTree: this.filterTree,
        availableFields: this.filterConfig,
        onFilterTreeChange: (tree: FilterNode) => this.filterTree.set(tree as FilterGroup),
      },
      'Los filtros se aplican en tiempo real',
      [{ label: 'Hecho', variant: 'primary' as const, action: () => this.modalSvc.close() }]
    );
  }
}
