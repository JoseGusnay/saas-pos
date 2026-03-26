import {
  Component, ChangeDetectionStrategy, computed, inject, signal, DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, catchError, of, tap, forkJoin } from 'rxjs';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePackage, lucideWarehouse, lucideArrowUpDown, lucideArrowLeftRight,
  lucideAlertCircle, lucideArrowLeft, lucideFlaskConical, lucideCalendar,
  lucideFilter, lucideDownload, lucideFileText,
} from '@ng-icons/lucide';

import { StockService } from '../../../../core/services/stock.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  StockLevel, StockMovement, MovementType, LotStockEntry,
  KardexMovement, KardexTotals,
} from '../../../../core/models/stock.models';
import { Warehouse, Location } from '../../../../core/models/warehouse.models';

import { BackButtonComponent } from '../../../../shared/components/ui/back-button/back-button';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/ui/custom-select/custom-select.component';
import { DatePickerComponent } from '../../../../shared/components/ui/date-picker/date-picker';
import { PaginationComponent } from '../../../../shared/components/list-ui/pagination/pagination.component';

@Component({
  selector: 'app-stock-kardex-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NgIconComponent, RouterLink,
    BackButtonComponent, SpinnerComponent, SkeletonComponent, EmptyStateComponent,
    FormButtonComponent, DrawerComponent, CustomSelectComponent, DatePickerComponent, PaginationComponent,
  ],
  providers: [provideIcons({
    lucidePackage, lucideWarehouse, lucideArrowUpDown, lucideArrowLeftRight,
    lucideAlertCircle, lucideArrowLeft, lucideFlaskConical, lucideCalendar,
    lucideFilter, lucideDownload, lucideFileText,
  })],
  templateUrl: './stock-kardex-page.component.html',
  styleUrl: './stock-kardex-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockKardexPageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private stockService = inject(StockService);
  private warehouseService = inject(WarehouseService);
  private toastService = inject(ToastService);

  // ── Layout ──────────────────────────────────────────────────────────────────
  isMobile = signal(false);
  private destroyRef = inject(DestroyRef);

  // ── Page state ──────────────────────────────────────────────────────────────
  isLoading = signal(true);
  error = signal<string | null>(null);
  level = signal<StockLevel | null>(null);
  availability = signal<{ physical: number; reserved: number; available: number } | null>(null);
  lots = signal<LotStockEntry[]>([]);

  // ── Kardex table ────────────────────────────────────────────────────────────
  movements = signal<KardexMovement[]>([]);
  movTotal = signal(0);
  movPage = signal(1);
  movPageSize = signal(25);
  movLoading = signal(false);
  movTypeFilter = signal<MovementType | ''>('');
  dateFrom = signal('');
  dateTo = signal('');
  openingBalance = signal<number | null>(null);
  periodTotals = signal<KardexTotals | null>(null);

  movementTypes = [
    { value: 'INITIAL',        label: 'Inicial' },
    { value: 'PURCHASE',       label: 'Compra' },
    { value: 'SALE',           label: 'Venta' },
    { value: 'ADJUSTMENT',     label: 'Ajuste' },
    { value: 'LOSS',           label: 'Pérdida' },
    { value: 'TRANSFER_IN',    label: 'Trans. entrada' },
    { value: 'TRANSFER_OUT',   label: 'Trans. salida' },
    { value: 'RETURN',         label: 'Devolución' },
    { value: 'PRODUCTION_IN',  label: 'Prod. entrada' },
    { value: 'PRODUCTION_OUT', label: 'Prod. salida' },
  ];

  movTypeOptions: SelectOption[] = [
    { value: '', label: 'Todos los tipos' },
    ...this.movementTypes.map(t => ({ value: t.value, label: t.label })),
  ];

  // ── Totales del período (vienen del backend, cubren todo el rango) ────────
  totalEntradas = computed(() => this.periodTotals()?.totalIn ?? 0);
  totalSalidas = computed(() => this.periodTotals()?.totalOut ?? 0);
  totalCostoEntradas = computed(() => this.periodTotals()?.totalCostIn ?? 0);
  totalCostoSalidas = computed(() => this.periodTotals()?.totalCostOut ?? 0);
  hasCostData = computed(() => this.movements().some(m => m.costPrice != null));

  hasDateFilter = computed(() => !!this.dateFrom() || !!this.dateTo());
  hasActiveFilters = computed(() => !!this.movTypeFilter() || this.hasDateFilter());

  // ── Adjust drawer ──────────────────────────────────────────────────────────
  isAdjustOpen = signal(false);
  isAdjusting = signal(false);
  adjustNewQty: number | null = null;
  adjustNotes = '';
  adjustWarehouseId = signal('');
  adjustLocationId = signal('');
  adjustLotId = signal('');
  adjustWarehouses = signal<Warehouse[]>([]);
  adjustLocations = signal<Location[]>([]);
  adjustLots = signal<LotStockEntry[]>([]);
  showAdjustLocations = signal(false);
  showAdjustLots = signal(false);

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

  // ── Transfer drawer ────────────────────────────────────────────────────────
  isTransferOpen = signal(false);
  isTransferring = signal(false);
  transferQty: number | null = null;
  transferSourceWarehouseId = signal('');
  transferDestWarehouseId = signal('');
  transferSourceLocationId = signal('');
  transferDestLocationId = signal('');
  transferWarehouses = signal<Warehouse[]>([]);
  transferSourceLocations = signal<Location[]>([]);
  transferDestLocations = signal<Location[]>([]);
  showTransferSourceLoc = signal(false);
  showTransferDestLoc = signal(false);

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

  // ── Init ────────────────────────────────────────────────────────────────────

  private readonly pageData = toSignal(
    this.route.paramMap.pipe(
      switchMap(params => {
        const variantId = params.get('variantId')!;
        const warehouseId = params.get('warehouseId')!;
        this.isLoading.set(true);
        this.error.set(null);

        return forkJoin({
          level: this.stockService.getLevel(variantId, warehouseId).pipe(catchError(() => of(null))),
          availability: this.stockService.getAvailable(variantId, warehouseId),
          kardex: this.stockService.getKardex(variantId, warehouseId, 1, this.movPageSize()),
        }).pipe(
          tap(({ level, availability, kardex }) => {
            // Si getLevel devuelve datos completos, usarlos. Sino, construir desde el kardex.
            if (level && level.productName) {
              this.level.set(level);
            } else if (kardex.data?.length > 0) {
              const first = kardex.data[0];
              this.level.set({
                id: '', variantId, warehouseId,
                warehouseName: first.warehouseName ?? '',
                branchId: first.branchId ?? '', branchName: first.branchName ?? '',
                quantity: availability.physical,
                updatedAt: '', variantName: first.variantName ?? '',
                sku: first.sku ?? '', productId: first.productId ?? '',
                productName: first.productName ?? '',
                stockTrackable: true,
              } as StockLevel);
            }
            this.availability.set(availability);

            // Kardex ya cargado — poblar directamente
            this.movements.set(kardex.data ?? []);
            this.movTotal.set(kardex.total ?? 0);
            this.openingBalance.set(kardex.openingBalance ?? null);
            this.periodTotals.set(kardex.totals ?? null);

            this.isLoading.set(false);

            // Load lots if trackLots
            const lv = this.level();
            if (lv?.trackLots || kardex.data?.some((m: any) => m.lotNumber)) {
              this.stockService.getLotStock(variantId, warehouseId).subscribe({
                next: lots => this.lots.set(lots ?? []),
                error: () => {},
              });
            }
          }),
          catchError(err => {
            this.error.set(err?.error?.error ?? 'No se pudo cargar el kardex');
            this.isLoading.set(false);
            return of(null);
          }),
        );
      }),
    ),
  );

  // ── Movements ───────────────────────────────────────────────────────────────

  private get variantId() { return this.route.snapshot.paramMap.get('variantId')!; }
  private get warehouseId() { return this.route.snapshot.paramMap.get('warehouseId')!; }

  loadMovements() {
    this.movLoading.set(true);
    const filters = {
      type: this.movTypeFilter() || undefined,
      dateFrom: this.dateFrom() || undefined,
      dateTo: this.dateTo() || undefined,
    };
    this.stockService.getKardex(this.variantId, this.warehouseId, this.movPage(), this.movPageSize(), filters).subscribe({
      next: res => {
        this.movements.set(res.data ?? []);
        this.movTotal.set(res.total ?? 0);
        this.openingBalance.set(res.openingBalance ?? null);
        this.periodTotals.set(res.totals ?? null);
        this.movLoading.set(false);
      },
      error: () => {
        this.toastService.error('Error al cargar los movimientos');
        this.movLoading.set(false);
      },
    });
  }

  onMovPageChange(page: number) {
    this.movPage.set(page);
    this.loadMovements();
  }

  onMovTypeChange(type: string) {
    this.movTypeFilter.set(type as MovementType | '');
    this.movPage.set(1);
    this.loadMovements();
  }

  onDateFromChange(date: string) {
    this.dateFrom.set(date);
    this.movPage.set(1);
    this.loadMovements();
  }

  onDateToChange(date: string) {
    this.dateTo.set(date);
    this.movPage.set(1);
    this.loadMovements();
  }

  clearFilters() {
    this.movTypeFilter.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.movPage.set(1);
    this.loadMovements();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  getMovTypeLabel(type: MovementType): string {
    return this.movementTypes.find(m => m.value === type)?.label ?? type;
  }

  isOutType(type: MovementType): boolean {
    return ['SALE', 'LOSS', 'TRANSFER_OUT', 'PRODUCTION_OUT'].includes(type);
  }

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

  goBack() { this.router.navigate(['/inventario/stock']); }

  private get exportFilters() {
    return {
      type: this.movTypeFilter() || undefined,
      dateFrom: this.dateFrom() || undefined,
      dateTo: this.dateTo() || undefined,
    };
  }

  exportExcel() {
    this.stockService.exportKardex(this.variantId, this.warehouseId, 'xlsx', this.exportFilters);
  }

  exportPdf() {
    this.stockService.exportKardex(this.variantId, this.warehouseId, 'pdf', this.exportFilters);
  }

  getReferenceLabel(mov: StockMovement): string {
    if (!mov.referenceType || !mov.referenceId) return '';
    const prefixes: Record<string, string> = {
      ORDER: 'OC', SALE: 'VTA', TRANSFER: 'TR', PRODUCTION: 'PROD',
    };
    const prefix = prefixes[mov.referenceType] || mov.referenceType;
    return `${prefix}-${mov.referenceId.slice(0, 8).toUpperCase()}`;
  }

  getReferenceRoute(mov: StockMovement): string[] | null {
    if (!mov.referenceType || !mov.referenceId) return null;
    if (mov.referenceType === 'ORDER') return ['/inventario/ordenes-compra', mov.referenceId];
    return null;
  }

  // ── Adjust ──────────────────────────────────────────────────────────────────

  openAdjust() {
    const lv = this.level();
    if (!lv) return;
    this.adjustNewQty = lv.quantity;
    this.adjustNotes = '';
    this.adjustWarehouseId.set(lv.warehouseId || '');
    this.adjustLocationId.set(lv.locationId || '');
    this.adjustLotId.set('');
    this.showAdjustLocations.set(false);
    this.showAdjustLots.set(false);
    this.adjustLocations.set([]);
    this.adjustLots.set([]);
    this.warehouseService.findAll({ limit: 100, isActive: true }).subscribe(res => {
      this.adjustWarehouses.set((res as any)?.data ?? []);
      if (lv.warehouseId) this.onAdjustWarehouseChange(lv.warehouseId);
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
    const lv = this.level();
    if (lv?.trackLots) {
      this.showAdjustLots.set(true);
      this.stockService.getLotStock(lv.variantId, warehouseId).subscribe({
        next: lots => this.adjustLots.set(lots ?? []),
        error: () => this.adjustLots.set([]),
      });
    } else {
      this.showAdjustLots.set(false);
      this.adjustLots.set([]);
    }
  }

  confirmAdjust() {
    const lv = this.level();
    if (!lv || !this.adjustWarehouseId() || this.adjustNewQty === null || this.adjustNewQty < 0) return;
    this.isAdjusting.set(true);
    this.stockService.adjust({
      variantId: lv.variantId,
      warehouseId: this.adjustWarehouseId(),
      locationId: this.adjustLocationId() || undefined,
      lotId: this.adjustLotId() || undefined,
      newQuantity: this.adjustNewQty,
      notes: this.adjustNotes || undefined,
    }).subscribe({
      next: () => {
        this.toastService.success('Stock ajustado correctamente');
        this.isAdjusting.set(false);
        this.isAdjustOpen.set(false);
        this.refreshPage();
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al ajustar el stock');
        this.isAdjusting.set(false);
      },
    });
  }

  // ── Transfer ────────────────────────────────────────────────────────────────

  openTransfer() {
    const lv = this.level();
    if (!lv) return;
    this.transferQty = null;
    this.transferSourceWarehouseId.set(lv.warehouseId || '');
    this.transferDestWarehouseId.set('');
    this.transferSourceLocationId.set(lv.locationId || '');
    this.transferDestLocationId.set('');
    this.showTransferSourceLoc.set(false);
    this.showTransferDestLoc.set(false);
    this.transferSourceLocations.set([]);
    this.transferDestLocations.set([]);
    this.warehouseService.findAll({ limit: 100, isActive: true }).subscribe(res => {
      this.transferWarehouses.set((res as any)?.data ?? []);
      if (lv.warehouseId) this.onTransferSourceWarehouseChange(lv.warehouseId);
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
    const lv = this.level();
    if (!lv || !this.transferQty || this.transferQty <= 0) return;
    this.isTransferring.set(true);
    this.stockService.transfer({
      variantId: lv.variantId,
      sourceWarehouseId: this.transferSourceWarehouseId(),
      destWarehouseId: this.transferDestWarehouseId(),
      sourceLocationId: this.transferSourceLocationId() || undefined,
      destLocationId: this.transferDestLocationId() || undefined,
      quantity: this.transferQty,
    }).subscribe({
      next: () => {
        this.toastService.success('Transferencia realizada correctamente');
        this.isTransferring.set(false);
        this.isTransferOpen.set(false);
        this.refreshPage();
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al transferir');
        this.isTransferring.set(false);
      },
    });
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      this.isMobile.set(mq.matches);
      const handler = (e: MediaQueryListEvent) => this.isMobile.set(e.matches);
      mq.addEventListener('change', handler);
      this.destroyRef.onDestroy(() => mq.removeEventListener('change', handler));
    }
  }

  // ── Refresh ─────────────────────────────────────────────────────────────────

  private refreshPage() {
    const v = this.variantId;
    const w = this.warehouseId;
    forkJoin({
      level: this.stockService.getLevel(v, w),
      availability: this.stockService.getAvailable(v, w),
    }).subscribe(({ level, availability }) => {
      this.level.set(level);
      this.availability.set(availability);
      if (level?.trackLots) {
        this.stockService.getLotStock(v, w).subscribe(lots => this.lots.set(lots ?? []));
      }
    });
    this.loadMovements();
  }
}
