import { Component, OnInit, signal, inject, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, tap, switchMap, finalize } from 'rxjs';

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideShield, lucidePlus, lucideRefreshCw, lucideTrash, lucideCloudDownload,
  lucidePencil, lucideSave, lucideX, lucideEdit, lucideTrash2, lucideHistory
} from '@ng-icons/lucide';

import { RolesService, Role } from '../../services/roles.service';
import { ToastService } from '../../../../core/services/toast.service';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';
import { FilterNode, FilterGroup, FilterField, FilterRule } from '../../../../core/models/query-builder.models';

import { ModalService } from '../../../../core/components/modal/modal.service';

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

// Componentes del Módulo
import { RoleAdvancedFilters } from '../../components/role-advanced-filters/role-advanced-filters';
import { RoleFormComponent } from '../../components/role-form/role-form.component';
import { RoleDetailComponent } from '../../components/role-detail/role-detail.component';
import { DatelineComponent, DatelineItem } from '../../../../shared/components/ui/dateline/dateline.component';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIconComponent,
    PageHeaderComponent,
    ListToolbarComponent,
    PaginationComponent,
    DataCardComponent,
    SkeletonComponent,
    EmptyStateComponent,
    BadgeComponent,
    DrawerComponent,
    ModalComponent,
    ActionsMenuComponent,
    RoleFormComponent,
    RoleDetailComponent,
    DatelineComponent,
    SpinnerComponent,
    FormButtonComponent
  ],
  providers: [
    provideIcons({
      lucideShield, lucidePlus, lucideRefreshCw, lucideTrash, lucideCloudDownload,
      lucidePencil, lucideSave, lucideX, lucideEdit, lucideTrash2, lucideHistory
    })
  ],
  templateUrl: './roles-list.component.html',
  styleUrls: ['./roles-list.component.scss']
})
export class RolesListComponent implements OnInit {
  roleFormRef?: RoleFormComponent;
  @ViewChild('roleFormRef') set roleForm(content: RoleFormComponent) {
    if (content) this.roleFormRef = content;
  }

  private rolesService = inject(RolesService);
  private toastService = inject(ToastService);
  private modalService = inject(ModalService);

  // UI State
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile = signal<boolean>(false);
  viewMode = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());
  
  isFormOpen = signal(false);
  isDetailOpen = signal(false);
  isHistoryOpen = signal(false);
  isHistoryLoading = signal(false);
  isConfirmationModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  roleToDelete = signal<Role | undefined>(undefined);
  isDeleting = signal(false);
  selectedRole = signal<Role | undefined>(undefined);
  roleLogs = signal<any[]>([]);

  // Pagination & Search
  searchQuery = signal('');
  currentPage = signal(1);
  pageSize = signal(12);
  refreshTrigger = signal(0);
  isLoading = signal(true);

  roleTabs = [
    { label: 'Todas', value: 'Todas' },
    { label: 'Activos', value: 'Activos' },
    { label: 'Inactivos', value: 'Inactivos' },
  ];
  activeTab = signal('Todas');

  availableFields: FilterField[] = [
    { id: 'name', label: 'Nombre', type: 'text' },
    { id: 'createdAt', label: 'Creación', type: 'text' }
  ];

  filterTree = signal<FilterGroup>({
    type: 'group',
    id: 'root',
    logicalOperator: 'AND',
    children: []
  });

  // Sort State
  sortField = signal('name');
  sortOrder = signal<'ASC' | 'DESC'>('ASC');

  roleSortOptions = [
    { label: 'Nombre A-Z', value: 'name:asc' },
    { label: 'Nombre Z-A', value: 'name:desc' },
  ];

  roleActions: ActionItem[] = [
    { id: 'view', label: 'Ver Detalle', icon: 'lucideShield' },
    { id: 'history', label: 'Ver Historial', icon: 'lucideHistory' },
    { id: 'edit', label: 'Editar Rol', icon: 'lucidePencil' },
    { id: 'delete', label: 'Eliminar', icon: 'lucideTrash2', variant: 'danger' }
  ];

  mappedLogs = computed<DatelineItem[]>(() => {
    return this.roleLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: this.getLogActionLabel(log.action),
      user: log.actorUserName || 'Sistema',
      icon: this.getLogIcon(log.action),
      changes: log.action === 'UPDATE' ? this.getChangedFields(log.details) : undefined,
      message: log.action === 'CREATE' ? 'Creación inicial del rol.' : 
               log.action === 'SYNC' ? 'Sincronización de permisos realizada.' : undefined
    }));
  });

  private readonly rolesResponse = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      sortField: this.sortField(),
      sortOrder: this.sortOrder(),
      filterModel: QueryMapper.toAgGridFilterModel(this.filterTree()),
      tab: this.activeTab(),
      refresh: this.refreshTrigger()
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap((params: any) => this.rolesService.getAll(params).pipe(
        tap(() => this.isLoading.set(false))
      ))
    ),
    { initialValue: { data: [] as Role[], meta: { itemCount: 0, page: 1, take: 12, pageCount: 0 } } }
  );

  roles = computed(() => (this.rolesResponse() as any).data || []);
  meta = computed(() => (this.rolesResponse() as any).meta);

  
  constructor() {
    if (typeof window !== 'undefined') {
      const mobileQuery = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mobileQuery.matches);
      mobileQuery.addEventListener('change', (e) => this.isMobile.set(e.matches));
    }
  }

  ngOnInit() {}

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onSortChange(sortData: { field: string, order: 'desc' | 'asc' }) {
    this.sortField.set(sortData.field);
    this.sortOrder.set(sortData.order.toUpperCase() as 'ASC' | 'DESC');
    this.currentPage.set(1);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onTabChange(tab: string) {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  openAdvancedFilters() {
    this.modalService.open(
      RoleAdvancedFilters,
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

  onOpenCreateForm() {
    this.selectedRole.set(undefined);
    this.isFormOpen.set(true);
  }

  onCloseForm() {
    this.closeDrawer();
  }

  onDrawerClose() {
    if (this.roleFormRef?.hasUnsavedChanges()) {
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
    this.isFormOpen.set(false);
    this.selectedRole.set(undefined);
    this.roleFormRef?.resetForm();
  }

  onShowDetail(role: Role) {
    this.selectedRole.set(role);
    this.isDetailOpen.set(true);
  }

  onCloseDetail() {
    this.isDetailOpen.set(false);
  }

  onShowHistory(role: Role) {
    this.selectedRole.set(role);
    this.isHistoryOpen.set(true);
    this.isDetailOpen.set(false);
    this.isHistoryLoading.set(true);
    this.rolesService.getLogs(role.id)
      .pipe(finalize(() => this.isHistoryLoading.set(false)))
      .subscribe({
        next: (logs) => this.roleLogs.set(logs),
        error: () => this.toastService.error('Error al cargar el historial')
      });
  }

  onCloseHistory() {
    this.isHistoryOpen.set(false);
  }

  onFormSaved() {
    this.isFormOpen.set(false);
    this.refreshTrigger.update(v => v + 1);
  }

  handleActionClick(action: ActionItem, role: Role) {
    if (action.id === 'view') {
      this.onShowDetail(role);
    } else if (action.id === 'history') {
      this.onShowHistory(role);
    } else if (action.id === 'edit') {
      if (role.name === 'SUPER_ADMIN') {
        this.toastService.error('El rol MASTER_ADMIN no puede ser editado.');
        return;
      }
      this.selectedRole.set(role);
      this.isDetailOpen.set(false);
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

  onCancelDelete() {
    this.isDeleteModalOpen.set(false);
    this.roleToDelete.set(undefined);
  }

  confirmDelete() {
    const role = this.roleToDelete();
    if (!role) return;

    this.isDeleting.set(true);
    this.rolesService.delete(role.id).subscribe({
      next: () => {
        this.toastService.success('Rol eliminado correctamente');
        this.isDeleteModalOpen.set(false);
        this.roleToDelete.set(undefined);
        this.isDeleting.set(false);
        this.refreshTrigger.update(v => v + 1);
      },
      error: (err: any) => {
        this.toastService.error(err.error?.message || 'Error al eliminar el rol');
        this.isDeleting.set(false);
      }
    });
  }

  private getLogActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'CREATE': 'Creación',
      'UPDATE': 'Actualización',
      'DELETE': 'Eliminación',
      'SYNC': 'Sincronización'
    };
    return labels[action] || action;
  }

  private getLogIcon(action: string): string {
    const icons: Record<string, string> = {
      'CREATE': 'lucidePlus',
      'UPDATE': 'lucideRefreshCw',
      'DELETE': 'lucideTrash',
      'SYNC': 'lucideShield'
    };
    return icons[action] || 'lucideHistory';
  }

  private getChangedFields(details: any): any[] {
    if (!details) return [];
    const fields: any[] = [];
    
    if (details.oldName && details.newName) {
      fields.push({ label: 'Nombre', oldValue: details.oldName, newValue: details.newName });
    }
    if (details.permissionsUpdated) {
      fields.push({ label: 'Permisos', oldValue: 'Anteriores', newValue: 'Actualizados' });
    }
    
    return fields;
  }
}

