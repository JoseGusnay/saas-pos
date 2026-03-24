import { Component, signal, inject, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';
import { provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucidePencil, lucideTrash2, lucideDownload,
  lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash,
  lucideMail, lucideShield, lucideMapPin, lucideCloudDownload,
  lucideSave,
} from '@ng-icons/lucide';

import { UsersService, TenantUser } from '../../services/users.service';
import { ToastService } from '../../../../core/services/toast.service';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent, DataCardDetail } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { BadgeComponent } from '../../../../core/layout/atoms/badge/badge.component';
import { ActionItem, ActionsMenuComponent } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { DatelineComponent, DatelineItem, DatelineChange } from '../../../../shared/components/ui/dateline/dateline.component';

import { UserFormComponent } from '../../components/user-form/user-form.component';
import { UserDetailComponent } from '../../components/user-detail/user-detail.component';
import { UserImportModalComponent } from '../../components/user-import-modal/user-import-modal';
import { UserAdvancedFilters } from './components/user-advanced-filters/user-advanced-filters';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DataCardComponent, SkeletonComponent, EmptyStateComponent,
    BadgeComponent, DrawerComponent, ModalComponent,
    UserFormComponent, UserDetailComponent, UserImportModalComponent,
    SpinnerComponent, ActionsMenuComponent, DatelineComponent,
    FormButtonComponent, UserAdvancedFilters,
  ],
  providers: [
    provideIcons({
      lucidePlus, lucidePencil, lucideTrash2, lucideDownload,
      lucideHistory, lucidePlusCircle, lucideRefreshCw, lucideTrash,
      lucideMail, lucideShield, lucideMapPin, lucideCloudDownload,
      lucideSave,
    })
  ],
  template: `
    <div class="users-page">
      <app-page-header
        title="Gestión de Usuarios"
        [tabs]="userTabs"
        [activeTab]="activeTab()"
        ctaText="Nuevo Usuario"
        ctaIcon="lucidePlus"
        secondaryCtaText="Importar"
        secondaryCtaIcon="lucideDownload"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onOpenCreateForm()"
        (secondaryCtaClick)="importModal.open()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar usuarios..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="activeFiltersCount()"
        [viewMode]="viewModePreference()"
        [sortOptions]="userSortOptions"
        (openFilters)="openAdvancedFilters()"
        (clearFilters)="clearAllFilters()"
        (searchChange)="onSearchChange($event)"
        (viewModeChange)="viewModePreference.set($event)"
        (sortChange)="onSortChange($event)"
      ></app-list-toolbar>

      <div [class]="viewMode() === 'grid' ? 'users-grid' : 'users-list-layout'">
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
                  <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <app-skeleton width="60px" height="20px" radius="4px"></app-skeleton>
                    <app-skeleton width="80px" height="20px" radius="4px"></app-skeleton>
                  </div>
                </div>
                <footer class="data-card__footer" style="justify-content: space-between;">
                  <app-skeleton width="100px" height="12px"></app-skeleton>
                  <app-skeleton width="24px" height="24px" shape="circle"></app-skeleton>
                </footer>
              </div>
            } @else {
              <div class="user-row-item skeleton-row">
                <div class="row-main">
                  <app-skeleton width="48px" height="48px" shape="circle"></app-skeleton>
                  <div class="user-info">
                    <app-skeleton width="140px" height="1rem"></app-skeleton>
                    <app-skeleton width="180px" height="0.875rem" style="margin-top: 6px"></app-skeleton>
                  </div>
                </div>
                <div class="row-roles" style="display: flex; gap: 8px;">
                  <app-skeleton width="70px" height="24px" radius="99px"></app-skeleton>
                  <app-skeleton width="60px" height="24px" radius="99px"></app-skeleton>
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
        } @else if (users().length > 0) {
          @for (user of users(); track user.id) {
            @if (viewMode() === 'grid') {
              <app-data-card
                class="cursor-pointer"
                (click)="onShowDetail(user)"
                [title]="user.fullName"
                [status]="user.isActive ? 'Activo' : 'Inactivo'"
                [statusConfig]="user.isActive ? 'active' : 'inactive'"
                [details]="getUserDetails(user)"
                [actions]="userActions"
                [avatars]="getUserAvatars(user)"
                (actionClick)="handleActionClick($event, user)"
              >
                <div card-content class="user-card-body">
                  <div class="roles-tags">
                    @for (role of user.roles; track role.id) {
                      <app-badge [text]="role.name" variant="primary"></app-badge>
                    }
                  </div>
                </div>
                <div card-footer class="user-card-footer">
                  <div class="last-login">
                    ID: {{ user.id.substring(0,8) }}...
                  </div>
                </div>
              </app-data-card>
            } @else {
              <div class="user-row-item shadow-sm" (click)="onShowDetail(user)">
                <div class="row-main">
                  <div class="user-avatar">
                    <div class="avatar-box">
                      {{ (user.firstName ? user.firstName[0] : user.email[0]).toUpperCase() }}
                    </div>
                  </div>
                  <div class="user-info">
                    <span class="user-name">{{ user.fullName }}</span>
                    <span class="user-email">{{ user.email }}</span>
                  </div>
                </div>
                <div class="row-roles">
                  @for (role of user.roles; track role.id) {
                    <app-badge [text]="role.name" variant="default"></app-badge>
                  }
                </div>
                <div class="row-status">
                  <app-badge
                    [text]="user.isActive ? 'Activo' : 'Inactivo'"
                    [variant]="user.isActive ? 'success' : 'danger'"
                  ></app-badge>
                </div>
                <div class="row-actions" (click)="$event.stopPropagation()">
                  <app-actions-menu
                    [actions]="userActions"
                    (actionClick)="handleActionClick($event, user)"
                  ></app-actions-menu>
                </div>
              </div>
            }
          }
        } @else {
          <div class="users-page__empty">
            <app-empty-state
              [icon]="activeFiltersCount() > 0 || searchQuery() ? 'lucideSearch' : 'lucideUsers'"
              [title]="activeFiltersCount() > 0 || searchQuery() ? 'No encontramos usuarios' : 'No hay usuarios registrados'"
              [description]="activeFiltersCount() > 0 || searchQuery() ? 'Intenta con otros términos o ajusta tus filtros.' : 'Comienza añadiendo miembros a tu equipo.'"
              [actionLabel]="activeFiltersCount() > 0 || searchQuery() ? 'Limpiar Filtros' : 'Nuevo Usuario'"
              (action)="activeFiltersCount() > 0 || searchQuery() ? clearAllFilters() : onOpenCreateForm()"
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

      <!-- Drawer: Form -->
      <app-drawer
        [isOpen]="isFormOpen()"
        [title]="selectedUser() ? 'Editar Usuario' : 'Nuevo Usuario'"
        [allowClose]="!(userFormRef?.isSubmitting?.())"
        (close)="onDrawerClose()"
        size="md"
      >
        <div drawerBody>
          @if (isFormOpen()) {
            <app-user-form
              #userForm
              [user]="selectedUser()"
              (saved)="onUserSaved($event)"
              (cancel)="onDrawerClose()"
            ></app-user-form>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" type="button"
            [disabled]="!!(userFormRef?.isSubmitting?.())" (click)="onDrawerClose()"></app-form-button>
          <app-form-button
            [label]="selectedUser() ? 'Actualizar Usuario' : 'Guardar Usuario'"
            loadingLabel="Guardando..." icon="lucideSave"
            [loading]="!!(userFormRef?.isSubmitting?.())"
            [disabled]="userFormRef?.userForm?.invalid ?? false"
            (click)="userFormRef?.onSubmit()"
          ></app-form-button>
        </div>
      </app-drawer>

      <!-- Drawer: Detail -->
      <app-drawer
        [isOpen]="isDetailOpen()"
        title="Detalle de Usuario"
        (close)="isDetailOpen.set(false)"
        size="lg"
      >
        <div drawerBody>
          @if (isDetailOpen() && selectedUser()) {
            <app-user-detail [user]="selectedUser()!"></app-user-detail>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Historial" icon="lucideHistory" variant="ghost" type="button"
            [fullWidth]="false" (click)="onShowHistory(selectedUser()!.id)"></app-form-button>
          <app-form-button label="Editar Usuario" icon="lucidePencil" variant="secondary" type="button"
            [fullWidth]="false" (click)="onEditUser(selectedUser()!)"></app-form-button>
        </div>
      </app-drawer>

      <!-- Drawer: Historial -->
      <app-drawer
        [isOpen]="isHistoryOpen()"
        [title]="selectedUser() ? 'Historial: ' + selectedUser()?.fullName : 'Historial de Cambios'"
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
              <div class="empty-logs">No hay registros de actividad para este usuario.</div>
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
          <app-user-advanced-filters
            #advancedFilters
            [filterTree]="filterTree"
            [availableFields]="availableFields"
            (applied)="onFilterTreeChange($event); isFiltersOpen.set(false)"
          ></app-user-advanced-filters>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary"
            (click)="isFiltersOpen.set(false)"></app-form-button>
          <app-form-button label="Aplicar filtros" variant="primary"
            (click)="advancedFilters.applyFilters()"></app-form-button>
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
          ¿Eliminar al usuario <strong>"{{ userToDelete()?.fullName || userToDelete()?.email }}"</strong>?
          Esta acción no se puede deshacer.
        </div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="ghost" type="button" [fullWidth]="false"
            [disabled]="isDeleting()" (click)="cancelDelete()"></app-form-button>
          <app-form-button label="Eliminar" loadingLabel="Eliminando..." variant="danger" type="button"
            [fullWidth]="false" [loading]="isDeleting()" (click)="confirmDelete()"></app-form-button>
        </div>
      </app-modal>

      <app-user-import-modal
        #importModal
        (imported)="onImportCompleted()"
      ></app-user-import-modal>
    </div>
  `,
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent {
  private usersService = inject(UsersService);
  private toastService = inject(ToastService);

  @ViewChild('userForm') userFormRef?: UserFormComponent;
  @ViewChild('advancedFilters') advancedFiltersRef!: UserAdvancedFilters;
  @ViewChild('importModal') importModal!: UserImportModalComponent;

  userActions: ActionItem[] = [
    { id: 'edit', label: 'Editar Usuario', icon: 'lucidePencil' },
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

  isFormOpen         = signal(false);
  isDetailOpen       = signal(false);
  isFiltersOpen      = signal(false);
  isConfirmCloseOpen = signal(false);
  isHistoryOpen      = signal(false);
  isHistoryLoading   = signal(false);
  isDeleteModalOpen  = signal(false);
  isDeleting         = signal(false);
  selectedUser       = signal<TenantUser | undefined>(undefined);
  userToDelete       = signal<TenantUser | null>(null);
  userLogs           = signal<any[]>([]);

  // ── Config ───────────────────────────────────────────────────────────────────
  userTabs = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Activos', value: 'Activos' },
    { label: 'Inactivos', value: 'Inactivos' },
  ];
  activeTab = signal('Todos');

  userSortOptions = [
    { label: 'Más Recientes', value: 'createdAt:desc' },
    { label: 'Más Antiguos', value: 'createdAt:asc' },
    { label: 'Nombre (A-Z)', value: 'firstName:asc' },
    { label: 'Nombre (Z-A)', value: 'firstName:desc' },
    { label: 'Email', value: 'email:asc' },
  ];

  availableFields: FilterField[] = [
    { id: 'email', label: 'Email', type: 'text' },
    { id: 'firstName', label: 'Nombre', type: 'text' },
    { id: 'lastName', label: 'Apellido', type: 'text' },
    { id: 'isActive', label: 'Estado', type: 'status' },
  ];

  filterTree = signal<FilterGroup>({
    type: 'group', id: 'root', logicalOperator: 'AND', children: []
  });

  activeFiltersCount = computed(() => {
    const count = (node: FilterNode): number => {
      if (node.type === 'group') return node.children.reduce((a, c) => a + count(c), 0);
      const rule = node as FilterRule;
      return rule.value && String(rule.value).trim() !== '' ? 1 : 0;
    };
    return count(this.filterTree());
  });

  mappedLogs = computed<DatelineItem[]>(() =>
    this.userLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: this.getLogActionLabel(log.action),
      user: log.actorUserName || 'Sistema',
      icon: this.getLogIcon(log.action),
      changes: log.action === 'UPDATE' ? this.getChangedFields(log.details) : undefined,
      message: log.action === 'IMPORT' ? 'Importación masiva de usuarios.' :
        log.action === 'CREATE' ? 'Creación inicial del perfil.' :
        log.action === 'PASSWORD_CHANGE' ? 'Cambio de contraseña realizado.' : undefined,
    }))
  );

  // ── Reactive data ────────────────────────────────────────────────────────────
  private readonly usersResponse = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      filterModel: QueryMapper.toAgGridFilterModel(this.filterTree()),
      tab: this.activeTab(),
      sortField: this.sortField(),
      sortOrder: this.sortOrder(),
      refresh: this.refreshTrigger(),
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        const { tab, ...filters } = params;
        if (tab === 'Activos') filters.filterModel['isActive'] = { filterType: 'text', type: 'equals', filter: 'true' };
        else if (tab === 'Inactivos') filters.filterModel['isActive'] = { filterType: 'text', type: 'equals', filter: 'false' };
        return this.usersService.getAll(filters).pipe(tap(() => this.isLoading.set(false)));
      })
    )
  );

  users = computed(() => this.usersResponse()?.data || []);
  totalItems = computed(() => this.usersResponse()?.total || 0);

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mq.matches);
      mq.addEventListener('change', e => this.isMobile.set(e.matches));
    }
  }

  getUserDetails(user: TenantUser): DataCardDetail[] {
    return [
      { icon: 'lucideMail', text: user.email },
      { icon: 'lucideMapPin', text: `${user.branches?.length || 0} sucursales` },
    ];
  }

  getUserAvatars(user: TenantUser) {
    return [
      { url: `https://ui-avatars.com/api/?name=${user.fullName}&background=random`, name: user.fullName }
    ];
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
    this.selectedUser.set(undefined);
    this.isFormOpen.set(true);
  }

  onEditUser(user: TenantUser) {
    this.isDetailOpen.set(false);
    this.selectedUser.set(user);
    this.isFormOpen.set(true);
  }

  onUserSaved(user: TenantUser) {
    const wasEditing = !!this.selectedUser();
    this.isFormOpen.set(false);
    this.userFormRef?.resetForm();
    this.refreshTrigger.update(v => v + 1);
    this.toastService.success(
      wasEditing
        ? `Usuario "${user.fullName || user.email}" actualizado correctamente`
        : `Usuario "${user.fullName || user.email}" creado correctamente`
    );
  }

  onDrawerClose() {
    if (this.userFormRef?.hasUnsavedChanges()) {
      this.isConfirmCloseOpen.set(true);
    } else {
      this.isFormOpen.set(false);
      this.userFormRef?.resetForm();
    }
  }

  forceCloseDrawer() {
    this.isConfirmCloseOpen.set(false);
    this.isFormOpen.set(false);
    this.userFormRef?.resetForm();
  }

  // ── Detail & History ──────────────────────────────────────────────────────────
  onShowDetail(user: TenantUser) {
    this.selectedUser.set(user);
    this.isDetailOpen.set(true);
  }

  handleActionClick(action: ActionItem, user: TenantUser) {
    if (action.id === 'edit') this.onEditUser(user);
    else if (action.id === 'history') this.onShowHistory(user.id);
    else if (action.id === 'delete') {
      this.userToDelete.set(user);
      this.isDeleteModalOpen.set(true);
    }
  }

  onShowHistory(userId: string) {
    const user = this.users().find((u: TenantUser) => u.id === userId);
    if (user) this.selectedUser.set(user);
    this.isDetailOpen.set(false);
    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);

    this.usersService.getLogs(userId).subscribe({
      next: logs => {
        this.userLogs.set(logs);
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
    this.userToDelete.set(null);
  }

  confirmDelete() {
    const u = this.userToDelete();
    if (!u || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.usersService.delete(u.id).subscribe({
      next: () => {
        this.toastService.success('Usuario eliminado correctamente');
        this.refreshTrigger.update(v => v + 1);
        this.isDeleting.set(false);
        this.cancelDelete();
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? 'No se pudo eliminar el usuario');
        this.isDeleting.set(false);
      },
    });
  }

  // ── Import ────────────────────────────────────────────────────────────────────
  onImportCompleted() {
    this.refreshTrigger.update(v => v + 1);
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
      case 'PASSWORD_CHANGE': return 'Seguridad';
      default: return action;
    }
  }

  private getChangedFields(details: any): DatelineChange[] {
    if (!details) return [];
    const changes: DatelineChange[] = [];
    if (details.oldEmail && details.newEmail)
      changes.push({ label: 'Email', oldValue: details.oldEmail, newValue: details.newEmail });
    if (details.rolesUpdated)
      changes.push({ label: 'Roles', oldValue: 'Anteriores', newValue: 'Actualizados' });
    if (details.branchesUpdated)
      changes.push({ label: 'Sucursales', oldValue: 'Anteriores', newValue: 'Actualizadas' });
    if (details.oldStatus !== undefined && details.newStatus !== undefined)
      changes.push({ label: 'Estado', oldValue: details.oldStatus ? 'Activo' : 'Inactivo', newValue: details.newStatus ? 'Activo' : 'Inactivo' });
    if (details.passwordChanged)
      changes.push({ label: 'Contraseña', oldValue: '********', newValue: 'Actualizada' });
    return changes;
  }
}
