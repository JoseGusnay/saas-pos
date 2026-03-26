import { Component, ChangeDetectionStrategy, computed, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, debounceTime, tap, of, catchError } from 'rxjs';

import { StockService } from '../../../../core/services/stock.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StockLevel, StockAlert, MovementType, LotStockEntry } from '../../../../core/models/stock.models';
import { Warehouse, Location } from '../../../../core/models/warehouse.models';

import { PageHeaderComponent } from '../../../../shared/components/list-ui/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../shared/components/list-ui/list-toolbar/list-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { ActionsMenuComponent, ActionItem } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/ui/custom-select/custom-select.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideWarehouse, lucideArrowUpDown, lucideAlertTriangle, lucideClipboardList,
  lucideSearch, lucidePackage, lucideBuilding2,
  lucideChevronRight, lucideArrowUp, lucideArrowDown,
  lucideCheckCircle2, lucideXCircle, lucideArrowLeftRight
} from '@ng-icons/lucide';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageHeaderComponent, ListToolbarComponent, PaginationComponent,
    DrawerComponent, FormButtonComponent, SkeletonComponent,
    EmptyStateComponent,
    ActionsMenuComponent, CustomSelectComponent, NgIconComponent
  ],
  providers: [
    provideIcons({
      lucideWarehouse, lucideArrowUpDown, lucideAlertTriangle, lucideClipboardList,
      lucideSearch, lucidePackage, lucideBuilding2,
      lucideChevronRight, lucideArrowUp, lucideArrowDown,
      lucideCheckCircle2, lucideXCircle, lucideArrowLeftRight
    })
  ],
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockListComponent {
  protected readonly Math = Math;
  private stockService = inject(StockService);
  private warehouseService = inject(WarehouseService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  stockTabs = [
    { label: 'Niveles', value: 'Niveles' },
    { label: 'Movimientos', value: 'Movimientos' },
    { label: 'Alertas', value: 'Alertas' }
  ];

  levelActions: ActionItem[] = [
    { id: 'adjust',   label: 'Ajustar Stock', icon: 'lucideArrowUpDown' },
    { id: 'transfer', label: 'Transferir',    icon: 'lucideArrowLeftRight' },
    { id: 'kardex',   label: 'Ver Kardex',    icon: 'lucideClipboardList' }
  ];

  movementTypes = [
    { value: 'INITIAL',      label: 'Inicial' },
    { value: 'PURCHASE',     label: 'Compra' },
    { value: 'SALE',         label: 'Venta' },
    { value: 'ADJUSTMENT',   label: 'Ajuste' },
    { value: 'LOSS',         label: 'Pérdida' },
    { value: 'TRANSFER_IN',  label: 'Transferencia entrada' },
    { value: 'TRANSFER_OUT', label: 'Transferencia salida' },
    { value: 'RETURN',         label: 'Devolución' },
    { value: 'PRODUCTION_IN',  label: 'Producción entrada' },
    { value: 'PRODUCTION_OUT', label: 'Producción salida' }
  ];

  // ─── Branch (sucursal) ────────────────────────────────────────────────────
  myBranches = signal<{ id: string; name: string; isMain: boolean }[]>([]);
  selectedBranchId = signal('');
  branchOptions = computed<SelectOption[]>(() => {
    const branches = this.myBranches();
    if (branches.length <= 1) return [];
    return [
      { value: '', label: 'Todas mis sucursales' },
      ...branches.map(b => ({ value: b.id, label: b.name + (b.isMain ? ' (Principal)' : '') })),
    ];
  });
  showBranchSelector = computed(() => this.myBranches().length > 1);

  // ─── State ────────────────────────────────────────────────────────────────

  activeTab         = signal('Niveles');
  viewModePreference = signal<'grid' | 'list'>('grid');
  isMobile          = signal(false);
  viewMode          = computed(() => this.isMobile() ? 'grid' : this.viewModePreference());

  searchQuery       = signal('');
  warehouseFilter   = signal('');
  showLowStock      = signal(false);
  currentPage       = signal(1);
  pageSize          = signal(12);
  refreshTrigger    = signal(0);
  isLoading         = signal(true);

  movSearchQuery = signal('');
  movTypeFilter  = signal<MovementType | ''>('');
  movPage        = signal(1);
  movPageSize    = signal(20);
  isMovLoading   = signal(true);

  alertRefresh     = signal(0);
  isAlertLoading   = signal(false);

  // ─── Adjust drawer ──────────────────────────────────────────────────────
  isAdjustOpen  = signal(false);
  isAdjusting   = signal(false);
  adjustTarget  = signal<StockLevel | null>(null);
  adjustNewQty: number | null = null;
  adjustNotes = '';
  adjustWarehouseId = signal('');
  adjustLocationId  = signal('');
  adjustLotId       = signal('');
  adjustWarehouses  = signal<Warehouse[]>([]);
  adjustLocations   = signal<Location[]>([]);
  adjustLots        = signal<LotStockEntry[]>([]);
  showAdjustLocations = signal(false);
  showAdjustLots      = signal(false);
  adjustWarehouseOptions = computed<SelectOption[]>(() =>
    this.adjustWarehouses().map(w => ({ value: w.id, label: w.name + (w.isDefault ? ' (Principal)' : '') }))
  );
  adjustLocationOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Sin ubicación' },
    ...this.adjustLocations().map(l => ({ value: l.id, label: l.name + (l.code ? ` (${l.code})` : '') }))
  ]);
  adjustLotOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Sin lote' },
    ...this.adjustLots().map(l => ({
      value: l.lotId,
      label: `${l.lotNumber}${l.expiryDate ? ' · Vence: ' + l.expiryDate.slice(0, 10) : ''} (${l.quantity} uds.)`
    }))
  ]);

  // ─── Transfer drawer ────────────────────────────────────────────────────
  isTransferOpen = signal(false);
  isTransferring = signal(false);
  transferTarget = signal<StockLevel | null>(null);
  transferQty: number | null = null;
  transferSourceWarehouseId = signal('');
  transferDestWarehouseId   = signal('');
  transferSourceLocationId  = signal('');
  transferDestLocationId    = signal('');
  transferWarehouses        = signal<Warehouse[]>([]);
  transferSourceLocations   = signal<Location[]>([]);
  transferDestLocations     = signal<Location[]>([]);
  showTransferSourceLoc     = signal(false);
  showTransferDestLoc       = signal(false);
  transferSourceWarehouseOptions = computed<SelectOption[]>(() =>
    this.transferWarehouses().map(w => ({ value: w.id, label: w.name + (w.isDefault ? ' (Principal)' : '') }))
  );
  transferDestWarehouseOptions = computed<SelectOption[]>(() =>
    this.transferWarehouses()
      .filter(w => w.id !== this.transferSourceWarehouseId())
      .map(w => ({ value: w.id, label: w.name + (w.isDefault ? ' (Principal)' : '') }))
  );
  transferSourceLocationOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Sin ubicación' },
    ...this.transferSourceLocations().map(l => ({ value: l.id, label: l.name + (l.code ? ` (${l.code})` : '') }))
  ]);
  transferDestLocationOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Sin ubicación' },
    ...this.transferDestLocations().map(l => ({ value: l.id, label: l.name + (l.code ? ` (${l.code})` : '') }))
  ]);

  // ─── Warehouses ───────────────────────────────────────────────────────────

  private warehousesResponse = toSignal(
    toObservable(computed(() => this.selectedBranchId())).pipe(
      switchMap(branchId =>
        this.warehouseService.findAll({ limit: 100, isActive: true, branchId: branchId || undefined })
      )
    ),
    { initialValue: { data: [] as Warehouse[], total: 0 } }
  );
  warehouses = computed<Warehouse[]>(() => (this.warehousesResponse() as any)?.data ?? []);
  warehouseOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Todas las bodegas' },
    ...this.warehouses().map(w => ({ value: w.id, label: w.name + (w.isDefault ? ' (Principal)' : '') }))
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
      warehouseId: this.warehouseFilter(),
      branchId: this.selectedBranchId(),
      lowStock: this.showLowStock(),
      refresh: this.refreshTrigger(),
      tab: this.activeTab()
    }))).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        if (params.tab !== 'Niveles') { this.isLoading.set(false); return of(null); }
        const { tab, refresh, ...filters } = params;
        return this.stockService.getLevels(filters).pipe(tap(() => this.isLoading.set(false)));
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
      warehouseId: this.warehouseFilter(),
      branchId: this.selectedBranchId(),
      type: this.movTypeFilter(),
      tab: this.activeTab()
    }))).pipe(
      debounceTime(300),
      tap(() => this.isMovLoading.set(true)),
      switchMap(params => {
        if (params.tab !== 'Movimientos') { this.isMovLoading.set(false); return of(null); }
        const { tab, type, ...rest } = params;
        return this.stockService.getMovements({ ...rest, type: type || undefined }).pipe(tap(() => this.isMovLoading.set(false)));
      })
    )
  );

  movements     = computed(() => (this.movementsResponse() as any)?.data  ?? []);
  movTotalItems = computed(() => (this.movementsResponse() as any)?.total ?? 0);

  // ─── Alerts: global (for stats) ──────────────────────────────────────────

  private readonly allAlertsResponse = toSignal(
    toObservable(computed(() => ({
      refresh: this.alertRefresh(),
      branchId: this.selectedBranchId(),
    }))).pipe(
      debounceTime(200),
      switchMap(({ branchId }) =>
        this.stockService.getAlerts(undefined, branchId || undefined).pipe(catchError(() => of([])))
      )
    )
  );

  allAlerts = computed<any[]>(() => (this.allAlertsResponse() as any) ?? []);

  // ─── Alerts: tab-filtered ──────────────────────────────────────────────────

  private readonly alertsResponse = toSignal(
    toObservable(computed(() => ({
      warehouseId: this.warehouseFilter(),
      branchId: this.selectedBranchId(),
      refresh: this.alertRefresh(),
      tab: this.activeTab()
    }))).pipe(
      debounceTime(200),
      tap(() => this.isAlertLoading.set(true)),
      switchMap(params => {
        if (params.tab !== 'Alertas') { this.isAlertLoading.set(false); return of([]); }
        return this.stockService.getAlerts(params.warehouseId || undefined, params.branchId || undefined).pipe(
          tap(() => this.isAlertLoading.set(false)),
          catchError(() => { this.isAlertLoading.set(false); return of([]); })
        );
      })
    )
  );

  alerts = computed<any[]>(() => (this.alertsResponse() as any) ?? []);

  // ─── Dashboard stats ──────────────────────────────────────────────────────

  lowStockCount = computed(() => this.allAlerts().filter((a: any) => a.alertLevel === 'LOW_STOCK').length);
  outOfStockCount = computed(() => this.allAlerts().filter((a: any) => a.alertLevel === 'OUT_OF_STOCK').length);
  overStockCount = computed(() => this.allAlerts().filter((a: any) => a.alertLevel === 'OVER_STOCK').length);
  okCount = computed(() => {
    const total = this.totalItems();
    const alertCount = this.lowStockCount() + this.outOfStockCount() + this.overStockCount();
    return Math.max(0, total - alertCount);
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  getLevelStatus(level: StockLevel): string {
    if (level.quantity === 0) return 'out-of-stock';
    if (level.minimumStock != null && level.quantity <= level.minimumStock) return 'low-stock';
    if (level.maximumStock != null && level.quantity > level.maximumStock) return 'over-stock';
    return 'ok';
  }

  getLevelStatusLabel(level: StockLevel): string {
    const s = this.getLevelStatus(level);
    if (s === 'out-of-stock') return 'Sin stock';
    if (s === 'low-stock')    return 'Stock bajo';
    if (s === 'over-stock')   return 'Sobre stock';
    return 'OK';
  }

  alertLevelLabel(level: string): string {
    if (level === 'OUT_OF_STOCK') return 'Sin stock';
    if (level === 'LOW_STOCK')    return 'Stock bajo';
    if (level === 'OVER_STOCK')   return 'Sobre stock';
    return 'OK';
  }

  getMovTypeLabel(type: MovementType): string {
    return this.movementTypes.find(m => m.value === type)?.label ?? type;
  }

  isOutType(type: MovementType): boolean {
    return ['SALE', 'LOSS', 'TRANSFER_OUT', 'PRODUCTION_OUT'].includes(type);
  }

  getStockProgress(level: StockLevel): number {
    if (!level.maximumStock || level.maximumStock === 0) {
      if (!level.minimumStock || level.minimumStock === 0) return 50;
      return Math.min(100, Math.round((level.quantity / (level.minimumStock * 3)) * 100));
    }
    return Math.min(100, Math.round((level.quantity / level.maximumStock) * 100));
  }

  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.warehouseFilter()) count++;
    if (this.showLowStock()) count++;
    return count;
  });

  // ─── Events ───────────────────────────────────────────────────────────────

  onTabChange(tab: string) {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.movPage.set(1);
    this.updateQueryParams({ tab });
  }

  onSearch(q: string)     { this.searchQuery.set(q); this.currentPage.set(1); }
  onMovSearch(q: string)  { this.movSearchQuery.set(q); this.movPage.set(1); }
  onWarehouseChange(id: string) {
    this.warehouseFilter.set(id);
    this.currentPage.set(1);
    this.updateQueryParams({ bodega: id || null });
  }

  clearFilters() {
    this.searchQuery.set('');
    this.warehouseFilter.set('');
    this.showLowStock.set(false);
    this.currentPage.set(1);
    this.updateQueryParams({ bodega: null });
  }

  goToPurchaseOrders() {
    this.router.navigate(['/inventario/ordenes-compra/nueva']);
  }

  private updateQueryParams(params: Record<string, string | null>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  handleLevelAction(action: ActionItem, level: StockLevel) {
    if (action.id === 'adjust')   this.openAdjust(level);
    if (action.id === 'transfer') this.openTransfer(level);
    if (action.id === 'kardex')   this.openKardex(level);
  }

  openKardex(level: StockLevel) {
    this.router.navigate(['/inventario/stock/kardex', level.variantId, level.warehouseId]);
  }

  openKardexFromAlert(alert: StockAlert) {
    this.router.navigate(['/inventario/stock/kardex', alert.variantId, alert.warehouseId]);
  }

  openAdjust(level: StockLevel) {
    this.adjustTarget.set(level);
    this.adjustNewQty = level.quantity;
    this.adjustNotes = '';
    this.adjustWarehouseId.set(level.warehouseId || '');
    this.adjustLocationId.set(level.locationId || '');
    this.adjustLotId.set('');
    this.showAdjustLocations.set(false);
    this.showAdjustLots.set(false);
    this.adjustLocations.set([]);
    this.adjustLots.set([]);
    this.warehouseService.findAll({ limit: 100, isActive: true }).subscribe(res => {
      this.adjustWarehouses.set((res as any)?.data ?? []);
      if (level.warehouseId) this.onAdjustWarehouseChange(level.warehouseId);
    });
    this.isAdjustOpen.set(true);
  }

  onAdjustWarehouseChange(warehouseId: string) {
    this.adjustWarehouseId.set(warehouseId);
    this.adjustLocationId.set('');
    this.adjustLotId.set('');
    const wh = this.adjustWarehouses().find(w => w.id === warehouseId);
    if (wh?.hasLocations) {
      this.showAdjustLocations.set(true);
      this.warehouseService.findLocations({ warehouseId, limit: 100, isActive: true }).subscribe(res => {
        this.adjustLocations.set((res as any)?.data ?? []);
      });
    } else {
      this.showAdjustLocations.set(false);
      this.adjustLocations.set([]);
    }
    const target = this.adjustTarget();
    if (target?.trackLots) {
      this.showAdjustLots.set(true);
      this.stockService.getLotStock(target.variantId, warehouseId).subscribe({
        next: lots => this.adjustLots.set(lots ?? []),
        error: () => this.adjustLots.set([])
      });
    } else {
      this.showAdjustLots.set(false);
      this.adjustLots.set([]);
    }
  }

  openAdjustFromAlert(alert: StockAlert) {
    const fakeLevel: StockLevel = {
      id: '', variantId: alert.variantId,
      warehouseId: alert.warehouseId || '', warehouseName: alert.warehouseName || '',
      branchId: alert.branchId || '', branchName: alert.branchName || '',
      quantity: alert.quantity, updatedAt: '',
      variantName: alert.variantName, sku: alert.sku, productId: alert.productId,
      productName: alert.productName,
      minimumStock: alert.minimumStock, maximumStock: alert.maximumStock,
      stockTrackable: true
    };
    this.openAdjust(fakeLevel);
  }

  confirmAdjust() {
    const target = this.adjustTarget();
    if (!target || !this.adjustWarehouseId() || this.adjustNewQty === null || this.adjustNewQty < 0) return;
    this.isAdjusting.set(true);
    this.stockService.adjust({
      variantId: target.variantId,
      warehouseId: this.adjustWarehouseId(),
      locationId: this.adjustLocationId() || undefined,
      lotId: this.adjustLotId() || undefined,
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

  // ─── Transfer ───────────────────────────────────────────────────────────

  openTransfer(level: StockLevel) {
    this.transferTarget.set(level);
    this.transferQty = null;
    this.transferSourceWarehouseId.set(level.warehouseId || '');
    this.transferDestWarehouseId.set('');
    this.transferSourceLocationId.set(level.locationId || '');
    this.transferDestLocationId.set('');
    this.showTransferSourceLoc.set(false);
    this.showTransferDestLoc.set(false);
    this.transferSourceLocations.set([]);
    this.transferDestLocations.set([]);
    this.warehouseService.findAll({ limit: 100, isActive: true }).subscribe(res => {
      this.transferWarehouses.set((res as any)?.data ?? []);
      if (level.warehouseId) this.onTransferSourceWarehouseChange(level.warehouseId);
    });
    this.isTransferOpen.set(true);
  }

  onTransferSourceWarehouseChange(warehouseId: string) {
    this.transferSourceWarehouseId.set(warehouseId);
    this.transferSourceLocationId.set('');
    const wh = this.transferWarehouses().find(w => w.id === warehouseId);
    if (wh?.hasLocations) {
      this.showTransferSourceLoc.set(true);
      this.warehouseService.findLocations({ warehouseId, limit: 100, isActive: true }).subscribe(res => {
        this.transferSourceLocations.set((res as any)?.data ?? []);
      });
    } else {
      this.showTransferSourceLoc.set(false);
      this.transferSourceLocations.set([]);
    }
    if (this.transferDestWarehouseId() === warehouseId) this.transferDestWarehouseId.set('');
  }

  onTransferDestWarehouseChange(warehouseId: string) {
    this.transferDestWarehouseId.set(warehouseId);
    this.transferDestLocationId.set('');
    const wh = this.transferWarehouses().find(w => w.id === warehouseId);
    if (wh?.hasLocations) {
      this.showTransferDestLoc.set(true);
      this.warehouseService.findLocations({ warehouseId, limit: 100, isActive: true }).subscribe(res => {
        this.transferDestLocations.set((res as any)?.data ?? []);
      });
    } else {
      this.showTransferDestLoc.set(false);
      this.transferDestLocations.set([]);
    }
  }

  confirmTransfer() {
    const target = this.transferTarget();
    if (!target || !this.transferQty || this.transferQty <= 0) return;
    this.isTransferring.set(true);
    this.stockService.transfer({
      variantId: target.variantId,
      sourceWarehouseId: this.transferSourceWarehouseId(),
      destWarehouseId: this.transferDestWarehouseId(),
      sourceLocationId: this.transferSourceLocationId() || undefined,
      destLocationId: this.transferDestLocationId() || undefined,
      quantity: this.transferQty
    }).subscribe({
      next: () => {
        this.toastService.success('Transferencia realizada correctamente');
        this.isTransferring.set(false);
        this.isTransferOpen.set(false);
        this.refreshTrigger.update(v => v + 1);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al transferir stock');
        this.isTransferring.set(false);
      }
    });
  }

  private destroyRef = inject(DestroyRef);

  onBranchChange(branchId: string) {
    this.selectedBranchId.set(branchId);
    this.warehouseFilter.set(''); // reset bodega al cambiar sucursal
    this.currentPage.set(1);
    this.refreshTrigger.update(v => v + 1);
    this.alertRefresh.update(v => v + 1);
    this.updateQueryParams({ sucursal: branchId || null, bodega: null });
  }

  constructor() {
    // Init from query params
    const qp = this.route.snapshot.queryParams;
    const validTabs = this.stockTabs.map(t => t.value);
    if (qp['tab'] && validTabs.includes(qp['tab'])) this.activeTab.set(qp['tab']);
    if (qp['bodega']) this.warehouseFilter.set(qp['bodega']);

    // Load branches & pre-select active
    this.authService.getMyBranches().subscribe(branches => {
      this.myBranches.set(branches);
      const activeBranch = this.authService.activeBranchId();
      const fromQp = qp['sucursal'];
      if (fromQp && branches.some(b => b.id === fromQp)) {
        this.selectedBranchId.set(fromQp);
      } else if (branches.length === 1) {
        this.selectedBranchId.set(branches[0].id);
      } else if (activeBranch && branches.some(b => b.id === activeBranch)) {
        this.selectedBranchId.set(activeBranch);
      }
    });

    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mq.matches);
      const handler = (e: MediaQueryListEvent) => this.isMobile.set(e.matches);
      mq.addEventListener('change', handler);
      this.destroyRef.onDestroy(() => mq.removeEventListener('change', handler));
    }
  }
}
