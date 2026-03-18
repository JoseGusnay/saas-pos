import { Component, OnInit, signal, inject, computed, ViewChild } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap, finalize } from 'rxjs';

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUsers, lucidePlus, lucideMoreVertical, lucideMail,
  lucideShield, lucideMapPin, lucideUserCheck, lucideUserX,
  lucideHistory, lucideTrash2, lucideEdit, lucideSearch,
  lucideUpload, lucideDownload, lucidePlusCircle,
  lucideRefreshCw, lucideTrash, lucideCloudDownload,
  lucidePencil
} from '@ng-icons/lucide';

import { UsersService, TenantUser } from '../../services/users.service';
import { ModalService } from '../../../../core/components/modal/modal.service';
import { ToastService } from '../../../../core/services/toast.service';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DataCardComponent, DataCardDetail } from '../../../../shared/components/list-ui/data-card/data-card.component';
import { BadgeComponent } from '../../../../core/layout/atoms/badge/badge.component';
import { ActionItem } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { ActionsMenuComponent } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';


import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';

import { UserFormComponent } from '../../components/user-form/user-form.component';
import { UserDetailComponent } from '../../components/user-detail/user-detail.component';
import { DatelineComponent, DatelineItem, DatelineChange } from '../../../../shared/components/ui/dateline/dateline.component';
import { UserImportWizardComponent } from '../../components/user-import-wizard/user-import-wizard.component';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { UserAdvancedFilters } from './components/user-advanced-filters/user-advanced-filters';
import { SelectOption } from '../../../../shared/components/ui/custom-select/custom-select.component';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';

@Component({
  selector: 'app-users-list',
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

    BadgeComponent,
    DrawerComponent,
    ModalComponent,
    UserFormComponent,
    UserDetailComponent,
    UserImportWizardComponent,
    SpinnerComponent,
    ActionsMenuComponent,
    DatelineComponent,
    FormButtonComponent,
    NgIconComponent
  ],

  providers: [
    provideIcons({
      lucideUsers, lucidePlus, lucideMoreVertical, lucideMail,
      lucideShield, lucideMapPin, lucideUserCheck, lucideUserX,
      lucideHistory, lucideTrash2, lucideEdit, lucideSearch,
      lucideUpload, lucideDownload, lucidePlusCircle,
      lucideRefreshCw, lucideTrash, lucideCloudDownload,
      lucidePencil
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
        (secondaryCtaClick)="onOpenImport()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar usuarios..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="activeFiltersCount()"
        [viewMode]="viewModePreference()"
        [sortOptions]="userSortOptions"
        [selectedSort]="sortField() + ':' + sortOrder().toLowerCase()"
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
              <!-- User Grid Skeleton -->              <div class="data-card skeleton-card">
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
              <!-- User List Skeleton -->
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
                <!-- Card Body -->
                <div card-content class="user-card-body">
                  <div class="roles-tags">
                    @for (role of user.roles; track role.id) {
                      <app-badge [text]="role.name" variant="primary"></app-badge>
                    }
                  </div>
                </div>

                <!-- Card Footer (Specific for Grid) -->
                <div card-footer class="user-card-footer">
                   <div class="last-login">
                     ID: {{ user.id.substring(0,8) }}...
                   </div>
                </div>
              </app-data-card>
            } @else {
              <!-- List Row View Mode -->
              <div class="user-row-item shadow-sm" (click)="onShowDetail(user)">
                 <div class="row-main">
                    <div class="user-avatar" [style.background]="'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'">
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

      <!-- Form Drawer -->
      <app-drawer
        [isOpen]="isFormOpen()"
        [title]="selectedUser() ? 'Editar Usuario' : 'Nuevo Usuario'"
        [allowClose]="!(userFormRef?.isSubmitting?.())"
        (close)="onDrawerClose()"
        size="md"
      >
        <app-user-form
          #userForm
          drawerBody
          *ngIf="isFormOpen()"
          [user]="selectedUser()"
          (saved)="onUserSaved($event)"
          (cancel)="onDrawerClose()"
        ></app-user-form>

        <div drawerFooter class="drawer-footer-actions">
          <app-form-button
            label="Cancelar"
            variant="secondary"
            [disabled]="!!(userFormRef?.isSubmitting?.())"
            (click)="onDrawerClose()"
          ></app-form-button>
          <app-form-button
            [label]="selectedUser() ? 'Actualizar Usuario' : 'Guardar Usuario'"
            loadingLabel="Guardando..."
            icon="lucideSave"
            [loading]="!!(userFormRef?.isSubmitting?.())"
            [disabled]="userFormRef?.userForm?.invalid ?? false"
            (click)="userFormRef?.onSubmit()"
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
          <button type="button" class="btn btn-ghost" (click)="onCancelExit()">
            Continuar Editando
          </button>
          <button type="button" class="btn btn-danger" (click)="onConfirmExit()">
            Salir sin Guardar
          </button>
        </div>
      </app-modal>

      <!-- Detail Drawer -->
      <app-drawer
        [isOpen]="isDetailOpen()"
        [title]="'Detalle de Usuario'"
        (close)="onCloseDetail()"
        size="lg"
      >
        <app-user-detail
          drawerBody
          *ngIf="isDetailOpen() && selectedUser()"
          [user]="selectedUser()!"
        ></app-user-detail>

        <div drawerFooter class="drawer-footer-actions">
           <button class="btn btn-secondary" (click)="onShowHistory(selectedUser()!.id)">
              <ng-icon name="lucideHistory"></ng-icon>
              Ver Historial
            </button>
            <button class="btn btn-primary" (click)="onEditUser(selectedUser()!)">
              <ng-icon name="lucidePencil"></ng-icon>
              Editar Usuario
            </button>
        </div>
      </app-drawer>

      <!-- Import Modal -->
      <app-modal
        [isOpen]="isImportModalOpen()"
        [title]="'Importación Masiva de Usuarios'"
        (close)="onCloseImport()"
      >
        <div modalBody>
          <app-user-import-wizard
            #importWizard
            (imported)="onImportCompleted()"
            (closed)="onCloseImport()"
          ></app-user-import-wizard>
        </div>
      </app-modal>

      <!-- Drawer de Historial -->
      <app-drawer 
        [isOpen]="isHistoryOpen()" 
        [title]="selectedUser() ? 'Historial: ' + selectedUser()?.fullName : 'Historial de Cambios'"
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
              <div class="empty-logs">No hay registros de actividad para este usuario.</div>
            }
          }
        </div>
      </app-drawer>



    </div>
  `,
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit {
  private usersService = inject(UsersService);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);

  @ViewChild('userForm') userFormRef?: UserFormComponent;
  @ViewChild('importWizard') importWizardRef?: UserImportWizardComponent;


  // State Signals
  searchQuery = signal('');
  activeTab = signal<'Todos' | 'Activos' | 'Inactivos'>('Todos');
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile = signal<boolean>(false);
  viewMode = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());

  isFormOpen = signal(false);
  isDetailOpen = signal(false);
  isImportModalOpen = signal(false);
  isHistoryOpen = signal(false);
  isHistoryLoading = signal(false);


  isConfirmationModalOpen = signal(false);
  selectedUser = signal<TenantUser | undefined>(undefined);
  userLogs = signal<any[]>([]);


  // Sorting & Pagination
  sortField = signal('createdAt');
  sortOrder = signal<'ASC' | 'DESC'>('DESC');
  currentPage = signal(1);
  pageSize = signal(12);
  refreshTrigger = signal(0);
  isLoading = signal(true);

  mappedLogs = computed<DatelineItem[]>(() => {
    return this.userLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: this.getLogActionLabel(log.action),
      user: log.actorUserName || 'Sistema',
      icon: this.getLogIcon(log.action),
      changes: log.action === 'UPDATE' ? this.getChangedFields(log.details) : undefined,
      message: log.action === 'IMPORT' ? `Importación masiva de usuarios.` :
        log.action === 'CREATE' ? 'Creación inicial del perfil.' :
          log.action === 'PASSWORD_CHANGE' ? 'Cambio de contraseña realizado.' : undefined
    }));
  });


  // Advanced Filters State
  availableFields: FilterField[] = [
    { id: 'email', label: 'Email', type: 'text' },
    { id: 'firstName', label: 'Nombre', type: 'text' },
    { id: 'lastName', label: 'Apellido', type: 'text' },
    { id: 'isActive', label: 'Estado', type: 'status' },
    { id: 'createdAt', label: 'Fecha Registro', type: 'text' }
  ];

  filterTree = signal<FilterGroup>({
    type: 'group',
    id: 'root',
    logicalOperator: 'AND',
    children: []
  });

  // Reactive Data Fetching
  private readonly usersResponse = toSignal(
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
        if (tab === 'Activos') {
          filters.filterModel['isActive'] = { filterType: 'text', type: 'equals', filter: 'true' };
        } else if (tab === 'Inactivos') {
          filters.filterModel['isActive'] = { filterType: 'text', type: 'equals', filter: 'false' };
        }
        return this.usersService.getAll(filters).pipe(
          tap(() => this.isLoading.set(false))
        );
      })
    )
  );

  users = computed(() => this.usersResponse()?.data || []);
  totalItems = computed(() => this.usersResponse()?.total || 0);

  userSortOptions: SelectOption[] = [
    { label: 'Más Recientes', value: 'createdAt:desc' },
    { label: 'Más Antiguos', value: 'createdAt:asc' },
    { label: 'Nombre (A-Z)', value: 'firstName:asc' },
    { label: 'Nombre (Z-A)', value: 'firstName:desc' },
    { label: 'Email', value: 'email:asc' },
  ];

  userTabs = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Activos', value: 'Activos' },
    { label: 'Inactivos', value: 'Inactivos' },
  ];

  userActions: ActionItem[] = [
    { id: 'edit', label: 'Editar Usuario', icon: 'lucidePencil' },
    { id: 'perms', label: 'Gestionar Permisos', icon: 'lucideShield' },
    { id: 'history', label: 'Historial / Auditoría', icon: 'lucideHistory' },
    { id: 'delete', label: 'Eliminar', icon: 'lucideTrash2', variant: 'danger' }
  ];

  constructor() {
    if (typeof window !== 'undefined') {
      const mobileQuery = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mobileQuery.matches);
      mobileQuery.addEventListener('change', (e) => this.isMobile.set(e.matches));
    }
  }

  ngOnInit() {
    // Initialization handled by signals
  }

  getUserDetails(user: TenantUser): DataCardDetail[] {
    return [
      { icon: 'lucideMail', text: user.email },
      { icon: 'lucideMapPin', text: `${user.branches?.length || 0} sucursales` }
    ];
  }

  getUserAvatars(user: TenantUser) {
    return [
      { url: `https://ui-avatars.com/api/?name=${user.fullName}&background=random`, name: user.fullName }
    ];
  }

  onTabChange(tab: string) {
    this.activeTab.set(tab as any);
    this.currentPage.set(1);
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onSortChange(event: { field: string, order: string }) {
    this.sortField.set(event.field);
    this.sortOrder.set(event.order.toUpperCase() as 'ASC' | 'DESC');
    this.currentPage.set(1);
  }

  onOpenCreateForm() {
    this.selectedUser.set(undefined);
    this.isFormOpen.set(true);
  }

  onEditUser(user: TenantUser) {
    this.onCloseDetail();
    this.selectedUser.set(user);
    this.isFormOpen.set(true);
  }

  onCloseForm() {
    this.isFormOpen.set(false);
    this.userFormRef?.resetForm();
  }

  onDrawerClose() {
    if (this.userFormRef?.hasUnsavedChanges()) {
      this.isConfirmationModalOpen.set(true);
    } else {
      this.onCloseForm();
    }
  }

  onConfirmExit() {
    this.isConfirmationModalOpen.set(false);
    this.onCloseForm();
  }

  onCancelExit() {
    this.isConfirmationModalOpen.set(false);
  }

  onShowDetail(user: TenantUser) {
    this.selectedUser.set(user);
    this.isDetailOpen.set(true);
  }

  onCloseDetail() {
    this.isDetailOpen.set(false);
  }

  onShowHistory(userId: string) {
    const user = this.users().find((u: TenantUser) => u.id === userId);
    if (user) {
      this.selectedUser.set(user);
    }
    this.isDetailOpen.set(false);

    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);

    this.usersService.getLogs(userId).subscribe({
      next: (logs) => {
        this.userLogs.set(logs);
        this.isHistoryLoading.set(false);
      },
      error: () => {
        this.toastService.error('No se pudo cargar el historial');
        this.isHistoryLoading.set(false);
        this.isHistoryOpen.set(false);
      }
    });
  }

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

    if (details.oldEmail && details.newEmail) {
      changes.push({ label: 'Email', oldValue: details.oldEmail, newValue: details.newEmail });
    }
    if (details.rolesUpdated) {
      changes.push({ label: 'Roles', oldValue: 'Anteriores', newValue: 'Actualizados' });
    }
    if (details.branchesUpdated) {
      changes.push({ label: 'Sucursales', oldValue: 'Anteriores', newValue: 'Actualizadas' });
    }
    if (details.oldStatus !== undefined && details.newStatus !== undefined) {
      changes.push({
        label: 'Estado',
        oldValue: details.oldStatus ? 'Activo' : 'Inactivo',
        newValue: details.newStatus ? 'Activo' : 'Inactivo'
      });
    }
    if (details.passwordChanged) {
      changes.push({ label: 'Contraseña', oldValue: '********', newValue: 'Actualizada' });
    }

    return changes;
  }


  onOpenImport() {
    this.importWizardRef?.reset();
    this.isImportModalOpen.set(true);
  }



  onCloseImport() {
    this.isImportModalOpen.set(false);
  }


  onImportCompleted() {
    this.isImportModalOpen.set(false);
    this.refreshTrigger.update(n => n + 1);
    this.toastService.success('✅ Importación completada correctamente');
  }



  onUserSaved(user: TenantUser) {
    const wasEditing = !!this.selectedUser();
    this.onCloseForm();
    this.refreshTrigger.update(n => n + 1);
    this.toastService.success(
      wasEditing
        ? `✅ Usuario "${user.fullName || user.email}" actualizado correctamente`
        : `✅ Usuario "${user.fullName || user.email}" creado correctamente`
    );
  }


  handleActionClick(action: ActionItem, user: TenantUser) {
    switch (action.id) {
      case 'edit':
        this.onEditUser(user);
        break;
      case 'delete':
        this.onDeleteUser(user);
        break;
      case 'history':
        this.onShowHistory(user.id);
        break;

    }
  }

  onDeleteUser(user: TenantUser) {
    if (confirm(`¿Estás seguro de eliminar a ${user.email}?`)) {
      this.usersService.delete(user.id).subscribe({
        next: () => {
          this.toastService.success('Usuario eliminado');
          this.refreshTrigger.update(n => n + 1);
        },
        error: () => this.toastService.error('Error al eliminar usuario')
      });
    }
  }

  openAdvancedFilters() {
    this.modalService.open(
      UserAdvancedFilters,
      'Filtros Avanzados de Usuarios',
      {
        filterTree: this.filterTree,
        availableFields: this.availableFields,
        onFilterTreeChange: (newTree: FilterNode) => {
          if (newTree.type === 'group') {
            this.filterTree.set(newTree as FilterGroup);
            this.currentPage.set(1);
          }
        }
      },
      'Los filtros se aplican instantáneamente.',
      [
        {
          label: 'Cerrar',
          variant: 'primary',
          action: () => this.modalService.close()
        }
      ]
    );
  }

  clearAllFilters() {
    this.searchQuery.set('');
    this.filterTree.set({
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: []
    });
    this.currentPage.set(1);
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
}
