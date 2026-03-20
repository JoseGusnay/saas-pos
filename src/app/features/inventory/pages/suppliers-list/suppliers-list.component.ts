import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';

import { SupplierService } from '../../../../core/services/supplier.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Supplier } from '../../../../core/models/supplier.models';
import { QueryMapper } from '../../../../core/utils/query-mapper.util';
import { FilterGroup, FilterNode, FilterField } from '../../../../core/models/query-builder.models';
import { ModalService } from '../../../../core/components/modal/modal.service';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { DatelineComponent, DatelineItem } from '../../../../shared/components/ui/dateline/dateline.component';
import { ActionsMenuComponent, ActionItem } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { SupplierFormComponent } from './components/supplier-form/supplier-form.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideHistory,
  lucidePlusCircle, lucideRefreshCw, lucideTrash, lucideSearch,
  lucideBuilding2, lucidePhone, lucideMail, lucideUser, lucideMapPin
} from '@ng-icons/lucide';

@Component({
  selector: 'app-suppliers-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DrawerComponent, ModalComponent, FormButtonComponent,
    SkeletonComponent, EmptyStateComponent, SpinnerComponent,
    DatelineComponent, ActionsMenuComponent, SupplierFormComponent, NgIconComponent
  ],
  providers: [
    provideIcons({
      lucidePlus, lucideSave, lucidePencil, lucideTrash2, lucideHistory,
      lucidePlusCircle, lucideRefreshCw, lucideTrash, lucideSearch,
      lucideBuilding2, lucidePhone, lucideMail, lucideUser, lucideMapPin
    })
  ],
  template: `
    <div class="suppliers-page">
      <app-page-header
        title="Proveedores"
        [tabs]="tabs"
        [activeTab]="activeTab()"
        ctaText="Nuevo Proveedor"
        ctaIcon="lucidePlus"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onAdd()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar proveedores..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="0"
        [viewMode]="viewModePreference()"
        (searchChange)="onSearch($event)"
        (viewModeChange)="viewModePreference.set($event)"
      ></app-list-toolbar>

      <div [ngClass]="viewMode() === 'grid' ? 'suppliers-page__grid' : 'suppliers-page__list'">
        @if (isLoading()) {
          @for (n of [1,2,3,4,5,6]; track n) {
            @if (viewMode() === 'grid') {
              <div class="supplier-card skeleton-card">
                <div class="supplier-card__header">
                  <app-skeleton width="150px" height="1.1rem"></app-skeleton>
                  <app-skeleton width="32px" height="32px" shape="circle"></app-skeleton>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
                  <app-skeleton width="120px" height="0.875rem"></app-skeleton>
                  <app-skeleton width="140px" height="0.875rem"></app-skeleton>
                </div>
                <app-skeleton width="70px" height="22px" radius="99px" style="margin-top:8px"></app-skeleton>
              </div>
            } @else {
              <div class="supplier-row skeleton-row">
                <app-skeleton width="44px" height="44px" radius="10px"></app-skeleton>
                <div style="flex:1;display:flex;flex-direction:column;gap:4px">
                  <app-skeleton width="180px" height="1rem"></app-skeleton>
                  <app-skeleton width="130px" height="0.875rem"></app-skeleton>
                </div>
                <app-skeleton width="70px" height="22px" radius="99px"></app-skeleton>
                <app-skeleton width="32px" height="32px" shape="circle"></app-skeleton>
              </div>
            }
          }
        } @else if (suppliers().length > 0) {
          @for (s of suppliers(); track s.id) {
            @if (viewMode() === 'grid') {
              <div class="supplier-card shadow-sm" (click)="onShowDetail(s)">
                <div class="supplier-card__header">
                  <div class="supplier-card__title">
                    <span class="supplier-name">{{ s.name }}</span>
                    <span class="badge-status" [class]="s.isActive ? 'active' : 'inactive'">
                      {{ s.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>
                  <div (click)="$event.stopPropagation()">
                    <app-actions-menu [actions]="actions" (actionClick)="handleAction($event, s)"></app-actions-menu>
                  </div>
                </div>
                <div class="supplier-card__body">
                  @if (s.ruc) {
                    <span class="supplier-detail">
                      <ng-icon name="lucideBuilding2" size="13"></ng-icon> {{ s.ruc }}
                    </span>
                  }
                  @if (s.phone) {
                    <span class="supplier-detail">
                      <ng-icon name="lucidePhone" size="13"></ng-icon> {{ s.phone }}
                    </span>
                  }
                  @if (s.email) {
                    <span class="supplier-detail">
                      <ng-icon name="lucideMail" size="13"></ng-icon> {{ s.email }}
                    </span>
                  }
                  @if (!s.ruc && !s.phone && !s.email) {
                    <span class="supplier-detail no-data">Sin datos de contacto</span>
                  }
                </div>
              </div>
            } @else {
              <div class="supplier-row shadow-sm" (click)="onShowDetail(s)">
                <div class="supplier-avatar" [style.background]="'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'">{{ s.name[0].toUpperCase() }}</div>
                <div class="supplier-row__info">
                  <span class="supplier-name">{{ s.name }}</span>
                  <span class="supplier-sub">{{ s.ruc || s.email || 'Sin datos de contacto' }}</span>
                </div>
                <span class="badge-status" [class]="s.isActive ? 'active' : 'inactive'">
                  {{ s.isActive ? 'Activo' : 'Inactivo' }}
                </span>
                <div (click)="$event.stopPropagation()">
                  <app-actions-menu [actions]="actions" (actionClick)="handleAction($event, s)"></app-actions-menu>
                </div>
              </div>
            }
          }
        } @else {
          <div class="suppliers-page__empty">
            <app-empty-state
              icon="lucideBuilding2"
              [title]="searchQuery() ? 'No encontramos lo que buscas' : 'Sin proveedores registrados'"
              [description]="searchQuery() ? 'Intenta con otros términos.' : 'Agrega tu primer proveedor para empezar.'"
              [actionLabel]="searchQuery() ? undefined : 'Nuevo Proveedor'"
              (action)="onAdd()"
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

      <!-- Detalle -->
      <app-drawer [isOpen]="isDetailOpen()" title="Detalle de Proveedor" (close)="isDetailOpen.set(false)" size="md">
        <div drawerBody>
          @if (selected()) {
            <div class="detail-body">
              <div class="detail-avatar" [style.background]="'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'">{{ selected()!.name[0].toUpperCase() }}</div>
              <h3 class="detail-name">{{ selected()!.name }}</h3>
              <span class="badge-status" [class]="selected()!.isActive ? 'active' : 'inactive'">
                {{ selected()!.isActive ? 'Activo' : 'Inactivo' }}
              </span>
              <div class="detail-fields">
                @if (selected()!.ruc) {
                  <div class="detail-field">
                    <ng-icon name="lucideBuilding2" size="16"></ng-icon>
                    <div><span class="field-label">RUC</span><span>{{ selected()!.ruc }}</span></div>
                  </div>
                }
                @if (selected()!.phone) {
                  <div class="detail-field">
                    <ng-icon name="lucidePhone" size="16"></ng-icon>
                    <div><span class="field-label">Teléfono</span><span>{{ selected()!.phone }}</span></div>
                  </div>
                }
                @if (selected()!.email) {
                  <div class="detail-field">
                    <ng-icon name="lucideMail" size="16"></ng-icon>
                    <div><span class="field-label">Correo</span><span>{{ selected()!.email }}</span></div>
                  </div>
                }
                @if (selected()!.contactName) {
                  <div class="detail-field">
                    <ng-icon name="lucideUser" size="16"></ng-icon>
                    <div><span class="field-label">Contacto</span><span>{{ selected()!.contactName }}</span></div>
                  </div>
                }
                @if (selected()!.address) {
                  <div class="detail-field">
                    <ng-icon name="lucideMapPin" size="16"></ng-icon>
                    <div><span class="field-label">Dirección</span><span>{{ selected()!.address }}</span></div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <button class="btn btn-secondary" (click)="onShowHistory(selected()!.id)">
            <ng-icon name="lucideHistory"></ng-icon> Ver Historial
          </button>
          <button class="btn btn-primary" (click)="onEdit(selected()!)">
            <ng-icon name="lucidePencil"></ng-icon> Editar
          </button>
        </div>
      </app-drawer>

      <!-- Historial -->
      <app-drawer [isOpen]="isHistoryOpen()" title="Historial de Auditoría" (close)="isHistoryOpen.set(false)">
        <div drawerBody class="history-container">
          @if (isHistoryLoading()) { <app-spinner></app-spinner> }
          @else { <app-dateline [items]="mappedLogs()"></app-dateline> }
        </div>
      </app-drawer>

      <!-- Form Drawer -->
      <app-drawer
        [isOpen]="isDrawerOpen()"
        [title]="isEditing() ? 'Editar Proveedor' : 'Nuevo Proveedor'"
        [allowClose]="!(supplierForm?.isSubmitting?.() ?? false)"
        (close)="onDrawerClose()"
        size="md"
      >
        <div drawerBody>
          <app-supplier-form #supplierForm (saved)="onSaved()" (cancelled)="onDrawerClose()"></app-supplier-form>
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" [disabled]="supplierForm?.isSubmitting?.() ?? false" (click)="onDrawerClose()"></app-form-button>
          <app-form-button
            [label]="isEditing() ? 'Actualizar' : 'Guardar'"
            loadingLabel="Guardando..."
            icon="lucideSave"
            [loading]="supplierForm?.isSubmitting?.() ?? false"
            [disabled]="!(supplierForm?.formData?.name?.trim()) || (supplierForm?.isSubmitting?.() ?? false)"
            (click)="supplierForm?.onSubmit()"
          ></app-form-button>
        </div>
      </app-drawer>

      <!-- Confirmar exit -->
      <app-modal [isOpen]="isExitModalOpen()" title="Cambios sin guardar" (close)="isExitModalOpen.set(false)">
        <div modalBody>Tienes cambios sin guardar. ¿Deseas salir?</div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Continuar" variant="secondary" (click)="isExitModalOpen.set(false)"></app-form-button>
          <app-form-button label="Salir sin guardar" variant="danger" (click)="confirmExit()"></app-form-button>
        </div>
      </app-modal>

      <!-- Confirmar delete -->
      <app-modal [isOpen]="isDeleteModalOpen()" title="Eliminar Proveedor" (close)="isDeleteModalOpen.set(false)">
        <div modalBody>¿Estás seguro de eliminar "{{ toDelete()?.name }}"?</div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isDeleteModalOpen.set(false)"></app-form-button>
          <app-form-button label="Eliminar" variant="danger" icon="lucideTrash2" [loading]="isDeleting()" (click)="confirmDelete()"></app-form-button>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    .suppliers-page { display: flex; flex-direction: column; min-height: 100%; width: 100%; }
    .suppliers-page__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; }
    .suppliers-page__list { display: flex; flex-direction: column; gap: 0.75rem; }
    .suppliers-page__empty { grid-column: 1 / -1; display: flex; justify-content: center; width: 100%; padding: 4rem 1rem; }

    .supplier-card {
      background: var(--color-bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border-light);
      padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;
      cursor: pointer; transition: all var(--transition-base);
    }
    .supplier-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--color-accent-primary); }
    .skeleton-card { height: 160px; pointer-events: none; }
    .supplier-card__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
    .supplier-card__title { display: flex; flex-direction: column; gap: 0.375rem; min-width: 0; }
    .supplier-card__body { display: flex; flex-direction: column; gap: 0.375rem; }

    .supplier-avatar {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 1.125rem;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .supplier-name { font-weight: var(--font-weight-semibold); color: var(--color-text-main); font-size: var(--font-size-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .supplier-detail { display: flex; align-items: center; gap: 0.375rem; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .supplier-detail.no-data { font-style: italic; }

    .supplier-row {
      display: flex; align-items: center; gap: 1rem; padding: 0.875rem 1.25rem;
      background: var(--color-bg-surface); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-base);
      position: relative; z-index: 1;
    }
    .supplier-row:hover { transform: translateX(4px); border-color: var(--color-accent-primary); background: var(--color-bg-hover); z-index: 10; }
    .supplier-row:has(.actions-menu-open) { z-index: 50; }
    .skeleton-row { pointer-events: none; }
    .supplier-row__info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .supplier-sub { font-size: var(--font-size-xs); color: var(--color-text-muted); }

    .badge-status { padding: 0.2rem 0.625rem; border-radius: 99px; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }
    .badge-status.active   { background: var(--color-success-bg); color: var(--color-success-text); }
    .badge-status.inactive { background: var(--color-border-subtle); color: var(--color-text-muted); }

    /* Detail drawer */
    .detail-body { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 1.5rem 1rem; }
    .detail-avatar { width: 72px; height: 72px; border-radius: 18px; background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 2rem; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
    .detail-name { font-size: 1.25rem; font-weight: var(--font-weight-bold); color: var(--color-text-main); margin: 0; }
    .detail-fields { width: 100%; display: flex; flex-direction: column; gap: 0.875rem; margin-top: 0.75rem; }
    .detail-field { display: flex; align-items: flex-start; gap: 0.75rem; color: var(--color-text-muted); }
    .detail-field div { display: flex; flex-direction: column; gap: 2px; }
    .field-label { font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
    .detail-field span:last-child { font-size: var(--font-size-sm); color: var(--color-text-main); }

    .history-container { padding: 1rem; }
    .drawer-footer-actions { display: flex; justify-content: flex-end; gap: 12px; width: 100%; }
    .modal-footer-actions { display: flex; gap: 1rem; justify-content: flex-end; }
  `]
})
export class SuppliersListComponent {
  private service = inject(SupplierService);
  private toastService = inject(ToastService);
  modalService = inject(ModalService);

  @ViewChild('supplierForm') supplierForm?: SupplierFormComponent;

  tabs = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Activos', value: 'Activos' },
    { label: 'Inactivos', value: 'Inactivos' }
  ];

  actions: ActionItem[] = [
    { id: 'edit',    label: 'Editar',    icon: 'lucidePencil' },
    { id: 'history', label: 'Historial', icon: 'lucideHistory' },
    { id: 'delete',  label: 'Eliminar',  icon: 'lucideTrash2', variant: 'danger' }
  ];

  activeTab          = signal('Todos');
  searchQuery        = signal('');
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile           = signal(false);
  viewMode           = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());
  currentPage        = signal(1);
  pageSize           = signal(12);
  refreshTrigger     = signal(0);
  isLoading          = signal(true);
  isEditing          = signal(false);
  isDrawerOpen       = signal(false);
  isDetailOpen       = signal(false);
  isHistoryOpen      = signal(false);
  isHistoryLoading   = signal(false);
  isExitModalOpen    = signal(false);
  isDeleteModalOpen  = signal(false);
  isDeleting         = signal(false);
  selected           = signal<Supplier | null>(null);
  toDelete           = signal<Supplier | null>(null);
  logs               = signal<any[]>([]);

  private readonly response = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(), limit: this.pageSize(),
      search: this.searchQuery(), tab: this.activeTab(), refresh: this.refreshTrigger()
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        const { tab, ...filters } = params;
        const filterModel: any = {};
        if (tab === 'Activos')   filterModel['isActive'] = { filterType: 'text', type: 'equals', filter: 'true' };
        if (tab === 'Inactivos') filterModel['isActive'] = { filterType: 'text', type: 'equals', filter: 'false' };
        return this.service.findAll({ ...filters, filterModel }).pipe(tap(() => this.isLoading.set(false)));
      })
    )
  );

  suppliers  = computed(() => this.response()?.data ?? []);
  totalItems = computed(() => this.response()?.total ?? 0);

  mappedLogs = computed<DatelineItem[]>(() => this.logs().map(log => ({
    id: log.id, date: log.createdAt, action: log.action,
    actionLabel: log.action === 'CREATE' ? 'Creación' : log.action === 'UPDATE' ? 'Actualización' : 'Eliminación',
    user: log.userName || 'Sistema',
    icon: log.action === 'CREATE' ? 'lucidePlusCircle' : log.action === 'UPDATE' ? 'lucideRefreshCw' : 'lucideTrash',
    changes: log.action === 'UPDATE' && log.details?.oldData
      ? this.getChanges(log.details.oldData, log.details.newData) : undefined
  })));

  onTabChange(tab: string) { this.activeTab.set(tab); this.currentPage.set(1); }
  onSearch(q: string)      { this.searchQuery.set(q);  this.currentPage.set(1); }

  onAdd()  { this.isEditing.set(false); this.isDrawerOpen.set(true); setTimeout(() => this.supplierForm?.resetForm(), 0); }
  onEdit(s: Supplier) { this.isDetailOpen.set(false); this.isEditing.set(true); this.isDrawerOpen.set(true); setTimeout(() => this.supplierForm?.setSupplier(s), 0); }
  onShowDetail(s: Supplier) { this.selected.set(s); this.isDetailOpen.set(true); }

  onShowHistory(id: string) {
    this.isDetailOpen.set(false);
    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);
    this.service.getLogs(id).subscribe({
      next: logs => { this.logs.set(logs); this.isHistoryLoading.set(false); },
      error: () => { this.toastService.error('Error al cargar historial'); this.isHistoryLoading.set(false); }
    });
  }

  handleAction(action: ActionItem, s: Supplier) {
    if (action.id === 'edit')    this.onEdit(s);
    if (action.id === 'history') this.onShowHistory(s.id);
    if (action.id === 'delete')  { this.toDelete.set(s); this.isDeleteModalOpen.set(true); }
  }

  confirmDelete() {
    const s = this.toDelete(); if (!s) return;
    this.isDeleting.set(true);
    this.service.remove(s.id).subscribe({
      next: () => { this.toastService.success('Proveedor eliminado'); this.refreshTrigger.update(v => v + 1); this.isDeleting.set(false); this.isDeleteModalOpen.set(false); },
      error: () => { this.toastService.error('Error al eliminar'); this.isDeleting.set(false); }
    });
  }

  onSaved()       { this.isDrawerOpen.set(false); this.refreshTrigger.update(v => v + 1); }
  onDrawerClose() { if (this.supplierForm?.hasUnsavedChanges()) this.isExitModalOpen.set(true); else this.closeDrawer(); }
  confirmExit()   { this.isExitModalOpen.set(false); this.closeDrawer(); }
  private closeDrawer() { this.isDrawerOpen.set(false); this.supplierForm?.resetForm(); }

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mq.matches);
      mq.addEventListener('change', e => this.isMobile.set(e.matches));
    }
  }

  private getChanges(oldData: any, newData: any) {
    if (!oldData || !newData) return [];
    const fields = [
      { field: 'name', label: 'Nombre' }, { field: 'ruc', label: 'RUC' },
      { field: 'email', label: 'Correo' }, { field: 'phone', label: 'Teléfono' },
      { field: 'contactName', label: 'Contacto' }, { field: 'isActive', label: 'Estado' }
    ];
    return fields
      .filter(f => JSON.stringify(oldData[f.field]) !== JSON.stringify(newData[f.field]))
      .map(f => ({ ...f, oldValue: String(oldData[f.field] ?? ''), newValue: String(newData[f.field] ?? '') }));
  }
}
