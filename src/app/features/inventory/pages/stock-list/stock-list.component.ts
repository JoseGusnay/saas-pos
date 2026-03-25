import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, debounceTime, tap, of, catchError } from 'rxjs';

import { StockService } from '../../../../core/services/stock.service';
import { BranchService } from '../../../../core/services/branch.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StockLevel, StockMovement, MovementType } from '../../../../core/models/stock.models';
import { Branch } from '../../../../core/models/branch.models';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { ActionsMenuComponent, ActionItem } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/ui/custom-select/custom-select.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideWarehouse, lucideArrowUpDown, lucideAlertTriangle, lucideClipboardList,
  lucideSearch, lucidePackage,
  lucideChevronRight, lucideArrowUp, lucideArrowDown,
  lucideCheckCircle2, lucideXCircle
} from '@ng-icons/lucide';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    ListToolbarComponent,
    PaginationComponent,
    DrawerComponent,
    FormButtonComponent,
    SkeletonComponent,
    EmptyStateComponent,
    SpinnerComponent,
    ActionsMenuComponent,
    CustomSelectComponent,
    NgIconComponent
  ],
  providers: [
    provideIcons({
      lucideWarehouse, lucideArrowUpDown, lucideAlertTriangle, lucideClipboardList,
      lucideSearch, lucidePackage,
      lucideChevronRight, lucideArrowUp, lucideArrowDown,
      lucideCheckCircle2, lucideXCircle
    })
  ],
  template: `
    <div class="stock-page">
      <app-page-header
        title="Inventario / Stock"
        [tabs]="stockTabs"
        [activeTab]="activeTab()"
        (tabChange)="onTabChange($event)"
      ></app-page-header>

      <!-- ─── Tab: Niveles ──────────────────────────────────────────── -->
      @if (activeTab() === 'Niveles') {
        <app-list-toolbar
          searchPlaceholder="Buscar producto o SKU..."
          [searchQuery]="searchQuery()"
          [activeFiltersCount]="activeFiltersCount()"
          [viewMode]="viewModePreference()"
          (searchChange)="onSearch($event)"
          (clearFilters)="clearFilters()"
          (viewModeChange)="viewModePreference.set($event)"
        ></app-list-toolbar>
        <div class="toolbar-extras">
          <div class="toolbar-filter">
            <ng-icon name="lucideWarehouse" size="14"></ng-icon>
            <span class="toolbar-filter__label">Sucursal</span>
            <app-custom-select
              size="sm"
              [options]="branchOptions()"
              [value]="selectedBranchId"
              (valueChange)="onBranchChange($event)"
            ></app-custom-select>
          </div>
          <label class="low-stock-toggle">
            <input type="checkbox" [ngModel]="showLowStock()" (ngModelChange)="showLowStock.set($event)" />
            Solo bajo stock
          </label>
        </div>

        <div [ngClass]="viewMode() === 'grid' ? 'stock-page__grid' : 'stock-page__list'">
          @if (isLoading()) {
            @for (n of [1,2,3,4,5,6]; track n) {
              @if (viewMode() === 'grid') {
                <div class="stock-card skeleton-card">
                  <div class="stock-card__header">
                    <div style="display:flex;flex-direction:column;gap:4px">
                      <app-skeleton width="160px" height="1rem"></app-skeleton>
                      <app-skeleton width="120px" height="0.875rem"></app-skeleton>
                    </div>
                    <app-skeleton width="32px" height="32px" shape="circle"></app-skeleton>
                  </div>
                  <div class="stock-card__qty-skeleton">
                    <app-skeleton width="80px" height="2.5rem"></app-skeleton>
                  </div>
                  <div class="stock-card__footer">
                    <app-skeleton width="80px" height="22px" radius="99px"></app-skeleton>
                    <app-skeleton width="100px" height="0.875rem"></app-skeleton>
                  </div>
                </div>
              } @else {
                <div class="stock-row skeleton-row">
                  <app-skeleton width="44px" height="44px" radius="8px"></app-skeleton>
                  <div style="flex:1;display:flex;flex-direction:column;gap:4px">
                    <app-skeleton width="200px" height="1rem"></app-skeleton>
                    <app-skeleton width="120px" height="0.875rem"></app-skeleton>
                  </div>
                  <app-skeleton width="60px" height="1.5rem" radius="99px"></app-skeleton>
                  <app-skeleton width="32px" height="32px" shape="circle"></app-skeleton>
                </div>
              }
            }
          } @else if (levels().length > 0) {
            @for (level of levels(); track level.id) {
              @if (viewMode() === 'grid') {
                <div class="stock-card" [class]="'stock-card--' + getLevelStatus(level)" (click)="openKardex(level)">
                  <div class="stock-card__header">
                    <div class="stock-card__info">
                      <span class="stock-card__product">{{ level.productName }}</span>
                      <span class="stock-card__variant">{{ level.variantName }}</span>
                      <span class="stock-card__sku">{{ level.sku }}</span>
                    </div>
                    <div (click)="$event.stopPropagation()">
                      <app-actions-menu
                        [actions]="levelActions"
                        (actionClick)="handleLevelAction($event, level)"
                      ></app-actions-menu>
                    </div>
                  </div>
                  <div class="stock-card__qty">
                    <span class="qty-number" [class]="'qty--' + getLevelStatus(level)">{{ level.quantity }}</span>
                    <span class="qty-unit">uds.</span>
                  </div>
                  <div class="stock-card__footer">
                    <span class="badge-alert" [class]="getLevelStatus(level)">{{ getLevelStatusLabel(level) }}</span>
                    <span class="stock-card__branch">
                      <ng-icon name="lucideWarehouse" size="12"></ng-icon>
                      {{ level.branchName }}
                    </span>
                  </div>
                  @if (level.minimumStock != null || level.maximumStock != null) {
                    <div class="stock-card__minmax">
                      @if (level.minimumStock != null) { <span>Mín: {{ level.minimumStock }}</span> }
                      @if (level.maximumStock != null) { <span>Máx: {{ level.maximumStock }}</span> }
                    </div>
                  }
                </div>
              } @else {
                <div class="stock-row" (click)="openKardex(level)">
                  <div class="stock-row__avatar" [class]="'avatar--' + getLevelStatus(level)">
                    <ng-icon name="lucidePackage" size="20"></ng-icon>
                  </div>
                  <div class="stock-row__info">
                    <span class="row-product">{{ level.productName }}</span>
                    <span class="row-sub">{{ level.variantName }} · {{ level.sku }}</span>
                  </div>
                  <div class="stock-row__branch">
                    <ng-icon name="lucideWarehouse" size="14"></ng-icon>
                    {{ level.branchName }}
                  </div>
                  <div class="stock-row__qty">
                    <span class="qty-number" [class]="'qty--' + getLevelStatus(level)">{{ level.quantity }}</span>
                    <span class="qty-unit">uds.</span>
                  </div>
                  <span class="badge-alert" [class]="getLevelStatus(level)">{{ getLevelStatusLabel(level) }}</span>
                  <div class="stock-row__actions" (click)="$event.stopPropagation()">
                    <app-actions-menu
                      [actions]="levelActions"
                      (actionClick)="handleLevelAction($event, level)"
                    ></app-actions-menu>
                  </div>
                </div>
              }
            }
          } @else {
            <div class="stock-page__empty">
              <app-empty-state
                [icon]="activeFiltersCount() > 0 || searchQuery() ? 'lucideSearch' : 'lucidePackage'"
                [title]="activeFiltersCount() > 0 || searchQuery() ? 'No encontramos lo que buscas' : 'Sin niveles de stock'"
                [description]="activeFiltersCount() > 0 || searchQuery() ? 'Intenta con otros términos o ajusta los filtros.' : 'Inicializa el stock de tus productos para empezar a gestionarlo.'"
                [actionLabel]="activeFiltersCount() > 0 || searchQuery() ? 'Limpiar Filtros' : undefined"
                (action)="clearFilters()"
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
      }

      <!-- ─── Tab: Movimientos ──────────────────────────────────────── -->
      @if (activeTab() === 'Movimientos') {
        <app-list-toolbar
          searchPlaceholder="Buscar producto o SKU..."
          [searchQuery]="movSearchQuery()"
          [activeFiltersCount]="0"
          [viewMode]="'list'"
          [showViewToggle]="false"
          (searchChange)="onMovSearch($event)"
        ></app-list-toolbar>
        <div class="toolbar-extras">
          <div class="toolbar-filter">
            <ng-icon name="lucideWarehouse" size="14"></ng-icon>
            <span class="toolbar-filter__label">Sucursal</span>
            <app-custom-select
              size="sm"
              [options]="branchOptions()"
              [value]="movBranchId()"
              (valueChange)="movBranchId.set($event); movPage.set(1)"
            ></app-custom-select>
          </div>
          <div class="toolbar-filter">
            <ng-icon name="lucideArrowUpDown" size="14"></ng-icon>
            <span class="toolbar-filter__label">Tipo</span>
            <app-custom-select
              size="sm"
              [options]="movTypeOptions"
              [value]="movTypeFilter()"
              (valueChange)="movTypeFilter.set($event); movPage.set(1)"
            ></app-custom-select>
          </div>
        </div>

        <div class="stock-page__list">
          @if (isMovLoading()) {
            @for (n of [1,2,3,4,5]; track n) {
              <div class="movement-row skeleton-row">
                <app-skeleton width="70px" height="24px" radius="6px"></app-skeleton>
                <div style="flex:1;display:flex;flex-direction:column;gap:4px">
                  <app-skeleton width="200px" height="1rem"></app-skeleton>
                  <app-skeleton width="140px" height="0.875rem"></app-skeleton>
                </div>
                <app-skeleton width="60px" height="1.25rem"></app-skeleton>
                <app-skeleton width="110px" height="0.875rem"></app-skeleton>
              </div>
            }
          } @else if (movements().length > 0) {
            @for (mov of movements(); track mov.id) {
              <div class="movement-row">
                <span class="badge-movement" [class]="'type--' + mov.type">{{ getMovTypeLabel(mov.type) }}</span>
                <div class="movement-info">
                  <span class="movement-product">{{ mov.productName }} — {{ mov.variantName }}</span>
                  <span class="movement-sub">{{ mov.branchName }} · {{ mov.sku }}</span>
                </div>
                <div class="movement-change" [class]="isOutType(mov.type) ? 'out' : 'in'">
                  <ng-icon [name]="isOutType(mov.type) ? 'lucideArrowDown' : 'lucideArrowUp'" size="14"></ng-icon>
                  {{ mov.quantity }}
                </div>
                <div class="movement-stock">
                  <span>{{ mov.stockBefore }}</span>
                  <ng-icon name="lucideChevronRight" size="12"></ng-icon>
                  <span class="stock-after">{{ mov.stockAfter }}</span>
                </div>
                <div class="movement-meta">
                  <span>{{ mov.userName || 'Sistema' }}</span>
                  <span>{{ mov.createdAt | date:'dd/MM/yy HH:mm' }}</span>
                </div>
              </div>
            }
          } @else {
            <div class="stock-page__empty">
              <app-empty-state icon="lucideClipboardList" title="Sin movimientos" description="No hay movimientos registrados para los filtros aplicados."></app-empty-state>
            </div>
          }
        </div>

        <app-pagination
          [totalItems]="movTotalItems()"
          [pageSize]="movPageSize()"
          [currentPage]="movPage()"
          (pageChange)="movPage.set($event)"
        ></app-pagination>
      }

      <!-- ─── Tab: Alertas ──────────────────────────────────────────── -->
      @if (activeTab() === 'Alertas') {
        <div class="alerts-toolbar">
          <div class="toolbar-filter">
            <ng-icon name="lucideWarehouse" size="14"></ng-icon>
            <span class="toolbar-filter__label">Sucursal</span>
            <app-custom-select
              size="sm"
              [options]="branchOptions()"
              [value]="alertBranchId()"
              (valueChange)="alertBranchId.set($event)"
            ></app-custom-select>
          </div>
          <span class="alerts-count" [class]="alerts().length > 0 ? 'has-alerts' : ''">
            {{ alerts().length }} alerta{{ alerts().length !== 1 ? 's' : '' }}
          </span>
        </div>

        @if (isAlertLoading()) {
          <div class="stock-page__grid">
            @for (n of [1,2,3]; track n) {
              <div class="stock-card skeleton-card">
                <app-skeleton width="100%" height="120px" radius="12px"></app-skeleton>
              </div>
            }
          </div>
        } @else if (alerts().length > 0) {
          <div class="stock-page__grid">
            @for (alert of alerts(); track alert.variantId + alert.branchId) {
              <div class="alert-card" [class]="'alert-card--' + alert.alertLevel">
                <div class="alert-card__header">
                  <div class="alert-icon" [class]="'icon--' + alert.alertLevel">
                    <ng-icon [name]="alert.alertLevel === 'OUT_OF_STOCK' ? 'lucideXCircle' : 'lucideAlertTriangle'" size="20"></ng-icon>
                  </div>
                  <div class="alert-info">
                    <span class="alert-product">{{ alert.productName }}</span>
                    <span class="alert-variant">{{ alert.variantName }} · {{ alert.sku }}</span>
                  </div>
                </div>
                <div class="alert-card__body">
                  <div class="alert-qty">
                    <span class="qty-label">Stock actual</span>
                    <span class="qty-val" [class]="'qty--' + alert.alertLevel">{{ alert.quantity }}</span>
                  </div>
                  @if (alert.minimumStock != null) {
                    <div class="alert-qty">
                      <span class="qty-label">Mínimo</span>
                      <span class="qty-val">{{ alert.minimumStock }}</span>
                    </div>
                  }
                </div>
                <div class="alert-card__footer">
                  <span class="badge-alert" [class]="alert.alertLevel === 'OUT_OF_STOCK' ? 'out-of-stock' : 'low-stock'">
                    {{ alert.alertLevel === 'OUT_OF_STOCK' ? 'Sin stock' : 'Stock bajo' }}
                  </span>
                  <span class="alert-branch">
                    <ng-icon name="lucideWarehouse" size="12"></ng-icon>
                    {{ alert.branchName }}
                  </span>
                </div>
                <button class="btn btn-sm btn-primary alert-action" (click)="openAdjustFromAlert(alert)">
                  <ng-icon name="lucideArrowUpDown" size="14"></ng-icon>
                  Ajustar
                </button>
              </div>
            }
          </div>
        } @else {
          <div class="stock-page__empty">
            <app-empty-state
              icon="lucideCheckCircle2"
              title="Sin alertas activas"
              description="Todos los productos tienen niveles de stock aceptables."
            ></app-empty-state>
          </div>
        }
      }

      <!-- ─── Drawer: Kardex ────────────────────────────────────────── -->
      <app-drawer
        [isOpen]="isKardexOpen()"
        title="Historial de Movimientos"
        (close)="isKardexOpen.set(false)"
        size="md"
      >
        <div drawerBody>
          @if (selectedLevel()) {
            <div class="kardex-header">
              <span class="kardex-product">{{ selectedLevel()!.productName }}</span>
              <span class="kardex-variant">{{ selectedLevel()!.variantName }} · {{ selectedLevel()!.sku }}</span>
              <span class="kardex-branch">
                <ng-icon name="lucideWarehouse" size="14"></ng-icon>
                {{ selectedLevel()!.branchName }}
              </span>
            </div>
          }
          @if (isKardexLoading()) {
            <app-spinner></app-spinner>
          } @else if (kardexMovements().length > 0) {
            <div class="kardex-list">
              @for (mov of kardexMovements(); track mov.id) {
                <div class="kardex-item">
                  <div class="kardex-item__type">
                    <span class="badge-movement" [class]="'type--' + mov.type">{{ getMovTypeLabel(mov.type) }}</span>
                  </div>
                  <div class="kardex-item__detail">
                    <div class="kardex-item__change" [class]="isOutType(mov.type) ? 'out' : 'in'">
                      <ng-icon [name]="isOutType(mov.type) ? 'lucideArrowDown' : 'lucideArrowUp'" size="14"></ng-icon>
                      {{ isOutType(mov.type) ? '-' : '+' }}{{ mov.quantity }}
                    </div>
                    <div class="kardex-item__stock">
                      {{ mov.stockBefore }}
                      <ng-icon name="lucideChevronRight" size="12"></ng-icon>
                      <strong>{{ mov.stockAfter }}</strong>
                    </div>
                    @if (mov.notes) {
                      <span class="kardex-item__notes">{{ mov.notes }}</span>
                    }
                  </div>
                  <div class="kardex-item__meta">
                    <span>{{ mov.userName || 'Sistema' }}</span>
                    <span>{{ mov.createdAt | date:'dd/MM/yy HH:mm' }}</span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="kardex-empty">
              <app-empty-state icon="lucideClipboardList" title="Sin movimientos" description="Este producto no tiene movimientos registrados."></app-empty-state>
            </div>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <button class="btn btn-primary" (click)="openAdjust(selectedLevel()!)">
            <ng-icon name="lucideArrowUpDown" size="16"></ng-icon>
            Ajustar Stock
          </button>
        </div>
      </app-drawer>

      <!-- ─── Drawer: Ajustar Stock ─────────────────────────────────── -->
      <app-drawer
        [isOpen]="isAdjustOpen()"
        title="Ajustar Stock"
        (close)="isAdjustOpen.set(false)"
        size="sm"
      >
        <div drawerBody>
          @if (adjustTarget()) {
            <div class="adjust-info">
              <div class="adjust-product">
                <span class="label">Producto</span>
                <span>{{ adjustTarget()!.productName }} — {{ adjustTarget()!.variantName }}</span>
              </div>
              <div class="adjust-product">
                <span class="label">Sucursal</span>
                <span>{{ adjustTarget()!.branchName }}</span>
              </div>
              <div class="adjust-current">
                <span class="label">Stock actual</span>
                <span class="current-qty" [class]="'qty--' + getLevelStatus(adjustTarget()!)">{{ adjustTarget()!.quantity }}</span>
              </div>
            </div>

            <div class="adjust-form">
              <div class="form-group">
                <label for="newQty">Nueva cantidad *</label>
                <input
                  id="newQty"
                  type="number"
                  class="form-control"
                  min="0"
                  [(ngModel)]="adjustNewQty"
                  placeholder="0"
                />
                @if (adjustNewQty !== null && adjustNewQty !== adjustTarget()!.quantity) {
                  <span class="qty-diff" [class]="adjustNewQty > adjustTarget()!.quantity ? 'diff-up' : 'diff-down'">
                    {{ adjustNewQty > adjustTarget()!.quantity ? '+' : '' }}{{ adjustNewQty - adjustTarget()!.quantity }} unidades
                  </span>
                }
              </div>
              <div class="form-group">
                <label for="adjustNotes">Motivo / Notas</label>
                <textarea
                  id="adjustNotes"
                  class="form-control"
                  rows="3"
                  [(ngModel)]="adjustNotes"
                  placeholder="Ej: Conteo físico, merma, reposición..."
                ></textarea>
              </div>
            </div>
          }
        </div>
        <div drawerFooter class="drawer-footer-actions">
          <app-form-button label="Cancelar" variant="secondary" [disabled]="isAdjusting()" (click)="isAdjustOpen.set(false)"></app-form-button>
          <app-form-button
            label="Guardar Ajuste"
            loadingLabel="Guardando..."
            icon="lucideArrowUpDown"
            [loading]="isAdjusting()"
            [disabled]="isAdjusting() || adjustNewQty === null || adjustNewQty < 0 || adjustNewQty === adjustTarget()?.quantity"
            (click)="confirmAdjust()"
          ></app-form-button>
        </div>
      </app-drawer>
    </div>
  `,
  styles: [`
    .stock-page { display: flex; flex-direction: column; min-height: 100%; width: 100%; padding: 24px 32px 32px; }
    @media (max-width: 768px) { .stock-page { padding: 20px 16px 24px; } }
    .stock-page__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem; }
    .stock-page__list { display: flex; flex-direction: column; gap: 0.75rem; }
    .stock-page__empty { grid-column: 1 / -1; display: flex; justify-content: center; width: 100%; padding: 4rem 1rem; }

    /* Toolbar extras */
    .toolbar-extras { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; padding: 0.25rem 0; }
    .toolbar-filter {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: var(--font-size-sm); color: var(--color-text-muted);
    }
    .toolbar-filter__label { font-weight: var(--font-weight-medium); white-space: nowrap; }
    .toolbar-filter app-custom-select { width: 200px; }
    .low-stock-toggle { display: flex; align-items: center; gap: 0.375rem; font-size: var(--font-size-sm); color: var(--color-text-muted); cursor: pointer; }

    /* Stock Card (grid) */
    .stock-card {
      background: var(--color-bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border-light);
      padding: 1.25rem; display: flex; flex-direction: column; gap: 0.875rem;
      box-shadow: var(--shadow-sm); cursor: pointer;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
      position: relative; z-index: 1;
    }
    .stock-card:hover { border-color: var(--color-border-hover); box-shadow: var(--shadow-md); background: var(--color-bg-hover); z-index: 10; }
    .stock-card--out-of-stock { border-left: 3px solid var(--color-danger); }
    .stock-card--low-stock { border-left: 3px solid var(--color-warning, #f59e0b); }
    .stock-card--ok { border-left: 3px solid var(--color-success); }
    .skeleton-card { height: 180px; pointer-events: none; }

    .stock-card__header { display: flex; justify-content: space-between; align-items: flex-start; }
    .stock-card__info { display: flex; flex-direction: column; gap: 2px; }
    .stock-card__product { font-weight: var(--font-weight-semibold); color: var(--color-text-main); font-size: var(--font-size-sm); }
    .stock-card__variant { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .stock-card__sku { font-size: var(--font-size-xs); color: var(--color-text-faint, var(--color-text-muted)); font-family: monospace; }

    .stock-card__qty { display: flex; align-items: baseline; gap: 0.375rem; }
    .qty-number { font-size: 2rem; font-weight: var(--font-weight-bold); line-height: 1; }
    .qty-number.qty--ok { color: var(--color-success-text, var(--color-success)); }
    .qty-number.qty--low-stock { color: var(--color-warning-text, #b45309); }
    .qty-number.qty--out-of-stock { color: var(--color-danger-text, var(--color-danger)); }
    .qty-unit { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .stock-card__qty-skeleton { padding: 0.25rem 0; }

    .stock-card__footer { display: flex; align-items: center; justify-content: space-between; }
    .stock-card__branch { display: flex; align-items: center; gap: 0.25rem; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .stock-card__minmax { display: flex; gap: 0.75rem; font-size: var(--font-size-xs); color: var(--color-text-muted); border-top: 1px solid var(--color-border-subtle); padding-top: 0.5rem; }

    /* Alert badges */
    .badge-alert { padding: 0.2rem 0.625rem; border-radius: 99px; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }
    .badge-alert.ok { background: var(--color-success-bg); color: var(--color-success-text); }
    .badge-alert.low-stock { background: var(--color-warning-bg, #fef3c7); color: var(--color-warning-text, #92400e); }
    .badge-alert.out-of-stock { background: var(--color-danger-bg); color: var(--color-danger-text); }

    /* Stock Row (list view) */
    .stock-row {
      display: flex; align-items: center; gap: 1rem; padding: 0.875rem 1.25rem;
      background: var(--color-bg-surface); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg); cursor: pointer;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
      position: relative; z-index: 1;
    }
    .stock-row:hover { border-color: var(--color-border-hover); box-shadow: var(--shadow-md); background: var(--color-bg-hover); z-index: 10; }
    .stock-row:has(.actions-menu-open) { z-index: 50; }
    .skeleton-row { pointer-events: none; }

    .stock-row__avatar {
      width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .stock-row__avatar.avatar--ok { background: var(--color-success-bg); color: var(--color-success-text); }
    .stock-row__avatar.avatar--low-stock { background: var(--color-warning-bg, #fef3c7); color: var(--color-warning-text, #92400e); }
    .stock-row__avatar.avatar--out-of-stock { background: var(--color-danger-bg); color: var(--color-danger-text); }
    .stock-row__info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .row-product { font-weight: var(--font-weight-semibold); color: var(--color-text-main); font-size: var(--font-size-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row-sub { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .stock-row__branch { display: flex; align-items: center; gap: 0.25rem; font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }
    .stock-row__qty { display: flex; align-items: baseline; gap: 0.25rem; }
    .stock-row__actions { flex-shrink: 0; }

    /* Movement Row */
    .movement-row {
      display: flex; align-items: center; gap: 1rem; padding: 0.875rem 1.25rem;
      background: var(--color-bg-surface); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
    }
    .badge-movement {
      padding: 0.2rem 0.625rem; border-radius: 6px; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold);
      white-space: nowrap; flex-shrink: 0;
    }
    .badge-movement.type--INITIAL    { background: var(--color-info-bg); color: var(--color-info-text); }
    .badge-movement.type--PURCHASE   { background: #dcfce7; color: #15803d; }
    .badge-movement.type--SALE       { background: #ffedd5; color: #c2410c; }
    .badge-movement.type--ADJUSTMENT { background: #f3e8ff; color: #7e22ce; }
    .badge-movement.type--LOSS       { background: var(--color-danger-bg); color: var(--color-danger-text); }
    .badge-movement.type--TRANSFER_IN  { background: #e0f2fe; color: #0369a1; }
    .badge-movement.type--TRANSFER_OUT { background: #fce7f3; color: #be185d; }
    .badge-movement.type--RETURN     { background: #d1fae5; color: #065f46; }

    .movement-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .movement-product { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-main); }
    .movement-sub { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .movement-change { display: flex; align-items: center; gap: 0.25rem; font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm); }
    .movement-change.in  { color: var(--color-success-text); }
    .movement-change.out { color: var(--color-danger-text); }
    .movement-stock { display: flex; align-items: center; gap: 0.25rem; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .stock-after { font-weight: var(--font-weight-semibold); color: var(--color-text-main); }
    .movement-meta { display: flex; flex-direction: column; gap: 2px; font-size: var(--font-size-xs); color: var(--color-text-muted); text-align: right; flex-shrink: 0; }

    /* Alerts Tab */
    .alerts-toolbar { display: flex; align-items: center; gap: 1rem; padding: 1rem 0; }
    .alerts-count { font-size: var(--font-size-sm); color: var(--color-text-muted); padding: 0.25rem 0.75rem; border-radius: 99px; background: var(--color-bg-subtle); }
    .alerts-count.has-alerts { background: var(--color-danger-bg); color: var(--color-danger-text); font-weight: var(--font-weight-semibold); }

    .alert-card {
      background: var(--color-bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border-light);
      padding: 1.25rem; display: flex; flex-direction: column; gap: 0.875rem; box-shadow: var(--shadow-sm);
    }
    .alert-card--OUT_OF_STOCK { border-left: 3px solid var(--color-danger); }
    .alert-card--LOW_STOCK    { border-left: 3px solid var(--color-warning, #f59e0b); }
    .alert-card__header { display: flex; align-items: flex-start; gap: 0.75rem; }
    .alert-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .alert-icon.icon--OUT_OF_STOCK { background: var(--color-danger-bg); color: var(--color-danger-text); }
    .alert-icon.icon--LOW_STOCK    { background: var(--color-warning-bg, #fef3c7); color: var(--color-warning-text, #92400e); }
    .alert-info { display: flex; flex-direction: column; gap: 2px; }
    .alert-product { font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm); color: var(--color-text-main); }
    .alert-variant { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .alert-card__body { display: flex; gap: 1.5rem; }
    .alert-qty { display: flex; flex-direction: column; gap: 2px; }
    .qty-label { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .qty-val { font-size: 1.25rem; font-weight: var(--font-weight-bold); }
    .qty-val.qty--OUT_OF_STOCK { color: var(--color-danger-text); }
    .qty-val.qty--LOW_STOCK    { color: var(--color-warning-text, #b45309); }
    .alert-card__footer { display: flex; align-items: center; justify-content: space-between; }
    .alert-branch { display: flex; align-items: center; gap: 0.25rem; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .alert-action { align-self: stretch; display: flex; align-items: center; justify-content: center; gap: 0.375rem; }

    /* Kardex Drawer */
    .kardex-header { display: flex; flex-direction: column; gap: 4px; padding: 1rem; background: var(--color-bg-subtle); border-radius: var(--radius-md); margin-bottom: 1rem; }
    .kardex-product { font-weight: var(--font-weight-semibold); color: var(--color-text-main); }
    .kardex-variant { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .kardex-branch { display: flex; align-items: center; gap: 0.25rem; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .kardex-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .kardex-empty { padding: 2rem 0; }

    .kardex-item {
      display: flex; align-items: flex-start; gap: 0.875rem; padding: 0.875rem;
      border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md);
      background: var(--color-bg-surface);
    }
    .kardex-item__type { flex-shrink: 0; }
    .kardex-item__detail { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .kardex-item__change { display: flex; align-items: center; gap: 0.25rem; font-weight: var(--font-weight-semibold); }
    .kardex-item__change.in  { color: var(--color-success-text); }
    .kardex-item__change.out { color: var(--color-danger-text); }
    .kardex-item__stock { display: flex; align-items: center; gap: 0.25rem; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .kardex-item__notes { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; }
    .kardex-item__meta { display: flex; flex-direction: column; gap: 2px; font-size: var(--font-size-xs); color: var(--color-text-muted); text-align: right; flex-shrink: 0; }

    /* Adjust Drawer */
    .adjust-info { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; background: var(--color-bg-subtle); border-radius: var(--radius-md); margin-bottom: 1.5rem; }
    .adjust-product { display: flex; flex-direction: column; gap: 2px; }
    .adjust-product .label { font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .adjust-current { display: flex; align-items: center; justify-content: space-between; }
    .adjust-current .label { font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .current-qty { font-size: 1.75rem; font-weight: var(--font-weight-bold); }
    .adjust-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .form-group label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-main); }
    .form-control { padding: 0.5rem 0.75rem; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); background: var(--color-bg-surface); color: var(--color-text-main); font-size: var(--font-size-sm); }
    .form-control:focus { outline: none; border-color: var(--color-accent-primary); box-shadow: 0 0 0 3px var(--color-accent-primary-alpha, rgba(99,102,241,0.15)); }
    .qty-diff { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); margin-top: 0.25rem; }
    .qty-diff.diff-up   { color: var(--color-success-text); }
    .qty-diff.diff-down { color: var(--color-danger-text); }

    .drawer-footer-actions {
      display: flex; justify-content: flex-end; gap: 12px; width: 100%;
      @media (max-width: 768px) { flex-direction: column-reverse; ::ng-deep .btn { width: 100%; } }
    }
    .btn-sm { padding: 0.375rem 0.75rem; font-size: var(--font-size-sm); }
  `]
})
export class StockListComponent {
  private stockService = inject(StockService);
  private branchService = inject(BranchService);
  private toastService = inject(ToastService);

  stockTabs = [
    { label: 'Niveles', value: 'Niveles' },
    { label: 'Movimientos', value: 'Movimientos' },
    { label: 'Alertas', value: 'Alertas' }
  ];

  levelActions: ActionItem[] = [
    { id: 'adjust',  label: 'Ajustar Stock', icon: 'lucideArrowUpDown' },
    { id: 'kardex',  label: 'Ver Kardex',    icon: 'lucideClipboardList' }
  ];

  movementTypes = [
    { value: 'INITIAL',      label: 'Inicial' },
    { value: 'PURCHASE',     label: 'Compra' },
    { value: 'SALE',         label: 'Venta' },
    { value: 'ADJUSTMENT',   label: 'Ajuste' },
    { value: 'LOSS',         label: 'Pérdida' },
    { value: 'TRANSFER_IN',  label: 'Transferencia entrada' },
    { value: 'TRANSFER_OUT', label: 'Transferencia salida' },
    { value: 'RETURN',       label: 'Devolución' }
  ];

  // ─── State ────────────────────────────────────────────────────────────────

  activeTab         = signal('Niveles');
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile          = signal(false);
  viewMode          = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());

  searchQuery    = signal('');
  selectedBranchId = '';
  branchIdFilter  = signal('');
  showLowStock   = signal(false);
  currentPage    = signal(1);
  pageSize       = signal(12);
  refreshTrigger = signal(0);
  isLoading      = signal(true);

  movSearchQuery = signal('');
  movBranchId    = signal('');
  movTypeFilter  = signal('');
  movPage        = signal(1);
  movPageSize    = signal(20);
  isMovLoading   = signal(true);

  alertBranchId  = signal('');
  alertRefresh   = signal(0);
  isAlertLoading = signal(false);

  isKardexOpen    = signal(false);
  isKardexLoading = signal(false);
  selectedLevel   = signal<StockLevel | null>(null);
  kardexMovements = signal<StockMovement[]>([]);

  isAdjustOpen  = signal(false);
  isAdjusting   = signal(false);
  adjustTarget  = signal<StockLevel | null>(null);
  adjustNewQty: number | null = null;
  adjustNotes = '';

  // ─── Branches ─────────────────────────────────────────────────────────────

  private branchesResponse = toSignal(
    this.branchService.findAll({ limit: 100 }),
    { initialValue: { data: [] as any[], total: 0 } }
  );
  branches = computed<Branch[]>(() => (this.branchesResponse() as any)?.data ?? []);
  branchOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Todas las sucursales' },
    ...this.branches().map(b => ({ value: b.id, label: b.name }))
  ]);
  movTypeOptions: SelectOption[] = [
    { value: '', label: 'Todos los tipos' },
    ...this.movementTypes.map(mt => ({ value: mt.value, label: mt.label }))
  ];

  // ─── Levels reactive stream ───────────────────────────────────────────────

  private readonly levelsResponse = toSignal(
    toObservable(computed(() => ({
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchQuery(),
      branchId: this.branchIdFilter(),
      lowStock: this.showLowStock(),
      refresh: this.refreshTrigger(),
      tab: this.activeTab()
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        if (params.tab !== 'Niveles') { this.isLoading.set(false); return of(null); }
        return this.stockService.getLevels(params).pipe(tap(() => this.isLoading.set(false)));
      })
    )
  );

  levels     = computed(() => (this.levelsResponse() as any)?.data  ?? []);
  totalItems = computed(() => (this.levelsResponse() as any)?.total ?? 0);

  // ─── Movements reactive stream ────────────────────────────────────────────

  private readonly movementsResponse = toSignal(
    toObservable(computed(() => ({
      page: this.movPage(),
      limit: this.movPageSize(),
      search: this.movSearchQuery(),
      branchId: this.movBranchId(),
      type: this.movTypeFilter(),
      tab: this.activeTab()
    }))).pipe(
      debounceTime(300),
      tap(() => this.isMovLoading.set(true)),
      switchMap(params => {
        if (params.tab !== 'Movimientos') { this.isMovLoading.set(false); return of(null); }
        return this.stockService.getMovements(params).pipe(tap(() => this.isMovLoading.set(false)));
      })
    )
  );

  movements     = computed(() => (this.movementsResponse() as any)?.data  ?? []);
  movTotalItems = computed(() => (this.movementsResponse() as any)?.total ?? 0);

  // ─── Alerts reactive stream ───────────────────────────────────────────────

  private readonly alertsResponse = toSignal(
    toObservable(computed(() => ({
      branchId: this.alertBranchId(),
      refresh: this.alertRefresh(),
      tab: this.activeTab()
    }))).pipe(
      debounceTime(200),
      tap(() => this.isAlertLoading.set(true)),
      switchMap(params => {
        if (params.tab !== 'Alertas') { this.isAlertLoading.set(false); return of([]); }
        return this.stockService.getAlerts(params.branchId || undefined).pipe(
          tap(() => this.isAlertLoading.set(false)),
          catchError(() => { this.isAlertLoading.set(false); return of([]); })
        );
      })
    )
  );

  alerts = computed<any[]>(() => (this.alertsResponse() as any) ?? []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  getLevelStatus(level: StockLevel): string {
    if (level.quantity === 0) return 'out-of-stock';
    if (level.minimumStock != null && level.quantity <= level.minimumStock) return 'low-stock';
    return 'ok';
  }

  getLevelStatusLabel(level: StockLevel): string {
    const s = this.getLevelStatus(level);
    if (s === 'out-of-stock') return 'Sin stock';
    if (s === 'low-stock')    return 'Stock bajo';
    return 'OK';
  }

  getMovTypeLabel(type: MovementType): string {
    return this.movementTypes.find(m => m.value === type)?.label ?? type;
  }

  isOutType(type: MovementType): boolean {
    return ['SALE', 'LOSS', 'TRANSFER_OUT'].includes(type);
  }

  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.branchIdFilter()) count++;
    if (this.showLowStock()) count++;
    return count;
  });

  // ─── Events ───────────────────────────────────────────────────────────────

  onTabChange(tab: string) {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.movPage.set(1);
  }

  onSearch(q: string)     { this.searchQuery.set(q); this.currentPage.set(1); }
  onMovSearch(q: string)  { this.movSearchQuery.set(q); this.movPage.set(1); }
  onBranchChange(id: string) { this.branchIdFilter.set(id); this.currentPage.set(1); }

  clearFilters() {
    this.searchQuery.set('');
    this.branchIdFilter.set('');
    this.selectedBranchId = '';
    this.showLowStock.set(false);
    this.currentPage.set(1);
  }

  handleLevelAction(action: ActionItem, level: StockLevel) {
    if (action.id === 'adjust') this.openAdjust(level);
    if (action.id === 'kardex') this.openKardex(level);
  }

  openKardex(level: StockLevel) {
    this.selectedLevel.set(level);
    this.isKardexOpen.set(true);
    this.isKardexLoading.set(true);
    this.kardexMovements.set([]);
    this.stockService.getKardex(level.variantId, level.branchId).subscribe({
      next: res => { this.kardexMovements.set((res as any)?.data ?? res ?? []); this.isKardexLoading.set(false); },
      error: () => { this.toastService.error('Error al cargar el kardex'); this.isKardexLoading.set(false); }
    });
  }

  openAdjust(level: StockLevel) {
    this.isKardexOpen.set(false);
    this.adjustTarget.set(level);
    this.adjustNewQty = level.quantity;
    this.adjustNotes = '';
    this.isAdjustOpen.set(true);
  }

  openAdjustFromAlert(alert: any) {
    const fakeLevel: StockLevel = {
      id: '', variantId: alert.variantId, branchId: alert.branchId,
      quantity: alert.quantity, updatedAt: '',
      variantName: alert.variantName, sku: alert.sku, productId: alert.productId,
      productName: alert.productName, branchName: alert.branchName,
      minimumStock: alert.minimumStock, maximumStock: alert.maximumStock,
      stockTrackable: true
    };
    this.openAdjust(fakeLevel);
  }

  confirmAdjust() {
    const target = this.adjustTarget();
    if (!target || this.adjustNewQty === null || this.adjustNewQty < 0) return;
    this.isAdjusting.set(true);
    this.stockService.adjust({
      variantId: target.variantId,
      branchId:  target.branchId,
      newQuantity: this.adjustNewQty,
      notes: this.adjustNotes || undefined
    }).subscribe({
      next: () => {
        this.toastService.success('Stock ajustado correctamente');
        this.isAdjusting.set(false);
        this.isAdjustOpen.set(false);
        this.refreshTrigger.update(v => v + 1);
        this.alertRefresh.update(v => v + 1);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al ajustar el stock');
        this.isAdjusting.set(false);
      }
    });
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mq.matches);
      mq.addEventListener('change', e => this.isMobile.set(e.matches));
    }
  }
}
