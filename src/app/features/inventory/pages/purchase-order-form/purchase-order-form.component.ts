import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { SupplierService } from '../../../../core/services/supplier.service';
import { BranchService } from '../../../../core/services/branch.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PurchaseOrder, PurchaseOrderItemPayload } from '../../../../core/models/purchase-order.models';
import { environment } from '../../../../../environments/environment';

import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideTrash2, lucideSave, lucideArrowLeft, lucidePackagePlus
} from '@ng-icons/lucide';

interface LineItem {
  variantId: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  unitCost: number;
}

@Component({
  selector: 'app-purchase-order-form',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelectComponent, FormButtonComponent, SpinnerComponent, NgIconComponent],
  providers: [
    provideIcons({ lucidePlus, lucideTrash2, lucideSave, lucideArrowLeft, lucidePackagePlus })
  ],
  template: `
    <div class="po-form-page">
      <!-- Header -->
      <div class="po-form-page__header">
        <button class="btn btn-ghost btn-sm back-btn" (click)="goBack()">
          <ng-icon name="lucideArrowLeft" size="16"></ng-icon>
          Volver
        </button>
        <div class="header-title">
          <h2>{{ isEdit() ? 'Editar Orden de Compra' : 'Nueva Orden de Compra' }}</h2>
          @if (isEdit()) {
            <span class="badge-draft">Borrador</span>
          }
        </div>
      </div>

      @if (isLoadingOrder()) {
        <div class="loading-state"><app-spinner></app-spinner></div>
      } @else {
        <div class="po-form-page__body">
          <!-- Panel izquierdo: datos generales -->
          <div class="panel panel--main">
            <h3 class="panel-title">Datos Generales</h3>

            <div class="form-group">
              <label>Proveedor *</label>
              <app-search-select
                placeholder="Seleccionar proveedor..."
                searchPlaceholder="Buscar proveedor..."
                [searchFn]="supplierSearchFn"
                [initialOption]="initialSupplier()"
                (selectionChange)="onSupplierChange($event)"
              ></app-search-select>
            </div>

            <div class="form-group">
              <label>Sucursal destino *</label>
              <select class="form-control" [(ngModel)]="selectedBranchId">
                <option value="">Seleccionar sucursal...</option>
                @for (b of branches(); track b.id) {
                  <option [value]="b.id">{{ b.name }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label>Notas</label>
              <textarea class="form-control" rows="3" [(ngModel)]="notes" placeholder="Observaciones, condiciones, etc."></textarea>
            </div>
          </div>

          <!-- Panel derecho: items -->
          <div class="panel panel--items">
            <div class="panel-items-header">
              <h3 class="panel-title">Ítems de la Orden</h3>
              <span class="items-count">{{ items().length }} ítem{{ items().length !== 1 ? 's' : '' }}</span>
            </div>

            <!-- Buscador de variantes -->
            <div class="add-item-row">
              <app-search-select
                placeholder="Buscar producto o SKU para agregar..."
                searchPlaceholder="Escribe nombre o SKU..."
                [searchFn]="variantSearchFn"
                [initialOption]="undefined"
                (selectionChange)="onVariantSelect($event)"
              ></app-search-select>
            </div>

            @if (items().length === 0) {
              <div class="items-empty">
                <ng-icon name="lucidePackagePlus" size="32"></ng-icon>
                <span>Busca productos arriba para agregarlos</span>
              </div>
            } @else {
              <div class="items-list">
                <div class="items-list__header">
                  <span class="col-product">Producto</span>
                  <span class="col-qty">Cant.</span>
                  <span class="col-cost">Costo Unit.</span>
                  <span class="col-sub">Subtotal</span>
                  <span class="col-del"></span>
                </div>
                @for (item of items(); track $index; let i = $index) {
                  <div class="item-row">
                    <div class="col-product">
                      <span class="item-name">{{ item.variantLabel }}</span>
                      <span class="item-sku">{{ item.sku }}</span>
                    </div>
                    <div class="col-qty">
                      <input type="number" class="form-control qty-input" min="1" [(ngModel)]="item.quantity" (ngModelChange)="recalculate()" />
                    </div>
                    <div class="col-cost">
                      <input type="number" class="form-control cost-input" min="0" step="0.01" [(ngModel)]="item.unitCost" (ngModelChange)="recalculate()" />
                    </div>
                    <div class="col-sub">{{ item.quantity * item.unitCost | currency:'USD':'symbol':'1.2-2' }}</div>
                    <div class="col-del">
                      <button class="btn btn-ghost btn-sm danger-btn" (click)="removeItem(i)">
                        <ng-icon name="lucideTrash2" size="14"></ng-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }

            <div class="total-row">
              <span class="total-label">Total de la Orden</span>
              <span class="total-value">{{ total() | currency:'USD':'symbol':'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <!-- Footer actions -->
        <div class="po-form-page__footer">
          <app-form-button label="Cancelar" variant="secondary" [disabled]="isSaving()" (click)="goBack()"></app-form-button>
          <app-form-button
            [label]="isEdit() ? 'Actualizar Borrador' : 'Guardar como Borrador'"
            loadingLabel="Guardando..."
            icon="lucideSave"
            [loading]="isSaving()"
            [disabled]="!canSave() || isSaving()"
            (click)="save()"
          ></app-form-button>
        </div>
      }
    </div>
  `,
  styles: [`
    .po-form-page { display: flex; flex-direction: column; min-height: 100%; gap: 1.5rem; }

    .po-form-page__header { display: flex; align-items: center; gap: 1rem; }
    .back-btn { display: flex; align-items: center; gap: 0.375rem; color: var(--color-text-muted); }
    .header-title { display: flex; align-items: center; gap: 0.75rem; }
    .header-title h2 { margin: 0; font-size: 1.25rem; font-weight: var(--font-weight-bold); }
    .badge-draft { padding: 0.2rem 0.625rem; border-radius: 99px; background: var(--color-border-subtle); color: var(--color-text-muted); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }

    .loading-state { display: flex; justify-content: center; padding: 4rem; }

    .po-form-page__body { display: grid; grid-template-columns: 380px 1fr; gap: 1.5rem; align-items: start; }
    @media (max-width: 900px) { .po-form-page__body { grid-template-columns: 1fr; } }

    .panel { background: var(--color-bg-surface); border: 1px solid var(--color-border-light); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .panel-title { font-size: 1rem; font-weight: var(--font-weight-semibold); color: var(--color-text-main); margin: 0; }
    .panel-items-header { display: flex; align-items: center; justify-content: space-between; }
    .items-count { font-size: var(--font-size-sm); color: var(--color-text-muted); }

    .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .form-group label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-main); }
    .form-control { padding: 0.5rem 0.75rem; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); background: var(--color-bg-surface); color: var(--color-text-main); font-size: var(--font-size-sm); }
    .form-control:focus { outline: none; border-color: var(--color-accent-primary); }

    .add-item-row { margin-bottom: 0.5rem; }
    .items-empty { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 2.5rem 1rem; color: var(--color-text-muted); text-align: center; }

    .items-list { display: flex; flex-direction: column; }
    .items-list__header { display: grid; grid-template-columns: 1fr 80px 100px 90px 40px; gap: 0.5rem; padding: 0.5rem 0.25rem; border-bottom: 2px solid var(--color-border-light); }
    .items-list__header span { font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

    .item-row { display: grid; grid-template-columns: 1fr 80px 100px 90px 40px; gap: 0.5rem; align-items: center; padding: 0.625rem 0.25rem; border-bottom: 1px solid var(--color-border-subtle); }
    .col-product { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .item-name { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-sku { font-size: var(--font-size-xs); color: var(--color-text-muted); font-family: monospace; }
    .col-qty .qty-input, .col-cost .cost-input { width: 100%; padding: 0.375rem 0.5rem; text-align: right; }
    .col-sub { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-main); text-align: right; }
    .col-del { display: flex; justify-content: center; }
    .danger-btn { color: var(--color-danger); }
    .danger-btn:hover { background: var(--color-danger-bg); }

    .total-row { display: flex; align-items: center; justify-content: space-between; padding-top: 0.75rem; border-top: 2px solid var(--color-border-light); margin-top: 0.5rem; }
    .total-label { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-muted); }
    .total-value { font-size: 1.25rem; font-weight: var(--font-weight-bold); color: var(--color-text-main); }

    .po-form-page__footer { display: flex; justify-content: flex-end; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border-light); }
  `]
})
export class PurchaseOrderFormComponent implements OnInit {
  private orderService   = inject(PurchaseOrderService);
  private supplierService = inject(SupplierService);
  private branchService  = inject(BranchService);
  private toastService   = inject(ToastService);
  private router         = inject(Router);
  private route          = inject(ActivatedRoute);
  private http           = inject(HttpClient);

  isEdit         = signal(false);
  editId         = signal<string | null>(null);
  isLoadingOrder = signal(false);
  isSaving       = signal(false);

  selectedSupplierId = '';
  selectedBranchId   = '';
  notes              = '';
  itemsSignal        = signal<LineItem[]>([]);
  items              = this.itemsSignal.asReadonly();
  initialSupplier    = signal<SearchSelectOption | undefined>(undefined);

  private branchesResponse = signal<any>({ data: [] });
  branches = computed(() => this.branchesResponse()?.data ?? []);

  total = computed(() => this.itemsSignal().reduce((s, i) => s + i.quantity * i.unitCost, 0));

  canSave = computed(() =>
    !!this.selectedSupplierId && !!this.selectedBranchId && this.itemsSignal().length > 0
  );

  // ─── Search functions para SearchSelect ───────────────────────────────────

  supplierSearchFn = (query: string, page: number): Observable<{ data: SearchSelectOption[]; hasMore: boolean }> => {
    const params = new HttpParams().set('search', query).set('page', page).set('limit', 20);
    return this.http.get<any>(`${environment.apiUrl}/business/suppliers`, { params }).pipe(
      map(res => {
        const payload = res?.data ?? res;
        const list = payload?.data ?? payload ?? [];
        return {
          data: list.map((s: any) => ({ value: s.id, label: s.name, description: s.ruc ?? '' })),
          hasMore: false
        };
      })
    );
  };

  variantSearchFn = (query: string, page: number): Observable<{ data: SearchSelectOption[]; hasMore: boolean }> => {
    const params = new HttpParams().set('q', query).set('page', page).set('limit', 20);
    return this.http.get<any>(`${environment.apiUrl}/business/products/variants/search`, { params }).pipe(
      map(res => {
        const payload = res?.data ?? res;
        const list = payload?.data ?? payload ?? [];
        return {
          data: list.map((v: any) => ({
            value: v.variantId,
            label: `${v.productName} — ${v.variantName}`,
            description: `SKU: ${v.sku}`,
            meta: { sku: v.sku, costPrice: v.costPrice }
          })),
          hasMore: payload?.hasMore ?? false
        };
      })
    );
  };

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit() {
    this.branchService.findAll({ limit: 100 }).subscribe(res => this.branchesResponse.set(res));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId.set(id);
      this.isLoadingOrder.set(true);
      this.orderService.findOne(id).subscribe({
        next: order => {
          this.selectedBranchId   = order.branchId;
          this.selectedSupplierId = order.supplierId;
          this.notes              = order.notes ?? '';
          this.initialSupplier.set({ value: order.supplierId, label: order.supplierName ?? '' } as SearchSelectOption);
          this.itemsSignal.set((order.items ?? []).map(item => ({
            variantId:    item.variantId,
            variantLabel: item.variantName ? `${item.productName} — ${item.variantName}` : item.variantId,
            sku:          item.sku ?? '',
            quantity:     item.quantity,
            unitCost:     Number(item.unitCost),
          })));
          this.isLoadingOrder.set(false);
        },
        error: () => { this.toastService.error('Error al cargar la orden'); this.isLoadingOrder.set(false); }
      });
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  onSupplierChange(opt: SearchSelectOption | SearchSelectOption[] | null) {
    this.selectedSupplierId = (opt as SearchSelectOption)?.value ?? '';
  }

  onVariantSelect(opt: SearchSelectOption | SearchSelectOption[] | null) {
    if (!opt || Array.isArray(opt)) return;
    const exists = this.itemsSignal().some(i => i.variantId === opt.value);
    if (exists) { this.toastService.error('Este producto ya está en la lista'); return; }
    this.itemsSignal.update(items => [...items, {
      variantId:    opt.value,
      variantLabel: opt.label,
      sku:          (opt as any).meta?.sku ?? '',
      quantity:     1,
      unitCost:     Number((opt as any).meta?.costPrice ?? 0),
    }]);
  }

  removeItem(index: number) {
    this.itemsSignal.update(items => items.filter((_, i) => i !== index));
  }

  recalculate() {
    this.itemsSignal.update(items => [...items]);
  }

  save() {
    if (!this.canSave()) return;
    this.isSaving.set(true);

    const payload = {
      supplierId: this.selectedSupplierId,
      branchId:   this.selectedBranchId,
      notes:      this.notes.trim() || undefined,
      items: this.itemsSignal().map(i => ({
        variantId: i.variantId,
        quantity:  i.quantity,
        unitCost:  i.unitCost,
      } as PurchaseOrderItemPayload)),
    };

    const request = this.isEdit()
      ? this.orderService.update(this.editId()!, payload)
      : this.orderService.create(payload);

    request.subscribe({
      next: () => {
        this.toastService.success(this.isEdit() ? 'Orden actualizada' : 'Orden creada como borrador');
        this.isSaving.set(false);
        this.router.navigate(['/inventario/ordenes-compra']);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al guardar la orden');
        this.isSaving.set(false);
      }
    });
  }

  goBack() { this.router.navigate(['/inventario/ordenes-compra']); }
}
