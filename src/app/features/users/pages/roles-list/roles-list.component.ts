import { Component, signal, inject, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, tap, switchMap, finalize } from 'rxjs';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideShield, lucidePlus, lucideRefreshCw, lucideTrash, lucideCloudDownload,
  lucidePencil, lucideSave, lucideTrash2, lucideHistory
} from '@ng-icons/lucide';

import { RolesService, Role } from '../../services/roles.service';
import { ToastService } from '../../../../core/services/toast.service';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { BadgeComponent } from '../../../../core/layout/atoms/badge/badge.component';
import { ActionItem, ActionsMenuComponent } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { DatelineComponent, DatelineItem } from '../../../../shared/components/ui/dateline/dateline.component';

import { RoleAdvancedFilters } from './components/role-advanced-filters/role-advanced-filters';
import { RoleFormComponent } from '../../components/role-form/role-form.component';
import { RoleDetailComponent } from '../../components/role-detail/role-detail.component';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [
    CommonModule, NgIconComponent,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DataCardComponent, SkeletonComponent, EmptyStateComponent,
    BadgeComponent, DrawerComponent, ModalComponent,
    ActionsMenuComponent, FormButtonComponent, SpinnerComponent,
    DatelineComponent, RoleAdvancedFilters,
    RoleFormComponent, RoleDetailComponent,
  ],
  providers: [
    provideIcons({
      lucideShield, lucidePlus, lucideRefreshCw, lucideTrash, lucideCloudDownload,
      lucidePencil, lucideSave, lucideTrash2, lucideHistory
    })
  ],
  template: `
    <div class="page-shell">
    <div class="roles-page">
      <app-page-header
        title="Gestión de Roles y Permisos"
        [tabs]="roleTabs"
        [activeTab]="activeTab()"
        ctaText="Nuevo Rol"
        ctaIcon="lucidePlus"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onOpenCreateForm()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar roles..."
        [searchQuery]="searchQuery()"
        [viewMode]="viewModePreference()"
        [sortOptions]="roleSortOptions"
        [activeFiltersCount]="activeFiltersCount()"
        (openFilters)="openAdvancedFilters()"
        (clearFilters)="clearAllFilters()"
        (searchChange)="onSearchChange($event)"
        (viewModeChange)="viewModePreference.set($event)"
        (sortChange)="onSortChange($event)"
      ></app-list-toolbar>

      <div [class]="viewMode() === 'grid' ? 'roles-grid' : 'roles-list-layout'">
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
                    <app-skeleton width="110px" height="0.875rem"></app-skeleton>
                  </div>
                </div>
              </div>
            } @else {
              <div class="role-row-item skeleton-row">
                <div class="row-main">
                  <app-skeleton width="48px" height="48px" radius="8px"></app-skeleton>
                  <div class="role-info">
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
        } @else if (roles().length === 0) {
          <div class="roles-page__empty">
            <app-empty-state
              [icon]="activeFiltersCount() > 0 || searchQuery() ? 'lucideSearch' : 'lucideShield'"
              [title]="activeFiltersCount() > 0 || searchQuery() ? 'No encontramos roles' : 'No hay roles registrados'"
              [description]="activeFiltersCount() > 0 || searchQuery() ? 'Intenta con otros términos o ajusta tus filtros.' : 'Comienza definiendo los permisos de tu equipo.'"
              [actionLabel]="activeFiltersCount() > 0 || searchQuery() ? 'Limpiar Filtros' : 'Nuevo Rol'"
              (action)="activeFiltersCount() > 0 || searchQuery() ? clearAllFilters() : onOpenCreateForm()"
            ></app-empty-state>
          </div>
        } @else {
          @for (role of roles(); track role.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                class="cursor-pointer"
                (click)="onShowDetail(role)"
                [title]="role.name"
                [status]="role.name === 'SUPER_ADMIN' ? 'Sistema' : 'Personalizado'"
                [statusConfig]="role.name === 'SUPER_ADMIN' ? 'warning' : 'active'"
                [details]="[{ icon: 'lucideShield', text: (role.permissions?.length || 0) + ' permisos asignados' }]"
                [actions]="roleActions"
                (actionClick)="handleActionClick($event, role)"
              ></app-data-card>
            } @else {
              <div class="role-row-item" (click)="onShowDetail(role)">
                <div class="row-main">
                  <div class="role-icon-box">
                    <ng-icon name="lucideShield"></ng-icon>
                  </div>
                  <div class="role-info">
                    <h4 class="role-name">{{ role.name }}</h4>
                    <span class="role-desc">{{ role.permissions?.length || 0 }} permisos asignados</span>
                  </div>
                </div>
                <div class="row-status">
                  <app-badge
                    [variant]="role.name === 'SUPER_ADMIN' ? 'primary' : 'success'"
                    [text]="role.name === 'SUPER_ADMIN' ? 'Sistema' : 'Personalizado'"
                  ></app-badge>
                </div>
                <div class="row-actions" (click)="$event.stopPropagation()">
                  <app-actions-menu
                    [actions]="roleActions"
                    (actionClick)="handleActionClick($event, role)"
                  ></app-actions-menu>
                </div>
              </div>
            }
          }
        }
      </div>

      <app-pagination
        [totalItems]="totalItems()"
        [pageSize]="pageSize()"
        [currentPage]="currentPage()"
        (pageChange)="currentPage.set($event)"
      ></app-pagination>

      <!-- Drawer: Form -->
      <app-drawer
        [isOpen]="isFormOpen()"
        [title]="selectedRole() ? 'Editar Rol' : 'Nuevo Rol'"
        [allowClose]="!(roleFormRef?.isSubmitting())"
        (close)="onDrawerClose()"
        size="md"
      >
        <div drawerBody>
          @if (isFormOpen()) {
            <app-role-form
              #roleFormRef
              [roleId]="selectedRole()?.id"
              (saved)="onFormSaved()"
              (cancelled)="onDrawerClose()"
            ></app-role-form>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" type="button"
            [disabled]="!!(roleFormRef?.isSubmitting())" (click)="onDrawerClose()"></app-form-button>
          <app-form-button
            [label]="selectedRole() ? 'Actualizar Rol' : 'Guardar Rol'"
            loadingLabel="Guardando..." icon="lucideSave"
            [loading]="!!(roleFormRef?.isSubmitting())"
            [disabled]="(roleFormRef?.roleForm?.invalid === true) || (roleFormRef?.selectedPermissions?.()?.size === 0)"
            (click)="roleFormRef?.onSubmit()"
          ></app-form-button>
        </div>
      </app-drawer>

      <!-- Drawer: Detail -->
      <app-drawer
        [isOpen]="isDetailOpen()"
        title="Detalle de Rol"
        (close)="isDetailOpen.set(false)"
        size="lg"
      >
        <div drawerBody>
          @if (isDetailOpen() && selectedRole()) {
            <app-role-detail [role]="selectedRole()!"></app-role-detail>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Historial" icon="lucideHistory" variant="ghost" type="button"
            [fullWidth]="false" (click)="onShowHistory(selectedRole()!)"></app-form-button>
          <app-form-button label="Editar Rol" icon="lucidePencil" variant="secondary" type="button"
            [fullWidth]="false" (click)="handleActionClick({id: 'edit', label: '', icon: ''}, selectedRole()!)"></app-form-button>
        </div>
      </app-drawer>

      <!-- Drawer: History -->
      <app-drawer
        [isOpen]="isHistoryOpen()"
        [title]="selectedRole() ? 'Historial: ' + selectedRole()?.name : 'Historial'"
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
            @if (mappedLogs().length === 0) {
              <div class="empty-logs">No hay registros de actividad para este rol.</div>
            }
          }
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
          <app-role-advanced-filters
            #advancedFilters
            [filterTree]="filterTree"
            [availableFields]="availableFields"
            (applied)="onFilterTreeChange($event); isFiltersOpen.set(false)"
          ></app-role-advanced-filters>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary"
            (click)="isFiltersOpen.set(false)"></app-form-button>
          <app-form-button label="Aplicar filtros" variant="primary"
            (click)="advancedFilters.applyFilters()"></app-form-button>
        </div>
      </app-drawer>

      <!-- Modal: Unsaved changes -->
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

      <!-- Modal: Delete -->
      <app-modal
        [isOpen]="isDeleteModalOpen()"
        title="Confirmar Eliminación"
        size="sm"
        [allowClose]="!isDeleting()"
        (close)="cancelDelete()"
      >
        <div modalBody>
          ¿Eliminar el rol <strong>"{{ roleToDelete()?.name }}"</strong>?
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
      <button class="mobile-fab__btn" (click)="onOpenCreateForm()">
        <ng-icon name="lucidePlus" size="18"></ng-icon>
        <span>Nuevo Rol</span>
      </button>
    </div>
    </div>
  `,
  styleUrl: './roles-list.component.scss'
})
export class RolesListComponent {
  private rolesService = inject(RolesService);
  private toastService = inject(ToastService);

  @ViewChild('roleFormRef') roleFormRef?: RoleFormComponent;
  @ViewChild('advancedFilters') advancedFiltersRef!: RoleAdvancedFilters;

  roleActions: ActionItem[] = [
    { id: 'view', label: 'Ver Detalle', icon: 'lucideShield' },
    { id: 'history', label: 'Historial', icon: 'lucideHistory' },
    { id: 'edit', label: 'Editar Rol', icon: 'lucidePencil' },
    { id: 'delete', label: 'Eliminar', icon: 'lucideTrash2', variant: 'danger' },
  ];

  // ── State ────────────────────────────────────────────────────────────────────
  searchQuery        = signal('');
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile           = signal(false);
  viewMode           = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());
  sortField          = signal('name');
  sortOrder          = signal<'ASC' | 'DESC'>('ASC');
  refreshTrigger     = signal(0);
  isLoading          = signal(true);
  currentPage        = signal(1);
  pageSize           = signal(12);

  isFormOpen         = signal(false);
  isDetailOpen       = signal(false);
  isFiltersOpen      = signal(false);
  isConfirmCloseOpen = signal(false);
  isHistoryOpen      = signal(false);
  isHistoryLoading   = signal(false);
  isDeleteModalOpen  = signal(false);
  isDeleting         = signal(false);
  selectedRole       = signal<Role | undefined>(undefined);
  roleToDelete       = signal<Role | undefined>(undefined);
  roleLogs           = signal<any[]>([]);

  // ── Config ───────────────────────────────────────────────────────────────────
  roleTabs = [
    { label: 'Todas', value: 'Todas' },
    { label: 'Activos', value: 'Activos' },
    { label: 'Inactivos', value: 'Inactivos' },
  ];
  activeTab = signal('Todas');

  roleSortOptions = [
    { label: 'Nombre A-Z', value: 'name:asc' },
    { label: 'Nombre Z-A', value: 'name:desc' },
  ];

  availableFields: FilterField[] = [
    { id: 'name', label: 'Nombre', type: 'text' },
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
    this.roleLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: this.getLogActionLabel(log.action),
      user: log.actorUserName || 'Sistema',
      icon: this.getLogIcon(log.action),
      changes: log.action === 'UPDATE' ? this.getChangedFields(log.details) : undefined,
      message: log.action === 'CREATE' ? 'Creación inicial del rol.' :
        log.action === 'SYNC' ? 'Sincronización de permisos realizada.' : undefined,
    }))
  );

  // ── Reactive data ────────────────────────────────────────────────────────────
  private readonly rolesResponse = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      sortField: this.sortField(),
      sortOrder: this.sortOrder(),
      filterModel: QueryMapper.toAgGridFilterModel(this.filterTree()),
      tab: this.activeTab(),
      refresh: this.refreshTrigger(),
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap((params: any) => this.rolesService.getAll(params).pipe(
        tap(() => this.isLoading.set(false))
      ))
    )
  );

  roles = computed(() => (this.rolesResponse() as any)?.data || []);
  totalItems = computed(() => (this.rolesResponse() as any)?.meta?.itemCount || (this.rolesResponse() as any)?.total || 0);

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mq.matches);
      mq.addEventListener('change', e => this.isMobile.set(e.matches));
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  onTabChange(tab: string) { this.activeTab.set(tab); this.resetPagination(); }
  onSearchChange(q: string) { this.searchQuery.set(q); this.resetPagination(); }
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
  onOpenCreateForm() {
    this.selectedRole.set(undefined);
    this.isFormOpen.set(true);
  }

  onFormSaved() {
    this.isFormOpen.set(false);
    this.refreshTrigger.update(v => v + 1);
  }

  onDrawerClose() {
    if (this.roleFormRef?.hasUnsavedChanges()) {
      this.isConfirmCloseOpen.set(true);
    } else {
      this.isFormOpen.set(false);
      this.selectedRole.set(undefined);
      this.roleFormRef?.resetForm();
    }
  }

  forceCloseDrawer() {
    this.isConfirmCloseOpen.set(false);
    this.isFormOpen.set(false);
    this.selectedRole.set(undefined);
    this.roleFormRef?.resetForm();
  }

  // ── Detail & History ──────────────────────────────────────────────────────────
  onShowDetail(role: Role) {
    this.selectedRole.set(role);
    this.isDetailOpen.set(true);
  }

  handleActionClick(action: ActionItem, role: Role) {
    if (action.id === 'view') {
      this.onShowDetail(role);
    } else if (action.id === 'history') {
      this.onShowHistory(role);
    } else if (action.id === 'edit') {
      if (role.name === 'SUPER_ADMIN') {
        this.toastService.error('El rol SUPER_ADMIN no puede ser editado.');
        return;
      }
      this.isDetailOpen.set(false);
      this.selectedRole.set(role);
      this.isFormOpen.set(true);
    } else if (action.id === 'delete') {
      if (role.name === 'SUPER_ADMIN') {
        this.toastService.error('No puedes eliminar el rol de super administrador.');
        return;
      }
      this.roleToDelete.set(role);
      this.isDeleteModalOpen.set(true);
    }
  }

  onShowHistory(role: Role) {
    this.selectedRole.set(role);
    this.isDetailOpen.set(false);
    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);
    this.rolesService.getLogs(role.id).pipe(
      finalize(() => this.isHistoryLoading.set(false))
    ).subscribe({
      next: logs => this.roleLogs.set(logs),
      error: () => this.toastService.error('Error al cargar el historial'),
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  cancelDelete() {
    if (this.isDeleting()) return;
    this.isDeleteModalOpen.set(false);
    this.roleToDelete.set(undefined);
  }

  confirmDelete() {
    const role = this.roleToDelete();
    if (!role || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.rolesService.delete(role.id).subscribe({
      next: () => {
        this.toastService.success('Rol eliminado correctamente');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleting.set(false);
        this.cancelDelete();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Error al eliminar el rol');
        this.isDeleting.set(false);
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  private resetPagination() { this.currentPage.set(1); }

  private getLogActionLabel(action: string): string {
    const labels: Record<string, string> = {
      CREATE: 'Creación', UPDATE: 'Actualización', DELETE: 'Eliminación', SYNC: 'Sincronización',
    };
    return labels[action] || action;
  }

  private getLogIcon(action: string): string {
    const icons: Record<string, string> = {
      CREATE: 'lucidePlus', UPDATE: 'lucideRefreshCw', DELETE: 'lucideTrash', SYNC: 'lucideShield',
    };
    return icons[action] || 'lucideHistory';
  }

  private getChangedFields(details: any): any[] {
    if (!details) return [];
    const fields: any[] = [];
    if (details.oldName && details.newName)
      fields.push({ label: 'Nombre', oldValue: details.oldName, newValue: details.newName });
    if (details.permissionsUpdated)
      fields.push({ label: 'Permisos', oldValue: 'Anteriores', newValue: 'Actualizados' });
    return fields;
  }
}
