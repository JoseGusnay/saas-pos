import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap } from 'rxjs';

import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { SupplierService } from '../../../../core/services/supplier.service';
import { BranchService } from '../../../../core/services/branch.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PurchaseOrder, PurchaseOrderStatus } from '../../../../core/models/purchase-order.models';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { ActionsMenuComponent, ActionItem } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideEye, lucidePencil, lucideTrash2, lucideCheck,
  lucidePackageCheck, lucideX, lucideShoppingCart, lucideBuilding2,
  lucideWarehouse, lucideChevronRight, lucideClipboardList
} from '@ng-icons/lucide';

@Component({
  selector: 'app-purchase-orders-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DrawerComponent, ModalComponent, FormButtonComponent,
    SkeletonComponent, EmptyStateComponent, SpinnerComponent,
    ActionsMenuComponent, NgIconComponent
  ],
  providers: [
    provideIcons({
      lucidePlus, lucideEye, lucidePencil, lucideTrash2, lucideCheck,
      lucidePackageCheck, lucideX, lucideShoppingCart, lucideBuilding2,
      lucideWarehouse, lucideChevronRight, lucideClipboardList
    })
  ],
  template: `
    <div class="orders-page">
      <app-page-header
        title="Órdenes de Compra"
        [tabs]="tabs"
        [activeTab]="activeTab()"
        ctaText="Nueva Orden"
        ctaIcon="lucidePlus"
        (tabChange)="onTabChange($event)"
        (ctaClick)="onNew()"
      ></app-page-header>

      <app-list-toolbar
        searchPlaceholder="Buscar por proveedor..."
        [searchQuery]="searchQuery()"
        [activeFiltersCount]="0"
        [viewMode]="'list'"
        [showViewToggle]="false"
        (searchChange)="onSearch($event)"
      ></app-list-toolbar>

      <div class="toolbar-extras">
        <select class="select-filter" [ngModel]="filterBranch()" (ngModelChange)="filterBranch.set($event); currentPage.set(1)">
          <option value="">Todas las sucursales</option>
          @for (b of branches(); track b.id) { <option [value]="b.id">{{ b.name }}</option> }
        </select>
      </div>

      <div class="orders-page__list">
        @if (isLoading()) {
          @for (n of [1,2,3,4]; track n) {
            <div class="order-row skeleton-row">
              <app-skeleton width="90px" height="24px" radius="6px"></app-skeleton>
              <div style="flex:1;display:flex;flex-direction:column;gap:4px">
                <app-skeleton width="200px" height="1rem"></app-skeleton>
                <app-skeleton width="140px" height="0.875rem"></app-skeleton>
              </div>
              <app-skeleton width="80px" height="1rem"></app-skeleton>
              <app-skeleton width="110px" height="0.875rem"></app-skeleton>
              <app-skeleton width="32px" height="32px" shape="circle"></app-skeleton>
            </div>
          }
        } @else if (orders().length > 0) {
          @for (order of orders(); track order.id) {
            <div class="order-row shadow-sm" (click)="onViewDetail(order)">
              <span class="badge-status" [class]="order.status.toLowerCase()">
                {{ getStatusLabel(order.status) }}
              </span>
              <div class="order-info">
                <span class="order-supplier">{{ order.supplierName || 'Proveedor' }}</span>
                <span class="order-sub">
                  <ng-icon name="lucideWarehouse" size="12"></ng-icon>
                  {{ order.branchName }} · {{ order.itemCount || 0 }} ítem{{ (order.itemCount || 0) !== 1 ? 's' : '' }}
                </span>
              </div>
              <div class="order-total">{{ +order.totalAmount | currency:'USD':'symbol':'1.2-2' }}</div>
              <div class="order-date">{{ order.createdAt | date:'dd/MM/yy' }}</div>
              <div (click)="$event.stopPropagation()">
                <app-actions-menu [actions]="getActions(order)" (actionClick)="handleAction($event, order)"></app-actions-menu>
              </div>
            </div>
          }
        } @else {
          <div class="orders-page__empty">
            <app-empty-state
              icon="lucideClipboardList"
              [title]="searchQuery() ? 'No encontramos lo que buscas' : 'Sin órdenes de compra'"
              [description]="searchQuery() ? 'Intenta con otros términos.' : 'Crea tu primera orden de compra.'"
              [actionLabel]="searchQuery() ? undefined : 'Nueva Orden'"
              (action)="onNew()"
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

      <!-- Detalle Drawer -->
      <app-drawer [isOpen]="isDetailOpen()" title="Orden de Compra" (close)="isDetailOpen.set(false)" size="lg">
        <div drawerBody>
          @if (isDetailLoading()) { <app-spinner></app-spinner> }
          @else if (detail()) {
            <div class="detail-body">
              <div class="detail-header">
                <span class="badge-status lg" [class]="detail()!.status.toLowerCase()">
                  {{ getStatusLabel(detail()!.status) }}
                </span>
                <span class="detail-date">{{ detail()!.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="detail-meta">
                <div class="meta-item">
                  <ng-icon name="lucideBuilding2" size="16"></ng-icon>
                  <div><span class="meta-label">Proveedor</span><span>{{ detail()!.supplierName }}</span></div>
                </div>
                <div class="meta-item">
                  <ng-icon name="lucideWarehouse" size="16"></ng-icon>
                  <div><span class="meta-label">Sucursal</span><span>{{ detail()!.branchName }}</span></div>
                </div>
                @if (detail()!.notes) {
                  <div class="meta-item">
                    <ng-icon name="lucideClipboardList" size="16"></ng-icon>
                    <div><span class="meta-label">Notas</span><span>{{ detail()!.notes }}</span></div>
                  </div>
                }
              </div>

              <table class="items-table">
                <thead>
                  <tr>
                    <th>Producto / Variante</th>
                    <th class="text-right">Cant.</th>
                    <th class="text-right">Costo Unit.</th>
                    <th class="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of detail()!.items; track item.id) {
                    <tr>
                      <td>
                        <span class="item-product">{{ item.productName }}</span>
                        <span class="item-variant">{{ item.variantName }} · {{ item.sku }}</span>
                      </td>
                      <td class="text-right">{{ item.quantity }}</td>
                      <td class="text-right">{{ +item.unitCost | currency:'USD':'symbol':'1.2-2' }}</td>
                      <td class="text-right">{{ +item.subtotal | currency:'USD':'symbol':'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="text-right total-label">Total</td>
                    <td class="text-right total-value">{{ +detail()!.totalAmount | currency:'USD':'symbol':'1.2-2' }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          @if (detail()?.status === 'DRAFT') {
            <button class="btn btn-secondary" (click)="onEdit(detail()!)">
              <ng-icon name="lucidePencil"></ng-icon> Editar
            </button>
            <button class="btn btn-primary" [disabled]="isActioning()" (click)="onConfirm(detail()!.id)">
              <ng-icon name="lucideCheck"></ng-icon>
              {{ isActioning() ? 'Confirmando...' : 'Confirmar Orden' }}
            </button>
          }
          @if (detail()?.status === 'CONFIRMED') {
            <button class="btn btn-primary" [disabled]="isActioning()" (click)="onReceive(detail()!.id)">
              <ng-icon name="lucidePackageCheck"></ng-icon>
              {{ isActioning() ? 'Procesando...' : 'Recibir Mercadería' }}
            </button>
          }
        </div>
      </app-drawer>

      <!-- Confirmar cancelar -->
      <app-modal [isOpen]="isCancelModalOpen()" title="Cancelar Orden" (close)="isCancelModalOpen.set(false)">
        <div modalBody>¿Estás seguro de cancelar esta orden? Esta acción no se puede deshacer.</div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Volver" variant="secondary" (click)="isCancelModalOpen.set(false)"></app-form-button>
          <app-form-button label="Cancelar Orden" variant="danger" icon="lucideX" [loading]="isActioning()" (click)="confirmCancel()"></app-form-button>
        </div>
      </app-modal>

      <!-- Confirmar delete -->
      <app-modal [isOpen]="isDeleteModalOpen()" title="Eliminar Borrador" (close)="isDeleteModalOpen.set(false)">
        <div modalBody>¿Eliminar este borrador? La acción es irreversible.</div>
        <div modalFooter class="modal-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" (click)="isDeleteModalOpen.set(false)"></app-form-button>
          <app-form-button label="Eliminar" variant="danger" icon="lucideTrash2" [loading]="isActioning()" (click)="confirmDelete()"></app-form-button>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    .orders-page { display: flex; flex-direction: column; min-height: 100%; width: 100%; }
    .orders-page__list { display: flex; flex-direction: column; gap: 0.75rem; }
    .orders-page__empty { display: flex; justify-content: center; padding: 4rem 1rem; }

    .toolbar-extras { display: flex; gap: 0.75rem; align-items: center; padding: 0.5rem 0 0.75rem; flex-wrap: wrap; }
    .select-filter { padding: 0.375rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--color-border-light); background: var(--color-bg-surface); color: var(--color-text-main); font-size: var(--font-size-sm); cursor: pointer; }

    .order-row {
      display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem;
      background: var(--color-bg-surface); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-base);
      position: relative; z-index: 1;
    }
    .order-row:hover { transform: translateX(4px); border-color: var(--color-accent-primary); background: var(--color-bg-hover); z-index: 10; }
    .order-row:has(.actions-menu-open) { z-index: 50; }
    .skeleton-row { pointer-events: none; }

    .order-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .order-supplier { font-weight: var(--font-weight-semibold); color: var(--color-text-main); font-size: var(--font-size-sm); }
    .order-sub { display: flex; align-items: center; gap: 0.25rem; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .order-total { font-weight: var(--font-weight-semibold); color: var(--color-text-main); white-space: nowrap; }
    .order-date { font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }

    .badge-status { padding: 0.2rem 0.75rem; border-radius: 99px; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); white-space: nowrap; }
    .badge-status.lg { padding: 0.375rem 1rem; font-size: var(--font-size-sm); }
    .badge-status.draft     { background: var(--color-border-subtle); color: var(--color-text-muted); }
    .badge-status.confirmed { background: #dbeafe; color: #1e40af; }
    .badge-status.received  { background: var(--color-success-bg); color: var(--color-success-text); }
    .badge-status.cancelled { background: var(--color-danger-bg); color: var(--color-danger-text); }

    /* Detail drawer */
    .detail-body { display: flex; flex-direction: column; gap: 1.25rem; }
    .detail-header { display: flex; align-items: center; justify-content: space-between; }
    .detail-date { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .detail-meta { display: flex; flex-direction: column; gap: 0.875rem; padding: 1rem; background: var(--color-bg-subtle); border-radius: var(--radius-md); }
    .meta-item { display: flex; align-items: flex-start; gap: 0.75rem; color: var(--color-text-muted); }
    .meta-item div { display: flex; flex-direction: column; gap: 2px; }
    .meta-label { font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
    .meta-item span:last-child { font-size: var(--font-size-sm); color: var(--color-text-main); }

    .items-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    .items-table th { padding: 0.625rem 0.75rem; text-align: left; font-weight: var(--font-weight-semibold); color: var(--color-text-muted); border-bottom: 2px solid var(--color-border-light); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; }
    .items-table td { padding: 0.75rem; border-bottom: 1px solid var(--color-border-subtle); vertical-align: top; }
    .items-table tfoot td { border-bottom: none; border-top: 2px solid var(--color-border-light); }
    .text-right { text-align: right; }
    .item-product { display: block; font-weight: var(--font-weight-medium); color: var(--color-text-main); }
    .item-variant { display: block; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .total-label { font-weight: var(--font-weight-semibold); color: var(--color-text-main); }
    .total-value { font-weight: var(--font-weight-bold); font-size: 1.1rem; color: var(--color-text-main); }

    .drawer-footer-actions { display: flex; justify-content: flex-end; gap: 12px; width: 100%; }
    .modal-footer-actions { display: flex; gap: 1rem; justify-content: flex-end; }
  `]
})
export class PurchaseOrdersListComponent {
  private orderService  = inject(PurchaseOrderService);
  private supplierService = inject(SupplierService);
  private branchService = inject(BranchService);
  private toastService  = inject(ToastService);
  private router        = inject(Router);

  tabs = [
    { label: 'Todas',      value: '' },
    { label: 'Borrador',   value: 'DRAFT' },
    { label: 'Confirmada', value: 'CONFIRMED' },
    { label: 'Recibida',   value: 'RECEIVED' },
    { label: 'Cancelada',  value: 'CANCELLED' }
  ];

  activeTab      = signal('');
  searchQuery    = signal('');
  filterBranch   = signal('');
  currentPage    = signal(1);
  pageSize       = signal(20);
  refreshTrigger = signal(0);
  isLoading      = signal(true);
  isDetailOpen   = signal(false);
  isDetailLoading = signal(false);
  isCancelModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isActioning    = signal(false);
  detail         = signal<PurchaseOrder | null>(null);
  actionTargetId = signal<string | null>(null);

  private branchesResponse = toSignal(
    this.branchService.findAll({ limit: 100 }),
    { initialValue: { data: [] as any[], total: 0 } }
  );
  branches = computed<any[]>(() => (this.branchesResponse() as any)?.data ?? []);

  private readonly response = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(), limit: this.pageSize(),
      search: this.searchQuery(), status: this.activeTab(),
      branchId: this.filterBranch(), refresh: this.refreshTrigger()
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        const { refresh, ...filters } = params;
        return this.orderService.findAll(filters).pipe(tap(() => this.isLoading.set(false)));
      })
    )
  );

  orders     = computed(() => this.response()?.data ?? []);
  totalItems = computed(() => this.response()?.total ?? 0);

  getStatusLabel(status: PurchaseOrderStatus): string {
    const map: Record<PurchaseOrderStatus, string> = {
      DRAFT: 'Borrador', CONFIRMED: 'Confirmada', RECEIVED: 'Recibida', CANCELLED: 'Cancelada'
    };
    return map[status] ?? status;
  }

  getActions(order: PurchaseOrder): ActionItem[] {
    const actions: ActionItem[] = [
      { id: 'view', label: 'Ver detalle', icon: 'lucideEye' }
    ];
    if (order.status === 'DRAFT') {
      actions.push({ id: 'edit',    label: 'Editar',          icon: 'lucidePencil' });
      actions.push({ id: 'confirm', label: 'Confirmar',       icon: 'lucideCheck' });
      actions.push({ id: 'cancel',  label: 'Cancelar Orden',  icon: 'lucideX',     variant: 'danger' });
      actions.push({ id: 'delete',  label: 'Eliminar',        icon: 'lucideTrash2', variant: 'danger' });
    }
    if (order.status === 'CONFIRMED') {
      actions.push({ id: 'receive', label: 'Recibir',         icon: 'lucidePackageCheck' });
      actions.push({ id: 'cancel',  label: 'Cancelar Orden',  icon: 'lucideX',     variant: 'danger' });
    }
    return actions;
  }

  handleAction(action: ActionItem, order: PurchaseOrder) {
    if (action.id === 'view')    this.onViewDetail(order);
    if (action.id === 'edit')    this.onEdit(order);
    if (action.id === 'confirm') this.onConfirm(order.id);
    if (action.id === 'receive') this.onReceive(order.id);
    if (action.id === 'cancel')  { this.actionTargetId.set(order.id); this.isCancelModalOpen.set(true); }
    if (action.id === 'delete')  { this.actionTargetId.set(order.id); this.isDeleteModalOpen.set(true); }
  }

  onTabChange(tab: string) { this.activeTab.set(tab); this.currentPage.set(1); }
  onSearch(q: string)      { this.searchQuery.set(q); this.currentPage.set(1); }
  onNew()                  { this.router.navigate(['/inventario/ordenes-compra/nueva']); }
  onEdit(order: PurchaseOrder) { this.router.navigate(['/inventario/ordenes-compra', order.id, 'editar']); }

  onViewDetail(order: PurchaseOrder) {
    this.isDetailOpen.set(true);
    this.isDetailLoading.set(true);
    this.detail.set(null);
    this.orderService.findOne(order.id).subscribe({
      next: d => { this.detail.set(d); this.isDetailLoading.set(false); },
      error: () => { this.toastService.error('Error al cargar detalle'); this.isDetailLoading.set(false); }
    });
  }

  onConfirm(id: string) {
    this.isActioning.set(true);
    this.orderService.confirm(id).subscribe({
      next: d => { this.toastService.success('Orden confirmada'); this.detail.set(d); this.refreshTrigger.update(v => v + 1); this.isActioning.set(false); },
      error: (err: any) => { this.toastService.error(err?.error?.message || 'Error al confirmar'); this.isActioning.set(false); }
    });
  }

  onReceive(id: string) {
    this.isActioning.set(true);
    this.orderService.receive(id).subscribe({
      next: d => { this.toastService.success('Mercadería recibida. Stock actualizado.'); this.detail.set(d); this.refreshTrigger.update(v => v + 1); this.isActioning.set(false); },
      error: (err: any) => { this.toastService.error(err?.error?.message || 'Error al recibir'); this.isActioning.set(false); }
    });
  }

  confirmCancel() {
    const id = this.actionTargetId(); if (!id) return;
    this.isActioning.set(true);
    this.orderService.cancel(id).subscribe({
      next: () => { this.toastService.success('Orden cancelada'); this.refreshTrigger.update(v => v + 1); this.isActioning.set(false); this.isCancelModalOpen.set(false); this.isDetailOpen.set(false); },
      error: (err: any) => { this.toastService.error(err?.error?.message || 'Error'); this.isActioning.set(false); }
    });
  }

  confirmDelete() {
    const id = this.actionTargetId(); if (!id) return;
    this.isActioning.set(true);
    this.orderService.remove(id).subscribe({
      next: () => { this.toastService.success('Orden eliminada'); this.refreshTrigger.update(v => v + 1); this.isActioning.set(false); this.isDeleteModalOpen.set(false); },
      error: (err: any) => { this.toastService.error(err?.error?.message || 'Error al eliminar'); this.isActioning.set(false); }
    });
  }
}
