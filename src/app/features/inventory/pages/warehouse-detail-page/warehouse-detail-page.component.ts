import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  ViewChild,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucidePencil,
  lucideWarehouse,
  lucideGrid3x3,
  lucideInfo,
  lucideHistory,
  lucideAlertCircle,
  lucidePlus,
  lucideTrash2,
  lucideSave,
  lucideRefreshCw,
  lucidePlusCircle,
  lucideTrash,
  lucideSearch,
  lucideCopy,
  lucideCheck,
} from '@ng-icons/lucide';
import { toSignal } from '@angular/core/rxjs-interop';
import { BackButtonComponent } from '../../../../shared/components/ui/back-button/back-button';
import { switchMap, catchError, of, tap } from 'rxjs';

import { WarehouseService } from '../../../../core/services/warehouse.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Warehouse, Location } from '../../../../core/models/warehouse.models';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { SkeletonComponent } from '../../../../shared/components/ui/skeleton/skeleton';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { EmptyStateComponent } from '../../../../shared/components/ui/empty-state/empty-state';
import { ActionItem, ActionsMenuComponent } from '../../../../shared/components/ui/actions-menu/actions-menu';
import { DatelineComponent, DatelineItem } from '../../../../shared/components/ui/dateline/dateline.component';
import { WarehouseFormComponent } from '../../components/warehouse-form/warehouse-form';
import { LocationFormComponent } from '../../components/location-form/location-form';

@Component({
  selector: 'app-warehouse-detail-page',
  standalone: true,
  imports: [
    CommonModule, NgIconComponent, SpinnerComponent, SkeletonComponent,
    DrawerComponent, ModalComponent, FormButtonComponent,
    EmptyStateComponent, ActionsMenuComponent, DatelineComponent,
    WarehouseFormComponent, LocationFormComponent, DatePipe, BackButtonComponent,
  ],
  templateUrl: './warehouse-detail-page.component.html',
  styleUrl: './warehouse-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideArrowLeft, lucidePencil, lucideWarehouse, lucideGrid3x3,
      lucideInfo, lucideHistory, lucideAlertCircle, lucidePlus,
      lucideTrash2, lucideSave, lucideRefreshCw, lucidePlusCircle,
      lucideTrash, lucideSearch, lucideCopy, lucideCheck,
    })
  ],
})
export class WarehouseDetailPageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private warehouseService = inject(WarehouseService);
  private toastService = inject(ToastService);

  @ViewChild('warehouseForm') warehouseFormRef!: WarehouseFormComponent;
  @ViewChild('locationForm') locationFormRef!: LocationFormComponent;

  // ── Main state ───────────────────────────────────────────────────────────────
  isLoading = signal(true);
  error = signal<string | null>(null);
  warehouse = signal<Warehouse | null>(null);

  // ── Locations ────────────────────────────────────────────────────────────────
  locations = signal<Location[]>([]);
  locationsLoading = signal(false);
  locationSearch = signal('');

  filteredLocations = computed(() => {
    const q = this.locationSearch().toLowerCase().trim();
    const list = this.locations();
    if (!q) return list;
    return list.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.code && l.code.toLowerCase().includes(q))
    );
  });

  locationActions: ActionItem[] = [
    { id: 'edit', label: 'Editar', icon: 'lucidePencil' },
    { id: 'delete', label: 'Eliminar', icon: 'lucideTrash2', variant: 'danger' },
  ];

  // ── Drawers / Modals ─────────────────────────────────────────────────────────
  isEditDrawerOpen = signal(false);
  isLocationDrawerOpen = signal(false);
  isEditingLocation = signal(false);
  isConfirmCloseOpen = signal(false);

  isDeleteLocationModalOpen = signal(false);
  isDeletingLocation = signal(false);
  locationToDelete = signal<Location | null>(null);

  // ── Copy locations ─────────────────────────────────────────────────────────
  isCopyModalOpen = signal(false);
  isCopying = signal(false);
  selectedSourceWarehouseId = signal<string | null>(null);
  availableWarehouses = signal<Warehouse[]>([]);
  isLoadingWarehouses = signal(false);
  warehouseSearchQuery = signal('');

  filteredWarehouses = computed(() => {
    const q = this.warehouseSearchQuery().toLowerCase().trim();
    const list = this.availableWarehouses();
    if (!q) return list;
    return list.filter(w => w.name.toLowerCase().includes(q));
  });

  // ── History ──────────────────────────────────────────────────────────────────
  isHistoryOpen = signal(false);
  isHistoryLoading = signal(false);
  warehouseLogs = signal<any[]>([]);

  mappedLogs = computed<DatelineItem[]>(() =>
    this.warehouseLogs().map(log => ({
      id: log.id,
      date: log.createdAt,
      action: log.action,
      actionLabel: log.action === 'CREATE' ? 'Creacion' : log.action === 'UPDATE' ? 'Actualizacion' : log.action === 'DELETE' ? 'Eliminacion' : log.action,
      user: log.userName || 'Sistema',
      icon: log.action === 'CREATE' ? 'lucidePlusCircle' : log.action === 'UPDATE' ? 'lucideRefreshCw' : log.action === 'DELETE' ? 'lucideTrash' : 'lucideHistory',
      message: log.action === 'CREATE' ? 'Registro inicial de la bodega.' : undefined,
      changes: log.action === 'UPDATE' && log.details?.oldData
        ? this.getChangedFields(log.details.oldData, log.details.newData)
        : undefined,
    }))
  );

  // ── Init ─────────────────────────────────────────────────────────────────────
  private readonly warehouseData = toSignal(
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id')!;
        this.isLoading.set(true);
        this.error.set(null);
        return this.warehouseService.findOne(id).pipe(
          tap(wh => {
            this.warehouse.set(wh);
            this.isLoading.set(false);
            this.loadLocations(wh.id);
          }),
          catchError(err => {
            this.error.set(err?.error?.error ?? 'No se pudo cargar la bodega');
            this.isLoading.set(false);
            return of(null);
          })
        );
      })
    )
  );

  // ── Location CRUD ────────────────────────────────────────────────────────────
  loadLocations(warehouseId: string) {
    this.locationsLoading.set(true);
    this.warehouseService.findLocations({ warehouseId, limit: 100 }).subscribe({
      next: res => {
        this.locations.set(res.data);
        this.locationsLoading.set(false);
      },
      error: () => {
        this.toastService.error('No se pudieron cargar las ubicaciones');
        this.locationsLoading.set(false);
      },
    });
  }

  onAddLocation() {
    this.isEditingLocation.set(false);
    this.isLocationDrawerOpen.set(true);
    setTimeout(() => this.locationFormRef?.resetForm(), 0);
  }

  onEditLocation(loc: Location) {
    this.isEditingLocation.set(true);
    this.isLocationDrawerOpen.set(true);
    setTimeout(() => this.locationFormRef?.setLocation(loc), 0);
  }

  onLocationSaved() {
    this.isLocationDrawerOpen.set(false);
    this.loadLocations(this.warehouse()!.id);
  }

  onLocationDrawerClose() {
    if (this.locationFormRef?.hasUnsavedChanges()) {
      this.isConfirmCloseOpen.set(true);
    } else {
      this.isLocationDrawerOpen.set(false);
      this.locationFormRef?.resetForm();
    }
  }

  forceCloseLocationDrawer() {
    this.isConfirmCloseOpen.set(false);
    this.isLocationDrawerOpen.set(false);
    this.locationFormRef?.resetForm();
  }

  handleLocationAction(action: ActionItem, loc: Location) {
    if (action.id === 'edit') this.onEditLocation(loc);
    else if (action.id === 'delete') this.onDeleteLocation(loc);
  }

  onDeleteLocation(loc: Location) {
    this.locationToDelete.set(loc);
    this.isDeleteLocationModalOpen.set(true);
  }

  cancelDeleteLocation() {
    if (this.isDeletingLocation()) return;
    this.isDeleteLocationModalOpen.set(false);
    this.locationToDelete.set(null);
  }

  confirmDeleteLocation() {
    const loc = this.locationToDelete();
    if (!loc || this.isDeletingLocation()) return;
    this.isDeletingLocation.set(true);
    this.warehouseService.removeLocation(loc.id).subscribe({
      next: () => {
        this.toastService.success('Ubicacion eliminada correctamente');
        this.isDeletingLocation.set(false);
        this.cancelDeleteLocation();
        this.loadLocations(this.warehouse()!.id);
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? 'No se pudo eliminar la ubicacion');
        this.isDeletingLocation.set(false);
      },
    });
  }

  // ── Copy locations ──────────────────────────────────────────────────────────
  openCopyModal() {
    this.selectedSourceWarehouseId.set(null);
    this.warehouseSearchQuery.set('');
    this.isCopyModalOpen.set(true);
    this.isLoadingWarehouses.set(true);
    this.warehouseService.findAll({ limit: 100, isActive: true }).subscribe({
      next: res => {
        this.availableWarehouses.set(
          (res.data ?? []).filter(w => w.id !== this.warehouse()?.id)
        );
        this.isLoadingWarehouses.set(false);
      },
      error: () => this.isLoadingWarehouses.set(false),
    });
  }

  confirmCopy() {
    const sourceId = this.selectedSourceWarehouseId();
    const targetId = this.warehouse()?.id;
    if (!sourceId || !targetId || this.isCopying()) return;

    this.isCopying.set(true);
    this.warehouseService.copyLocationsFrom(sourceId, targetId).subscribe({
      next: (res) => {
        this.toastService.success(`${res.count} ubicaciones copiadas correctamente`);
        this.isCopying.set(false);
        this.isCopyModalOpen.set(false);
        this.loadLocations(targetId);
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? 'No se pudieron copiar las ubicaciones');
        this.isCopying.set(false);
      },
    });
  }

  // ── Edit Warehouse ───────────────────────────────────────────────────────────
  onEditWarehouse() {
    this.isEditDrawerOpen.set(true);
    setTimeout(() => this.warehouseFormRef?.setWarehouse(this.warehouse()!), 0);
  }

  onWarehouseSaved() {
    this.isEditDrawerOpen.set(false);
    // Reload warehouse
    this.warehouseService.findOne(this.warehouse()!.id).subscribe({
      next: wh => {
        this.warehouse.set(wh);
        if (wh.hasLocations) this.loadLocations(wh.id);
        else this.locations.set([]);
      },
    });
  }

  onEditDrawerClose() {
    if (this.warehouseFormRef?.hasUnsavedChanges()) {
      this.isConfirmCloseOpen.set(true);
    } else {
      this.isEditDrawerOpen.set(false);
      this.warehouseFormRef?.resetForm();
    }
  }

  forceCloseEditDrawer() {
    this.isConfirmCloseOpen.set(false);
    this.isEditDrawerOpen.set(false);
    this.warehouseFormRef?.resetForm();
  }

  // ── History ──────────────────────────────────────────────────────────────────
  onShowHistory() {
    this.isHistoryOpen.set(true);
    this.isHistoryLoading.set(true);
    this.warehouseService.getLogs(this.warehouse()!.id).subscribe({
      next: logs => {
        this.warehouseLogs.set(logs);
        this.isHistoryLoading.set(false);
      },
      error: () => {
        this.toastService.error('No se pudo cargar el historial');
        this.isHistoryLoading.set(false);
        this.isHistoryOpen.set(false);
      },
    });
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  goBack() {
    this.router.navigate(['/inventario/bodegas']);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  private getChangedFields(oldData: any, newData: any) {
    if (!oldData || !newData) return [];
    const fields = [
      { field: 'name', label: 'Nombre' },
      { field: 'description', label: 'Descripcion' },
      { field: 'isActive', label: 'Estado' },
      { field: 'hasLocations', label: 'Ubicaciones' },
      { field: 'isDefault', label: 'Bodega principal' },
    ];
    return fields
      .filter(f => JSON.stringify(oldData[f.field]) !== JSON.stringify(newData[f.field]))
      .map(f => ({
        ...f,
        oldValue: this.formatValue(oldData[f.field]),
        newValue: this.formatValue(newData[f.field]),
      }));
  }

  private formatValue(val: any): string {
    if (val === true) return 'Activado';
    if (val === false) return 'Desactivado';
    if (val === null || val === undefined) return '';
    return String(val);
  }
}
