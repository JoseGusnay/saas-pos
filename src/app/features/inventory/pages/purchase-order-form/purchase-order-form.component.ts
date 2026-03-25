import { Component, computed, HostListener, inject, OnInit, signal, ElementRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map, Observable, of, Subject, debounceTime, distinctUntilChanged, switchMap, finalize, takeUntil } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { BranchService } from '../../../../core/services/branch.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { TaxService } from '../../../../core/services/tax.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import {
  PaymentCondition,
  PAYMENT_CONDITION_LABELS,
  CreatePurchaseOrderPayload,
  UpdatePurchaseOrderPayload,
  PurchaseOrderItemPayload,
} from '../../../../core/models/purchase-order.models';
import { environment } from '../../../../../environments/environment';

import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { DatePickerComponent } from '../../../../shared/components/ui/date-picker/date-picker';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/ui/custom-select/custom-select.component';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { BackButtonComponent } from '../../../../shared/components/ui/back-button/back-button';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideTrash2, lucideSave, lucideArrowLeft,
  lucidePackagePlus, lucideCheck, lucideBuilding2,
  lucideTruck, lucideFileText, lucidePrinter, lucideCalendar, lucidePencil,
  lucideSearch, lucideWarehouse, lucideX, lucidePackage,
  lucideHash, lucideCircleDot, lucideChevronRight,
} from '@ng-icons/lucide';

// ─── Local types ─────────────────────────────────────────────────────────────

interface TaxDetail {
  id: string;
  name: string;
  percentage: number;
}

interface ItemMeta {
  variantLabel: string;
  productName: string;
  variantName: string;
  sku: string;
  unitId: string | null;
  taxDetails: TaxDetail[];
}

interface ProductSearchResult {
  variantId: string;
  label: string;
  productName: string;
  variantName: string;
  sku: string;
  costPrice: number;
  unitAbbreviation: string;
  baseUnitId: string | null;
  taxes: any[];
}

function calcLine(fg: FormGroup, meta: ItemMeta) {
  const qty = fg.get('quantityOrdered')!.value ?? 0;
  const cost = fg.get('unitCost')!.value ?? 0;
  const disc = fg.get('discountPercent')!.value ?? 0;
  const base = qty * cost;
  const discAmt = base * (disc / 100);
  const sub = base - discAmt;
  const totalTaxRate = meta.taxDetails.reduce((sum, t) => sum + t.percentage, 0);
  const taxes = +(sub * totalTaxRate / 100).toFixed(2);
  return { base, disc: discAmt, sub, taxes, lineTotal: sub + taxes };
}

const DOC_TYPE_OPTIONS: SelectOption[] = [
  { value: 'FACTURA', label: 'Factura' },
  { value: 'LIQUIDACION_COMPRA', label: 'Liquidación de Compra' },
];

const PAYMENT_CONDITIONS: { value: PaymentCondition; label: string }[] = [
  { value: 'CONTADO', label: 'Contado' },
  { value: 'CREDITO_15', label: 'Crédito 15 días' },
  { value: 'CREDITO_30', label: 'Crédito 30 días' },
  { value: 'CREDITO_60', label: 'Crédito 60 días' },
  { value: 'CREDITO_90', label: 'Crédito 90 días' },
];

const STEPPER_STEPS = [
  { key: 'BORRADOR', label: 'Borrador', icon: 'lucidePencil' },
  { key: 'APROBADA', label: 'Aprobada', icon: 'lucideCheck' },
  { key: 'RECIBIDA', label: 'Recibida', icon: 'lucidePackage' },
  { key: 'CERRADA', label: 'Cerrada', icon: 'lucideCircleDot' },
];

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-purchase-order-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SearchSelectComponent, DatePickerComponent, FormButtonComponent, SpinnerComponent, NgIconComponent, CustomSelectComponent, FieldInputComponent, BackButtonComponent],
  providers: [
    provideIcons({ lucidePlus, lucideTrash2, lucideSave, lucideArrowLeft, lucidePackagePlus, lucideCheck, lucideBuilding2, lucideTruck, lucideFileText, lucidePrinter, lucideCalendar, lucidePencil, lucideSearch, lucideWarehouse, lucideX, lucidePackage, lucideHash, lucideCircleDot, lucideChevronRight })
  ],
  template: `
    <div class="doc-page" [class.doc-page--saving]="isSaving()">

      @if (isLoadingOrder()) {
        <div class="doc-loading"><app-spinner></app-spinner></div>
      } @else {

        <!-- ══ TOP BAR (back + actions) ══════════════════════════════════ -->
        <div class="doc-topbar">
          <app-back-button label="Órdenes" (clicked)="goBack()"></app-back-button>
          <div class="doc-topbar__actions">
            @if (isEdit()) {
              <span class="status-pill status-pill--draft">
                <ng-icon name="lucidePencil" size="11"></ng-icon>
                Editando
              </span>
            }
            <app-form-button
              [label]="isEdit() ? 'Actualizar' : 'Guardar Borrador'"
              loadingLabel="Guardando..."
              icon="lucideSave"
              variant="secondary"
              [loading]="isSaving() && !savingAndApproving()"
              [disabled]="isSaving()"
              (click)="save(false)"
            ></app-form-button>
            @if (!isEdit()) {
              <app-form-button
                label="Guardar y Aprobar"
                loadingLabel="Aprobando..."
                icon="lucideCheck"
                [loading]="isSaving() && savingAndApproving()"
                [disabled]="isSaving()"
                (click)="save(true)"
              ></app-form-button>
            }
          </div>
        </div>

        <!-- ══ DOCUMENT HEADER ════════════════════════════════════════════ -->
        <div class="doc-header">
          <div class="doc-header__identity">
            <span class="doc-header__eyebrow">ORDEN DE COMPRA</span>
            <h1 class="doc-header__number">
              {{ isEdit() ? editOrderNumber() : 'NUEVA' }}
            </h1>
            <div class="doc-header__meta">
              <span class="meta-chip">
                <ng-icon name="lucideCalendar" size="12"></ng-icon>
                {{ today | date:'dd MMM yyyy' }}
              </span>
              @if (selectedBranchName()) {
                <span class="meta-chip">
                  <ng-icon name="lucideBuilding2" size="12"></ng-icon>
                  {{ selectedBranchName() }}
                </span>
              }
              @if (selectedWarehouseName()) {
                <span class="meta-chip">
                  <ng-icon name="lucideWarehouse" size="12"></ng-icon>
                  {{ selectedWarehouseName() }}
                </span>
              }
            </div>
          </div>

          <!-- Stepper -->
          <div class="doc-stepper">
            @for (step of stepperSteps; track step.key; let i = $index; let last = $last) {
              <div class="stepper-step"
                [class.stepper-step--active]="currentStepIndex() >= i"
                [class.stepper-step--current]="currentStepIndex() === i">
                <div class="stepper-dot">
                  @if (currentStepIndex() > i) {
                    <ng-icon name="lucideCheck" size="10"></ng-icon>
                  } @else {
                    <span class="stepper-dot__num">{{ i + 1 }}</span>
                  }
                </div>
                <span class="stepper-label">{{ step.label }}</span>
              </div>
              @if (!last) {
                <div class="stepper-line" [class.stepper-line--active]="currentStepIndex() > i"></div>
              }
            }
          </div>
        </div>

        <!-- ══ TWO CARDS ROW ═════════════════════════════════════════════ -->
        <div class="doc-cards">

          <!-- Card: Proveedor -->
          <div class="doc-card doc-card--vendor">
            <div class="doc-card__head">
              <ng-icon name="lucideBuilding2" size="14"></ng-icon>
              <span>Proveedor</span>
            </div>
            <div class="doc-card__body">
              <div class="logi-field" [class.field-locked]="isEdit()">
                <label class="lf-label">Tipo de documento</label>
                @if (isEdit()) {
                  <span class="lf-value">{{ form.get('documentType')!.value === 'FACTURA' ? 'Factura' : 'Liquidación de Compra' }}</span>
                } @else {
                  <app-custom-select
                    [options]="docTypeOptions"
                    [value]="form.get('documentType')!.value"
                    (valueChange)="form.get('documentType')!.setValue($event)"
                  ></app-custom-select>
                }
              </div>
              <div class="logi-field" [class.field-error]="submitted() && !form.get('supplierId')!.value" [class.field-locked]="isEdit()">
                <label class="lf-label">Proveedor <span class="required">*</span></label>
                @if (isEdit()) {
                  <span class="lf-value">{{ selectedSupplierName() }}</span>
                } @else {
                  <app-search-select
                    placeholder="Buscar proveedor por nombre o RUC..."
                    searchPlaceholder="Buscar proveedor..."
                    [searchFn]="supplierSearchFn"
                    [initialOption]="initialSupplier()"
                    (selectionChange)="onSupplierChange($event)"
                  ></app-search-select>
                }
                @if (submitted() && !form.get('supplierId')!.value) {
                  <span class="field-error-msg">Selecciona un proveedor</span>
                }
              </div>

              @if (selectedSupplierName()) {
                <div class="vendor-info-grid">
                  <div class="vendor-info-item">
                    <span class="vendor-info-item__label">RUC / Identificación</span>
                    <span class="vendor-info-item__value">{{ selectedSupplierRuc() || '—' }}</span>
                  </div>
                  <div class="vendor-info-item">
                    <span class="vendor-info-item__label">Razón Social</span>
                    <span class="vendor-info-item__value">{{ selectedSupplierName() }}</span>
                  </div>
                  @if (selectedSupplierEmail()) {
                    <div class="vendor-info-item">
                      <span class="vendor-info-item__label">Correo</span>
                      <span class="vendor-info-item__value">{{ selectedSupplierEmail() }}</span>
                    </div>
                  }
                  @if (selectedSupplierPhone()) {
                    <div class="vendor-info-item">
                      <span class="vendor-info-item__label">Teléfono</span>
                      <span class="vendor-info-item__value">{{ selectedSupplierPhone() }}</span>
                    </div>
                  }
                </div>
              } @else {
                <div class="vendor-empty">
                  <ng-icon name="lucideBuilding2" size="20"></ng-icon>
                  <span>Selecciona un proveedor para ver su información</span>
                </div>
              }
            </div>
          </div>

          <!-- Card: Logística y Bodega -->
          <div class="doc-card doc-card--logistics">
            <div class="doc-card__head">
              <ng-icon name="lucideTruck" size="14"></ng-icon>
              <span>Logística y Destino</span>
            </div>
            <div class="doc-card__body">

              <div class="logi-field">
                <span class="lf-label">Fecha de emisión</span>
                <span class="lf-value lf-value--date">
                  <ng-icon name="lucideCalendar" size="13"></ng-icon>
                  {{ today | date:'EEEE, dd MMMM yyyy' }}
                </span>
              </div>

              <div class="logi-field" [class.field-error]="submitted() && !form.get('branchId')!.value">
                <span class="lf-label">Sucursal destino <span class="required">*</span></span>
                <app-search-select
                  placeholder="Seleccionar sucursal..."
                  searchPlaceholder="Buscar sucursal..."
                  [searchFn]="branchSearchFn"
                  [initialOption]="initialBranch()"
                  (selectionChange)="onBranchChange($event)"
                ></app-search-select>
                @if (submitted() && !form.get('branchId')!.value) {
                  <span class="field-error-msg">Selecciona una sucursal</span>
                }
              </div>

              <div class="logi-field" [class.field-error]="submitted() && !form.get('warehouseId')!.value">
                <span class="lf-label">
                  <ng-icon name="lucideWarehouse" size="12"></ng-icon>
                  Bodega destino <span class="required">*</span>
                </span>
                <app-search-select
                  placeholder="Seleccionar bodega..."
                  searchPlaceholder="Buscar bodega..."
                  [searchFn]="warehouseSearchFn"
                  [initialOption]="initialWarehouse()"
                  (selectionChange)="onWarehouseChange($event)"
                ></app-search-select>
                @if (submitted() && !form.get('warehouseId')!.value) {
                  <span class="field-error-msg">Selecciona una bodega</span>
                }
                @if (!form.get('branchId')!.value && !submitted()) {
                  <span class="field-hint">Selecciona primero una sucursal</span>
                }
              </div>

              <div class="logi-field">
                <span class="lf-label">Condición de pago</span>
                <app-search-select
                  placeholder="Seleccionar condición..."
                  searchPlaceholder="Buscar condición..."
                  [searchFn]="paymentConditionSearchFn"
                  [initialOption]="initialPaymentCondition()"
                  (selectionChange)="onPaymentConditionChange($event)"
                ></app-search-select>
              </div>

              <div class="logi-field">
                <span class="lf-label">Fecha de entrega esperada</span>
                <app-date-picker
                  [formControl]="$any(form.get('expectedDeliveryDate'))"
                  placeholder="Seleccionar fecha..."
                  [disablePast]="true"
                ></app-date-picker>
              </div>

              <app-field-input
                label="Dirección de entrega"
                [formControl]="$any(form.get('deliveryAddress'))"
                placeholder="Dirección (opcional)"
              ></app-field-input>

            </div>
          </div>
        </div>

        <!-- ══ PRODUCT SEARCH COMMAND BAR ════════════════════════════════ -->
        <div class="command-bar" [class.command-bar--focused]="productSearchFocused()" [class.field-error]="submitted() && itemsArray.length === 0">
          <div class="command-bar__icon">
            <ng-icon name="lucideSearch" size="18"></ng-icon>
          </div>
          <input
            #productSearchInput
            class="command-bar__input"
            type="text"
            [placeholder]="isMobile() ? 'Buscar productos...' : 'Buscar productos por nombre o SKU para agregar a la orden...'"
            [value]="productSearchQuery()"
            (input)="onProductSearchInput($event)"
            (focus)="onProductSearchFocus()"
            (blur)="onProductSearchBlur()"
            (keydown)="onProductSearchKeydown($event)"
            autocomplete="off"
          />
          @if (productSearchQuery()) {
            <button class="command-bar__clear" (mousedown)="clearProductSearch($event)">
              <ng-icon name="lucideX" size="14"></ng-icon>
            </button>
          }
          @if (isSearchingProducts()) {
            <div class="command-bar__spinner"></div>
          }
          <div class="command-bar__shortcut">
            <kbd>/</kbd>
          </div>

          <!-- Results dropdown -->
          @if (showProductResults()) {
            <div class="command-results" (mousedown)="$event.preventDefault()">
              @if (productResults().length === 0 && !isSearchingProducts()) {
                <div class="command-results__empty">
                  <ng-icon name="lucidePackagePlus" size="24"></ng-icon>
                  <span>{{ productSearchQuery().length < 2 ? 'Escribe al menos 2 caracteres...' : 'No se encontraron productos' }}</span>
                </div>
              } @else {
                @for (product of productResults(); track product.variantId; let i = $index) {
                  <button class="product-result"
                    [class.product-result--highlighted]="highlightedResultIndex() === i"
                    (mousedown)="selectProduct(product, $event)"
                    (mouseenter)="highlightedResultIndex.set(i)">
                    <div class="product-result__main">
                      <span class="product-result__name">{{ product.label }}</span>
                      <div class="product-result__details">
                        @if (product.sku) {
                          <span class="product-result__sku">
                            <ng-icon name="lucideHash" size="10"></ng-icon>
                            {{ product.sku }}
                          </span>
                        }
                        @if (product.unitAbbreviation) {
                          <span class="product-result__unit">{{ product.unitAbbreviation }}</span>
                        }
                      </div>
                    </div>
                    <div class="product-result__price">
                      {{ product.costPrice | currency:'USD':'symbol':'1.2-2' }}
                    </div>
                    <div class="product-result__add">
                      <ng-icon name="lucidePlus" size="14"></ng-icon>
                    </div>
                  </button>
                }
                @if (productResultsHasMore()) {
                  <div class="command-results__more">Continúa escribiendo para refinar...</div>
                }
              }
            </div>
          }
        </div>

        <!-- ══ ORDER ITEMS TABLE ══════════════════════════════════════════ -->
        <div class="doc-section" [class.field-error-border]="submitted() && itemsArray.length === 0">
          <div class="doc-section__head">
            <div class="doc-section__head-left">
              <ng-icon name="lucidePackage" size="14"></ng-icon>
              <span>Ítems de la Orden</span>
              @if (itemsArray.length > 0) {
                <span class="items-count">{{ itemsArray.length }}</span>
              }
            </div>
          </div>

          @if (itemsArray.length === 0) {
            <div class="items-empty" [class.items-empty--error]="submitted()">
              <div class="items-empty__icon">
                <ng-icon name="lucidePackagePlus" size="36"></ng-icon>
              </div>
              <span class="items-empty__title">{{ submitted() ? 'Agrega al menos un producto' : 'Sin productos aún' }}</span>
              <span class="items-empty__subtitle">Usa el buscador de arriba para agregar productos a esta orden</span>
            </div>
          } @else {
            <!-- Desktop table -->
            <div class="items-table-wrap">
              <table class="items-tbl">
                <thead>
                  <tr>
                    <th class="th-idx">#</th>
                    <th class="th-code">Código</th>
                    <th class="th-desc">Descripción</th>
                    <th class="th-um">U.M.</th>
                    <th class="th-num">Cantidad</th>
                    <th class="th-num">P. Unitario</th>
                    <th class="th-num">Desc. %</th>
                    <th>Impuestos</th>
                    <th class="th-num">Imp. $</th>
                    <th class="th-num">Total</th>
                    <th class="th-del"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (fg of itemsArray.controls; track fg; let i = $index) {
                    @let meta = itemsMeta()[i];
                    @let c = lineCalc(i);
                    <tr class="item-row" [class.item-row--highlight]="highlightIndex() === i">
                      <td class="td-idx">{{ i + 1 }}</td>
                      <td class="td-code">{{ meta.sku || '—' }}</td>
                      <td class="td-desc">
                        <span class="item-name">{{ meta.variantLabel }}</span>
                      </td>
                      <td class="td-um">
                        <input class="cell-in" type="text" [formControl]="$any(fg.get('unitOfMeasure'))" placeholder="UN" maxlength="10" />
                      </td>
                      <td class="td-num">
                        <input class="cell-in cell-right" type="number" [formControl]="$any(fg.get('quantityOrdered'))" min="1" step="1" />
                      </td>
                      <td class="td-num">
                        <input class="cell-in cell-right" type="number" [formControl]="$any(fg.get('unitCost'))" min="0" step="0.01" />
                      </td>
                      <td class="td-num">
                        <input class="cell-in cell-right" type="number" [formControl]="$any(fg.get('discountPercent'))" min="0" max="100" step="0.1" />
                      </td>
                      <td class="td-tax">
                        <app-search-select
                          placeholder="Impuestos"
                          [multiple]="true"
                          [searchFn]="searchTaxesFn"
                          [initialOptions]="getTaxOptions(i)"
                          (selectionChange)="onItemTaxChange($event, i)"
                        ></app-search-select>
                      </td>
                      <td class="td-num td-muted">{{ c.taxes | currency:'USD':'symbol':'1.2-2' }}</td>
                      <td class="td-num td-total">{{ c.lineTotal | currency:'USD':'symbol':'1.2-2' }}</td>
                      <td class="td-del">
                        <button type="button" class="del-btn" (click)="removeItem(i)" title="Eliminar ítem">
                          <ng-icon name="lucideTrash2" size="13"></ng-icon>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Mobile cards -->
            <div class="items-mobile">
              @for (fg of itemsArray.controls; track fg; let i = $index) {
                @let meta = itemsMeta()[i];
                @let c = lineCalc(i);
                <div class="mobile-item-card">
                  <div class="mobile-item-card__head">
                    <div>
                      <span class="mobile-item-card__name">{{ meta.variantLabel }}</span>
                      @if (meta.sku) { <span class="mobile-item-card__sku">{{ meta.sku }}</span> }
                    </div>
                    <button type="button" class="del-btn" (click)="removeItem(i)">
                      <ng-icon name="lucideTrash2" size="14"></ng-icon>
                    </button>
                  </div>
                  <div class="mobile-item-card__fields">
                    <div class="mobile-item-card__field">
                      <label>Cant.</label>
                      <input class="cell-in cell-right" type="number" [formControl]="$any(fg.get('quantityOrdered'))" min="1" step="1" />
                    </div>
                    <div class="mobile-item-card__field">
                      <label>Precio</label>
                      <input class="cell-in cell-right" type="number" [formControl]="$any(fg.get('unitCost'))" min="0" step="0.01" />
                    </div>
                    <div class="mobile-item-card__field">
                      <label>Desc. %</label>
                      <input class="cell-in cell-right" type="number" [formControl]="$any(fg.get('discountPercent'))" min="0" max="100" step="0.1" />
                    </div>
                    <div class="mobile-item-card__field">
                      <label>Total</label>
                      <span class="mobile-item-card__total">{{ c.lineTotal | currency:'USD':'symbol':'1.2-2' }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- ── Totals block ──────────────────────────────────────────── -->
            <div class="totals-block">
              <div class="totals-rows">
                <div class="t-row">
                  <span class="t-label">Subtotal</span>
                  <span class="t-val">{{ subtotal() | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
                @if (totalDiscount() > 0) {
                  <div class="t-row">
                    <span class="t-label">Descuento total</span>
                    <span class="t-val t-val--discount">- {{ totalDiscount() | currency:'USD':'symbol':'1.2-2' }}</span>
                  </div>
                }
                @for (tax of taxBreakdown(); track tax.name) {
                  <div class="t-row">
                    <span class="t-label">{{ tax.name }} <span class="t-base">(base {{ tax.base | currency:'USD':'symbol':'1.2-2' }})</span></span>
                    <span class="t-val">{{ tax.amount | currency:'USD':'symbol':'1.2-2' }}</span>
                  </div>
                }
              </div>
              <div class="t-grand">
                <span class="t-grand__label">Total</span>
                <span class="t-grand__value">{{ total() | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            </div>
          }
        </div>

        <!-- ══ INTERNAL NOTES ════════════════════════════════════════════ -->
        <div class="doc-section doc-section--notes">
          <div class="doc-section__head">
            <div class="doc-section__head-left">
              <ng-icon name="lucideFileText" size="14"></ng-icon>
              <span>Notas Internas</span>
            </div>
          </div>
          <textarea class="notes-input" rows="3" [formControl]="$any(form.get('internalNotes'))"
            placeholder="Observaciones, condiciones especiales, instrucciones de entrega..."></textarea>
        </div>

      }
    </div>
  `,
  styles: [`
    /* ── Page wrapper ──────────────────────────────────────────────────────── */
    .doc-page {
      display: flex; flex-direction: column; gap: 1.25rem;
      max-width: 1120px; margin: 0 auto;
      padding: 24px 32px 3rem;
    }
    @media (max-width: 768px) { .doc-page { padding: 20px 16px 2rem; } }
    .doc-page--saving { pointer-events: none; opacity: 0.6; }
    .doc-loading { display: flex; justify-content: center; padding: 5rem; }

    /* ── Top bar ───────────────────────────────────────────────────────────── */
    .doc-topbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; flex-wrap: wrap;
    }
    .doc-topbar__actions {
      display: flex; align-items: center; gap: 0.625rem; flex-wrap: wrap;
    }
    .status-pill {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 12px; border-radius: 99px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
    }
    .status-pill--draft {
      background: var(--color-info-bg); color: var(--color-info-text);
    }

    /* ── Document header ───────────────────────────────────────────────────── */
    .doc-header {
      display: flex; align-items: flex-end; justify-content: space-between;
      flex-wrap: wrap; gap: 1.5rem;
      padding: 1.75rem 2rem;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    .doc-header__identity { display: flex; flex-direction: column; gap: 0.375rem; }
    .doc-header__eyebrow {
      font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
      color: var(--color-accent-interactive); text-transform: uppercase;
    }
    .doc-header__number {
      font-size: 1.75rem; font-weight: 800; color: var(--color-text-main);
      margin: 0; letter-spacing: -0.03em; line-height: 1;
    }
    .doc-header__meta {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
      margin-top: 0.5rem;
    }
    .meta-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 99px;
      background: var(--color-bg-canvas); border: 1px solid var(--color-border-light);
      font-size: 11px; font-weight: 500; color: var(--color-text-soft);
    }

    /* ── Stepper ───────────────────────────────────────────────────────────── */
    .doc-stepper {
      display: flex; align-items: center; gap: 0;
    }
    .stepper-step {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      min-width: 60px;
    }
    .stepper-dot {
      width: 26px; height: 26px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: var(--color-bg-canvas);
      border: 2px solid var(--color-border-light);
      color: var(--color-text-muted);
      font-size: 10px; font-weight: 700;
      transition: all var(--transition-base);
    }
    .stepper-step--active .stepper-dot {
      background: var(--color-accent-interactive);
      border-color: var(--color-accent-interactive);
      color: #fff;
    }
    .stepper-step--current .stepper-dot {
      box-shadow: 0 0 0 3px var(--color-bg-surface), 0 0 0 5px var(--color-accent-interactive);
    }
    .stepper-label {
      font-size: 10px; font-weight: 600; color: var(--color-text-muted);
      letter-spacing: 0.02em; white-space: nowrap;
    }
    .stepper-step--active .stepper-label { color: var(--color-text-main); }
    .stepper-line {
      width: 32px; height: 2px; margin: 0 4px;
      background: var(--color-border-light);
      border-radius: 1px;
      margin-bottom: 18px;
      transition: background var(--transition-base);
    }
    .stepper-line--active { background: var(--color-accent-interactive); }

    @media (max-width: 640px) {
      .doc-stepper { display: none; }
    }

    /* ── Two-card row ──────────────────────────────────────────────────────── */
    .doc-cards {
      display: grid; grid-template-columns: 1fr minmax(280px, 380px); gap: 1.25rem;
    }
    @media (max-width: 860px) { .doc-cards { grid-template-columns: 1fr; } }

    .doc-card {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    .doc-card__head {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border-bottom: 1px solid var(--color-border-light);
      font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.02em;
      color: var(--color-text-soft);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }
    .doc-card__body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

    /* Vendor info */
    .vendor-info-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1.25rem;
      padding: 0.75rem 0.875rem;
      background: var(--color-bg-canvas);
      border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle);
    }
    .vendor-info-item { display: flex; flex-direction: column; gap: 2px; }
    .vendor-info-item__label {
      font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
      color: var(--color-text-muted); text-transform: uppercase;
    }
    .vendor-info-item__value { font-size: var(--font-size-sm); color: var(--color-text-main); font-weight: 500; }
    .vendor-empty {
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
      padding: 1.5rem 1rem; color: var(--color-text-muted);
      font-size: var(--font-size-sm); text-align: center;
      background: var(--color-bg-canvas); border-radius: var(--radius-md);
      border: 1px dashed var(--color-border-light);
    }

    /* Logistics fields */
    .logi-field { display: flex; flex-direction: column; gap: 6px; }
    .lf-label {
      font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
      color: var(--color-text-muted);
      display: inline-flex; align-items: center; gap: 4px;
    }
    .lf-value {
      font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-main);
    }
    .lf-value--date {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 0.5rem 0.75rem;
      background: var(--color-bg-canvas);
      border-radius: var(--radius-sm); border: 1px solid var(--color-border-subtle);
      color: var(--color-text-soft); font-weight: 500; font-size: var(--font-size-sm);
    }
    .required { color: var(--color-danger-text); }
    .field-locked { opacity: 0.7; pointer-events: none; }
    .field-hint {
      font-size: 11px; color: var(--color-text-muted); font-style: italic;
    }

    /* ── Command bar (product search) ──────────────────────────────────────── */
    .command-bar {
      position: relative;
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0 1.25rem;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      transition: border-color var(--transition-base), box-shadow var(--transition-base);
      min-height: 52px;
    }
    .command-bar--focused {
      border-color: var(--color-accent-interactive);
      box-shadow: var(--shadow-input-focus);
    }
    .command-bar.field-error {
      border-color: var(--color-danger-text);
    }
    .command-bar__icon { color: var(--color-text-muted); display: flex; flex-shrink: 0; }
    .command-bar--focused .command-bar__icon { color: var(--color-accent-interactive); }
    .command-bar__input {
      flex: 1; border: none; background: none; outline: none;
      font-size: var(--font-size-base); color: var(--color-text-main);
      padding: 0.75rem 0; font-family: inherit;
    }
    .command-bar__input::placeholder { color: var(--color-placeholder); }
    .command-bar__clear {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border: none; background: var(--color-bg-hover);
      border-radius: var(--radius-sm); color: var(--color-text-muted);
      cursor: pointer; transition: all var(--transition-fast); flex-shrink: 0;
    }
    .command-bar__clear:hover { background: var(--color-bg-active); color: var(--color-text-main); }
    .command-bar__spinner {
      width: 18px; height: 18px; border: 2px solid var(--color-border-light);
      border-top-color: var(--color-accent-interactive);
      border-radius: 50%; flex-shrink: 0;
      animation: cmd-spin 0.6s linear infinite;
    }
    @keyframes cmd-spin { to { transform: rotate(360deg); } }
    .command-bar__shortcut {
      flex-shrink: 0;
      kbd {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 22px; height: 22px; padding: 0 6px;
        background: var(--color-bg-canvas); border: 1px solid var(--color-border-light);
        border-radius: 4px; font-size: 11px; font-weight: 600;
        color: var(--color-text-muted); font-family: inherit;
      }
    }

    /* ── Command results dropdown ──────────────────────────────────────────── */
    .command-results {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-dropdown);
      max-height: 320px; overflow-y: auto;
      padding: 4px;
    }
    .command-results__empty {
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
      padding: 2rem 1rem; color: var(--color-text-muted); font-size: var(--font-size-sm);
    }
    .command-results__more {
      padding: 0.5rem 1rem; text-align: center;
      font-size: 11px; color: var(--color-text-muted); font-style: italic;
    }

    .product-result {
      display: flex; align-items: center; gap: 0.75rem;
      width: 100%; padding: 0.625rem 0.875rem;
      border: none; background: none; border-radius: var(--radius-md);
      cursor: pointer; text-align: left; font-family: inherit;
      transition: background var(--transition-fast);
      color: var(--color-text-main);
    }
    .product-result:hover, .product-result--highlighted {
      background: var(--color-bg-hover);
    }
    .product-result__main { flex: 1; min-width: 0; }
    .product-result__name {
      display: block; font-size: var(--font-size-sm); font-weight: 500;
      color: var(--color-text-main);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .product-result__details {
      display: flex; align-items: center; gap: 0.5rem; margin-top: 2px;
    }
    .product-result__sku {
      display: inline-flex; align-items: center; gap: 2px;
      font-family: monospace; font-size: 11px; color: var(--color-text-muted);
    }
    .product-result__unit {
      font-size: 11px; color: var(--color-text-muted);
      padding: 1px 6px; background: var(--color-bg-canvas);
      border-radius: 4px; font-weight: 500;
    }
    .product-result__price {
      font-size: var(--font-size-sm); font-weight: 600;
      color: var(--color-accent-interactive); white-space: nowrap;
    }
    .product-result__add {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: var(--radius-sm);
      color: var(--color-text-muted); transition: all var(--transition-fast);
      flex-shrink: 0;
    }
    .product-result:hover .product-result__add,
    .product-result--highlighted .product-result__add {
      background: var(--color-accent-interactive); color: #fff;
      border-radius: 50%;
    }

    /* ── Order items section ───────────────────────────────────────────────── */
    .doc-section {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    .field-error-border { border-color: var(--color-danger-text); }
    .doc-section__head {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; padding: 0.625rem 1.25rem;
      border-bottom: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }
    .doc-section__head-left {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: var(--font-size-xs); font-weight: 600; letter-spacing: 0.02em;
      color: var(--color-text-soft);
    }
    .items-count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 20px; height: 20px; padding: 0 6px;
      background: var(--color-accent-interactive); color: #fff;
      border-radius: 99px; font-size: 10px; font-weight: 700;
    }

    .items-empty {
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
      padding: 3rem 1rem; color: var(--color-text-muted); text-align: center;
    }
    .items-empty--error { color: var(--color-danger-text); }
    .items-empty__icon {
      width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;
      background: var(--color-bg-canvas); border-radius: 50%;
      margin-bottom: 0.25rem;
    }
    .items-empty--error .items-empty__icon { background: var(--color-danger-bg); }
    .items-empty__title { font-size: var(--font-size-sm); font-weight: 600; }
    .items-empty__subtitle { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .items-empty--error .items-empty__subtitle { color: var(--color-danger-text); opacity: 0.7; }

    /* Validation */
    .field-error :deep(.search-select__trigger),
    .field-error :deep(.custom-select__trigger) {
      border-color: var(--color-danger-text) !important;
    }
    .field-error-msg { display: block; margin-top: 4px; font-size: 11px; color: var(--color-danger-text); font-weight: 500; }

    /* Items table */
    .items-table-wrap { overflow-x: auto; }
    .items-tbl { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    .items-tbl th {
      padding: 0.5rem 0.75rem; text-align: left;
      font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border-light);
      white-space: nowrap;
    }
    .th-idx { width: 36px; text-align: center; }
    .th-num, .items-tbl td.td-num { text-align: right; }
    .th-del { width: 36px; }

    .item-row {
      border-bottom: 1px solid var(--color-border-subtle);
      transition: background var(--transition-fast);
    }
    .item-row:last-child { border-bottom: none; }
    .item-row:hover { background: var(--color-bg-hover); }
    .item-row--highlight { animation: row-flash 1.5s ease-out; }
    @keyframes row-flash {
      0%, 30% { background: var(--color-warning-bg); }
      100% { background: transparent; }
    }

    .items-tbl td { padding: 0.5rem 0.75rem; vertical-align: middle; }
    .td-idx {
      text-align: center; font-size: 11px; font-weight: 600;
      color: var(--color-text-muted); width: 36px;
    }
    .td-code {
      font-family: monospace; font-size: var(--font-size-xs);
      color: var(--color-text-muted); white-space: nowrap;
    }
    .td-desc { min-width: 180px; max-width: 280px; }
    .item-name {
      display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-weight: var(--font-weight-medium); color: var(--color-text-main);
    }
    .td-tax { min-width: 160px; }
    .td-muted { color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .td-total { font-weight: var(--font-weight-semibold); color: var(--color-text-main); }

    .cell-in {
      width: 100%; padding: 0.375rem 0.5rem; box-sizing: border-box;
      border: 1px solid transparent; border-radius: var(--radius-sm);
      background: transparent; color: var(--color-text-main);
      font-size: var(--font-size-sm);
      transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
    }
    .cell-in:hover { border-color: var(--color-border-light); background: var(--color-bg-hover); }
    .cell-in:focus {
      outline: none; border-color: var(--color-accent-interactive);
      background: var(--color-bg-surface); box-shadow: var(--shadow-input-focus);
    }
    .cell-right { text-align: right; }
    .td-del { width: 36px; }
    .del-btn {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border: none; background: none;
      border-radius: var(--radius-sm); color: var(--color-text-muted);
      cursor: pointer; transition: all var(--transition-fast);
      opacity: 0;
    }
    .item-row:hover .del-btn { opacity: 1; }
    .del-btn:hover { color: var(--color-danger-text); background: var(--color-danger-bg); }

    /* Mobile item cards */
    .items-mobile { display: none; }
    @media (max-width: 768px) {
      .items-table-wrap { display: none; }
      .items-mobile {
        display: flex; flex-direction: column; gap: 0.75rem; padding: 0.75rem;
      }
      .mobile-item-card {
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md); padding: 0.875rem;
        background: var(--color-bg-surface);
      }
      .mobile-item-card__head {
        display: flex; justify-content: space-between; align-items: flex-start;
        margin-bottom: 0.75rem; gap: 0.5rem;
      }
      .mobile-item-card__name {
        font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm);
        color: var(--color-text-main); display: block;
      }
      .mobile-item-card__sku { font-family: monospace; font-size: 11px; color: var(--color-text-muted); }
      .mobile-item-card__fields { display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem; }
      .mobile-item-card__field {
        display: flex; flex-direction: column; gap: 3px;
        label {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--color-text-muted); font-weight: var(--font-weight-semibold);
        }
        .cell-in {
          min-height: 40px; font-size: 15px;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-sm); padding: 0.5rem;
        }
      }
      .mobile-item-card .del-btn { opacity: 1; }
      .mobile-item-card__total {
        font-weight: var(--font-weight-bold); font-size: 15px;
        color: var(--color-text-main); padding: 0.5rem 0;
      }
    }

    /* ── Totals block ──────────────────────────────────────────────────────── */
    .totals-block {
      display: flex; flex-direction: column; align-items: flex-end;
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--color-border-light);
      background: var(--color-bg-canvas);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      gap: 0.875rem;
    }
    .totals-rows { display: flex; flex-direction: column; gap: 0.375rem; min-width: 300px; }
    .t-row { display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
    .t-label {
      font-size: var(--font-size-xs); font-weight: 500;
      color: var(--color-text-muted);
    }
    .t-base { font-weight: 400; font-size: 11px; opacity: 0.7; }
    .t-val { font-size: var(--font-size-sm); color: var(--color-text-main); font-weight: 500; }
    .t-val--discount { color: var(--color-danger-text); font-weight: 600; }
    .t-grand {
      display: flex; justify-content: space-between; align-items: baseline;
      gap: 2rem; min-width: 300px;
      padding-top: 0.875rem; border-top: 2px solid var(--color-border-light);
    }
    .t-grand__label {
      font-size: var(--font-size-xs); font-weight: 700; letter-spacing: 0.08em;
      color: var(--color-text-muted); text-transform: uppercase;
    }
    .t-grand__value {
      font-size: 1.5rem; font-weight: 800; color: var(--color-text-main); letter-spacing: -0.02em;
    }

    /* ── Notes section ─────────────────────────────────────────────────────── */
    .doc-section--notes .doc-section__head { justify-content: flex-start; }
    .notes-input {
      width: 100%; padding: 1rem 1.25rem; box-sizing: border-box;
      border: none; border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      background: var(--color-bg-surface); color: var(--color-text-main);
      font-size: var(--font-size-sm); resize: vertical; min-height: 80px; font-family: inherit;
    }
    .notes-input:focus { outline: none; background: var(--color-bg-input-focus); }
    .notes-input::placeholder { color: var(--color-placeholder); }

    /* ── Responsive ───────────────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .doc-page { gap: 1rem; padding-bottom: 2rem; }

      /* Top bar: stack actions below back button */
      .doc-topbar { flex-direction: column; align-items: stretch; gap: 0.75rem; }
      .doc-topbar__actions {
        display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;
      }
      .doc-topbar__actions .status-pill { grid-column: 1 / -1; justify-content: center; }
      .doc-topbar__actions ::ng-deep .btn { width: 100%; justify-content: center; }

      /* Totals */
      .totals-block { align-items: stretch; padding: 1rem; }
      .totals-rows { min-width: unset; width: 100%; }
      .t-grand { min-width: unset; width: 100%; }
      .t-grand__value { font-size: 1.25rem; }
    }

    /* Mobile flat: remove cards, content sits directly on canvas */
    @media (max-width: 600px) {
      .doc-page { gap: 0.75rem; }

      /* Document header → flat */
      .doc-header {
        background: transparent; border: none; box-shadow: none; border-radius: 0;
        padding: 0; gap: 0.75rem; flex-direction: column; align-items: flex-start;
      }
      .doc-header__number { font-size: 1.25rem; }
      .doc-header__meta { gap: 0.375rem; }
      .meta-chip { font-size: 10px; padding: 3px 8px; }

      /* Cards → flat */
      .doc-card {
        background: transparent; border: none; box-shadow: none; border-radius: 0;
      }
      .doc-card + .doc-card { margin-top: 0.5rem; }
      .doc-card__head {
        padding: 0 0 0.5rem 0; border-bottom: 1px solid var(--color-border-light);
        border-radius: 0; margin-bottom: 0.25rem;
      }
      .doc-card__body { padding: 0.75rem 0 0; gap: 0.875rem; }
      .vendor-info-grid { grid-template-columns: 1fr; gap: 0.625rem; }
      .vendor-empty { padding: 1rem 0.75rem; }

      /* Command bar → flat */
      .command-bar {
        border-radius: var(--radius-md); box-shadow: none;
        padding: 0 0.75rem; min-height: 46px; gap: 0.5rem;
      }
      .command-bar__shortcut { display: none; }
      .command-bar__input { font-size: var(--font-size-sm); }

      /* Items section → flat */
      .doc-section {
        background: transparent; border: none; box-shadow: none; border-radius: 0;
      }
      .doc-section__head {
        padding: 0 0 0.5rem 0; border-bottom: 1px solid var(--color-border-light);
        border-radius: 0;
      }
      .field-error-border { border: none; }
      .field-error-border .doc-section__head { border-bottom-color: var(--color-danger-text); }

      /* Mobile item cards */
      .mobile-item-card {
        background: var(--color-bg-surface); border-radius: var(--radius-md);
      }
      .mobile-item-card .del-btn { opacity: 1; }

      /* Totals → full width, flat bg */
      .totals-block {
        background: var(--color-bg-subtle); border-top: none;
        border-radius: var(--radius-md); padding: 1rem;
      }

      /* Notes → flat */
      .doc-section--notes { background: transparent; }
      .notes-input {
        border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
        padding: 0.875rem; background: var(--color-bg-surface);
      }
    }

    @media (max-width: 480px) {
      .doc-topbar__actions { grid-template-columns: 1fr; }
      .doc-header__number { font-size: 1.1rem; }
      .mobile-item-card { padding: 0.75rem; }
      .t-row { gap: 1rem; }
      .t-grand { gap: 1rem; }
    }
  `]
})
export class PurchaseOrderFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private orderService = inject(PurchaseOrderService);
  private branchService = inject(BranchService);
  private warehouseSvc = inject(WarehouseService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private taxSvc = inject(TaxService);
  private destroy$ = new Subject<void>();

  @ViewChild('productSearchInput') productSearchInput!: ElementRef<HTMLInputElement>;

  readonly docTypeOptions = DOC_TYPE_OPTIONS;
  readonly today = new Date();
  readonly stepperSteps = STEPPER_STEPS;

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  isEdit = signal(false);
  editId = signal<string | null>(null);
  editOrderNumber = signal('');
  isLoadingOrder = signal(false);
  isSaving = signal(false);
  savingAndApproving = signal(false);
  submitted = signal(false);
  savedSuccessfully = false;
  private userHasInteracted = false;

  // Supplier display
  selectedSupplierName = signal('');
  selectedSupplierRuc = signal('');
  selectedSupplierEmail = signal('');
  selectedSupplierPhone = signal('');

  // Branch / Warehouse display
  selectedBranchName = signal('');
  selectedWarehouseName = signal('');

  // Search select initial values
  initialSupplier = signal<SearchSelectOption | undefined>(undefined);
  initialBranch = signal<SearchSelectOption | undefined>(undefined);
  initialWarehouse = signal<SearchSelectOption | undefined>(undefined);
  initialPaymentCondition = signal<SearchSelectOption | undefined>({ value: 'CONTADO', label: 'Contado' });
  highlightIndex = signal<number | null>(null);

  // Stepper
  currentStepIndex = signal(0); // 0=Borrador for new/edit

  private branchesRaw = signal<{ data: any[] }>({ data: [] });
  branches = computed(() => this.branchesRaw()?.data ?? []);

  // ─── Product search (command bar) ─────────────────────────────────────────
  productSearchQuery = signal('');
  productSearchFocused = signal(false);
  isSearchingProducts = signal(false);
  productResults = signal<ProductSearchResult[]>([]);
  productResultsHasMore = signal(false);
  highlightedResultIndex = signal(0);
  private productSearch$ = new Subject<string>();

  showProductResults = computed(() =>
    this.productSearchFocused() && (this.productSearchQuery().length >= 1 || this.productResults().length > 0)
  );

  // ─── Reactive Form ────────────────────────────────────────────────────────

  form: FormGroup = this.fb.group({
    documentType: ['FACTURA'],
    supplierId: ['', Validators.required],
    branchId: ['', Validators.required],
    warehouseId: ['', Validators.required],
    paymentCondition: ['CONTADO'],
    expectedDeliveryDate: [''],
    deliveryAddress: ['', Validators.maxLength(500)],
    internalNotes: ['', Validators.maxLength(2000)],
    items: this.fb.array([], Validators.minLength(1)),
  });

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  private _itemsMeta = signal<ItemMeta[]>([]);
  itemsMeta = this._itemsMeta.asReadonly();

  // ─── Computed totals ───────────────────────────────────────────────────────

  private calcTrigger = signal(0);

  private allCalcs = computed(() => {
    this.calcTrigger();
    return this.itemsArray.controls.map((fg, i) =>
      calcLine(fg as FormGroup, this._itemsMeta()[i])
    );
  });

  subtotal = computed(() => this.allCalcs().reduce((s, c) => s + c.sub, 0));
  totalDiscount = computed(() => this.allCalcs().reduce((s, c) => s + c.disc, 0));
  totalTaxes = computed(() => this.allCalcs().reduce((s, c) => s + c.taxes, 0));
  total = computed(() => this.subtotal() + this.totalTaxes());

  taxBreakdown = computed(() => {
    this.calcTrigger();
    const map = new Map<string, { name: string; base: number; amount: number }>();
    for (let i = 0; i < this.itemsArray.length; i++) {
      const c = this.allCalcs()[i];
      if (!c) continue;
      const meta = this._itemsMeta()[i];
      for (const tax of meta.taxDetails) {
        const taxAmount = +(c.sub * tax.percentage / 100).toFixed(2);
        const existing = map.get(tax.id);
        if (existing) {
          existing.base += c.sub;
          existing.amount += taxAmount;
        } else {
          map.set(tax.id, { name: `${tax.name} (${tax.percentage}%)`, base: c.sub, amount: taxAmount });
        }
      }
    }
    return Array.from(map.values());
  });

  lineCalc(index: number) {
    return this.allCalcs()[index] ?? { base: 0, disc: 0, sub: 0, taxes: 0, lineTotal: 0 };
  }

  // ─── Dirty tracking ───────────────────────────────────────────────────────

  isDirty(): boolean {
    return this.form.dirty || this.userHasInteracted;
  }

  // ─── Tax helpers ──────────────────────────────────────────────────────────

  searchTaxesFn = (query: string) =>
    this.taxSvc.findAllSimple().pipe(
      map((taxes: any[]) => ({
        data: taxes
          .filter(t => t.name.toLowerCase().includes(query.toLowerCase()))
          .map(t => ({ value: t.id, label: `${t.name} (${t.percentage}%)`, extra: t } as SearchSelectOption)),
        hasMore: false
      }))
    );

  getTaxOptions(index: number): SearchSelectOption[] {
    const meta = this._itemsMeta()[index];
    return meta?.taxDetails.map(t => ({ value: t.id, label: `${t.name} (${t.percentage}%)` })) ?? [];
  }

  onItemTaxChange(event: SearchSelectOption | SearchSelectOption[] | null, index: number) {
    const metas = [...this._itemsMeta()];
    const meta = { ...metas[index] };
    if (Array.isArray(event)) {
      meta.taxDetails = event.map(e => ({
        id: e.value,
        name: (e as any).extra?.name ?? e.label.split(' (')[0],
        percentage: (e as any).extra?.percentage ?? 0,
      }));
    } else {
      meta.taxDetails = [];
    }
    metas[index] = meta;
    this._itemsMeta.set(metas);
    this.calcTrigger.update(v => v + 1);
  }

  // ─── Search functions ────────────────────────────────────────────────────

  paymentConditionSearchFn = (query: string): Observable<{ data: SearchSelectOption[]; hasMore: boolean }> => {
    const q = query.toLowerCase();
    const filtered = PAYMENT_CONDITIONS
      .filter(pc => !q || pc.label.toLowerCase().includes(q))
      .map(pc => ({ value: pc.value, label: pc.label }));
    return of({ data: filtered, hasMore: false });
  };

  branchSearchFn = (query: string): Observable<{ data: SearchSelectOption[]; hasMore: boolean }> => {
    const q = query.toLowerCase();
    const filtered = this.branches()
      .filter((b: any) => !q || b.name.toLowerCase().includes(q))
      .map((b: any) => ({ value: b.id, label: b.name }));
    return of({ data: filtered, hasMore: false });
  };

  warehouseSearchFn = (query: string): Observable<{ data: SearchSelectOption[]; hasMore: boolean }> => {
    const branchId = this.form.get('branchId')!.value;
    if (!branchId) return of({ data: [], hasMore: false });
    return this.warehouseSvc.findAll({ branchId, limit: 100, isActive: true, search: query || undefined }).pipe(
      map(res => ({
        data: (res.data ?? []).map(w => ({
          value: w.id,
          label: w.name,
          description: w.isDefault ? 'Bodega principal' : (w.description ?? undefined),
        })),
        hasMore: false
      }))
    );
  };

  supplierSearchFn = (query: string, page: number): Observable<{ data: SearchSelectOption[]; hasMore: boolean }> => {
    const params = new HttpParams().set('search', query).set('page', page).set('limit', 20);
    return this.http.get<any>(`${environment.apiUrl}/business/suppliers`, { params }).pipe(
      map(res => {
        const list: any[] = res?.data?.data ?? res?.data ?? [];
        return {
          data: list.map(s => ({
            value: s.id,
            label: s.name,
            description: `RUC: ${s.ruc ?? '—'}`,
            meta: { ruc: s.ruc, email: s.email, phone: s.phone }
          })),
          hasMore: false
        };
      })
    );
  };

  // ─── Product search (command bar) ─────────────────────────────────────────

  onProductSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.productSearchQuery.set(query);
    this.highlightedResultIndex.set(0);
    this.productSearch$.next(query);
  }

  onProductSearchFocus() {
    this.productSearchFocused.set(true);
    if (this.productSearchQuery().length >= 2) {
      this.productSearch$.next(this.productSearchQuery());
    }
  }

  onProductSearchBlur() {
    this.productSearchFocused.set(false);
  }

  clearProductSearch(e: Event) {
    e.preventDefault();
    this.productSearchQuery.set('');
    this.productResults.set([]);
    this.productSearchInput.nativeElement.value = '';
    this.productSearchInput.nativeElement.focus();
  }

  onProductSearchKeydown(event: KeyboardEvent) {
    const results = this.productResults();
    if (!this.showProductResults() || results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedResultIndex.update(i => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedResultIndex.update(i => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.highlightedResultIndex();
      if (results[idx]) this.selectProduct(results[idx]);
    } else if (event.key === 'Escape') {
      this.productSearchFocused.set(false);
      this.productSearchInput.nativeElement.blur();
    }
  }

  selectProduct(product: ProductSearchResult, event?: Event) {
    if (event) event.preventDefault();
    this.userHasInteracted = true;

    // Check duplicate
    const existingIdx = this._variantIds().indexOf(product.variantId);
    if (existingIdx >= 0) {
      this.toastService.error('Este producto ya está en la lista');
      this.highlightIndex.set(existingIdx);
      setTimeout(() => this.highlightIndex.set(null), 1500);
      return;
    }

    const fg = this.createItemGroup({
      unitId: product.baseUnitId,
      unitOfMeasure: product.unitAbbreviation || 'UN',
      quantityOrdered: 1,
      unitCost: Number(product.costPrice ?? 0),
    });
    this.itemsArray.push(fg);
    this._itemsMeta.update(metas => [...metas, {
      variantLabel: product.label,
      productName: product.productName,
      variantName: product.variantName,
      sku: product.sku,
      unitId: product.baseUnitId,
      taxDetails: (product.taxes ?? []).map((t: any) => ({ id: t.taxId, name: t.name, percentage: Number(t.percentage) })),
    }]);
    this._variantIds.update(ids => [...ids, product.variantId]);

    // Clear search
    this.productSearchQuery.set('');
    this.productResults.set([]);
    this.productSearchInput.nativeElement.value = '';
    this.productSearchInput.nativeElement.focus();
  }

  @HostListener('window:resize')
  onResize() { this.isMobile.set(window.innerWidth < 768); }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent) {
    if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      event.preventDefault();
      this.productSearchInput?.nativeElement?.focus();
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit() {
    this.form.valueChanges.subscribe(() => this.calcTrigger.update(v => v + 1));

    // Product search debounced pipe
    this.productSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(query => {
      if (query.length < 2) {
        this.productResults.set([]);
        this.isSearchingProducts.set(false);
        return;
      }
      this.isSearchingProducts.set(true);
      const params = new HttpParams()
        .set('search', query)
        .set('page', '1')
        .set('limit', '10')
        .set('isPurchasable', 'true');
      this.http.get<any>(`${environment.apiUrl}/business/products/variants/search`, { params }).pipe(
        finalize(() => this.isSearchingProducts.set(false))
      ).subscribe(res => {
        const payload = res?.data ?? res;
        const list: any[] = payload?.data ?? payload ?? [];
        this.productResults.set(list.map(v => ({
          variantId: v.variantId,
          label: `${v.productName}${v.variantName ? ' — ' + v.variantName : ''}`,
          productName: v.productName,
          variantName: v.variantName ?? '',
          sku: v.sku ?? '',
          costPrice: v.costPrice ?? 0,
          unitAbbreviation: v.unitAbbreviation ?? '',
          baseUnitId: v.baseUnitId ?? null,
          taxes: v.taxes ?? [],
        })));
        this.productResultsHasMore.set(payload?.hasMore ?? false);
        this.highlightedResultIndex.set(0);
      });
    });

    this.branchService.findAll({ limit: 100 }).subscribe(res => this.branchesRaw.set(res as any));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId.set(id);
      this.isLoadingOrder.set(true);
      this.orderService.findOne(id).subscribe({
        next: order => {
          this.editOrderNumber.set(order.orderNumber);

          // Set stepper based on status
          const stepIdx = STEPPER_STEPS.findIndex(s => s.key === order.status);
          this.currentStepIndex.set(stepIdx >= 0 ? stepIdx : 0);

          this.form.patchValue({
            documentType: order.documentType ?? 'FACTURA',
            supplierId: order.supplierId,
            branchId: order.branchId,
            warehouseId: order.warehouseId ?? '',
            paymentCondition: order.paymentCondition ?? 'CONTADO',
            expectedDeliveryDate: order.expectedDeliveryDate?.slice(0, 10) ?? '',
            deliveryAddress: order.deliveryAddress ?? '',
            internalNotes: order.internalNotes ?? '',
          });

          // Set search select initial values
          this.initialBranch.set({ value: order.branchId, label: (order as any).branchName ?? order.branchId });
          this.selectedBranchName.set((order as any).branchName ?? '');
          if (order.warehouseId) {
            this.initialWarehouse.set({ value: order.warehouseId, label: (order as any).warehouseName ?? order.warehouseId });
            this.selectedWarehouseName.set((order as any).warehouseName ?? '');
          }
          const pc = PAYMENT_CONDITIONS.find(p => p.value === order.paymentCondition);
          this.initialPaymentCondition.set({ value: order.paymentCondition, label: pc?.label ?? order.paymentCondition });
          this.initialSupplier.set({
            value: order.supplierId,
            label: order.supplierName ?? '',
            description: order.supplierRuc ? `RUC: ${order.supplierRuc}` : '',
          });
          this.selectedSupplierName.set(order.supplierName ?? '');
          this.selectedSupplierRuc.set(order.supplierRuc ?? '');

          // Populate items FormArray
          for (const item of order.items ?? []) {
            this.addItemFromData(item);
          }

          this.form.markAsPristine();
          this.isLoadingOrder.set(false);
        },
        error: () => {
          this.toastService.error('Error al cargar la orden');
          this.isLoadingOrder.set(false);
        }
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Item management ──────────────────────────────────────────────────────

  private createItemGroup(data: { unitId?: string | null; unitOfMeasure?: string; quantityOrdered?: number; unitCost?: number; discountPercent?: number }): FormGroup {
    return this.fb.group({
      unitId: [data.unitId ?? null],
      unitOfMeasure: [data.unitOfMeasure ?? 'UN'],
      quantityOrdered: [data.quantityOrdered ?? 1, [Validators.required, Validators.min(1)]],
      unitCost: [data.unitCost ?? 0, [Validators.required, Validators.min(0)]],
      discountPercent: [data.discountPercent ?? 0, [Validators.min(0), Validators.max(100)]],
    });
  }

  private addItemFromData(item: any) {
    const fg = this.createItemGroup({
      unitId: item.unitId ?? null,
      unitOfMeasure: item.unitAbbreviation ?? 'UN',
      quantityOrdered: item.quantityOrdered,
      unitCost: Number(item.unitCost),
      discountPercent: Number(item.discountPercent ?? 0),
    });
    this.itemsArray.push(fg);
    this._itemsMeta.update(metas => [...metas, {
      variantLabel: item.variantName ? `${item.productName} — ${item.variantName}` : (item.productName ?? item.variantId),
      productName: item.productName ?? '',
      variantName: item.variantName ?? '',
      sku: item.sku ?? '',
      unitId: item.unitId ?? null,
      taxDetails: (item.taxes ?? []).map((t: any) => ({ id: t.taxId, name: t.taxName?.split(' (')[0] ?? '', percentage: +t.taxRate })),
    }]);
    this._variantIds.update(ids => [...ids, item.variantId]);
  }

  // Keep legacy search-select fn for backward compat (used nowhere now but safe)
  variantSearchFn = (query: string, page: number): Observable<{ data: SearchSelectOption[]; hasMore: boolean }> => {
    const params = new HttpParams()
      .set('search', query)
      .set('page', String(page))
      .set('limit', '20')
      .set('isPurchasable', 'true');
    return this.http.get<any>(`${environment.apiUrl}/business/products/variants/search`, { params }).pipe(
      map(res => {
        const payload = res?.data ?? res;
        const list: any[] = payload?.data ?? payload ?? [];
        return {
          data: list.map(v => ({
            value: v.variantId,
            label: `${v.productName}${v.variantName ? ' — ' + v.variantName : ''}`,
            description: `SKU: ${v.sku ?? '—'}`,
            meta: { sku: v.sku, productName: v.productName, variantName: v.variantName, costPrice: v.costPrice, baseUnitId: v.baseUnitId, unitAbbreviation: v.unitAbbreviation, taxes: v.taxes ?? [] }
          })),
          hasMore: payload?.hasMore ?? false
        };
      })
    );
  };

  private _variantIds = signal<string[]>([]);
  private _getVariantId(index: number): string { return this._variantIds()[index] ?? ''; }

  async removeItem(index: number) {
    const meta = this._itemsMeta()[index];
    const fg = this.itemsArray.at(index) as FormGroup;
    if (meta && (fg.get('unitCost')!.value > 0 || fg.get('quantityOrdered')!.value > 1 || meta.taxDetails.length > 0)) {
      const confirmed = await this.confirmService.confirm({
        title: 'Eliminar producto',
        message: `¿Eliminar "${meta.productName || meta.variantLabel}" de la orden?`,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        variant: 'danger',
      });
      if (!confirmed) return;
    }
    this.itemsArray.removeAt(index);
    this._itemsMeta.update(m => m.filter((_, i) => i !== index));
    this._variantIds.update(ids => ids.filter((_, i) => i !== index));
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  onBranchChange(opt: SearchSelectOption | SearchSelectOption[] | null) {
    this.userHasInteracted = true;
    const b = opt as SearchSelectOption | null;
    const prevBranchId = this.form.get('branchId')!.value;
    this.form.get('branchId')!.setValue(b?.value ?? '');
    this.selectedBranchName.set(b?.label ?? '');

    // Reset warehouse when branch changes
    if (prevBranchId !== (b?.value ?? '')) {
      this.form.get('warehouseId')!.setValue('');
      this.initialWarehouse.set(undefined);
      this.selectedWarehouseName.set('');
    }
  }

  onWarehouseChange(opt: SearchSelectOption | SearchSelectOption[] | null) {
    this.userHasInteracted = true;
    const w = opt as SearchSelectOption | null;
    this.form.get('warehouseId')!.setValue(w?.value ?? '');
    this.selectedWarehouseName.set(w?.label ?? '');
  }

  onPaymentConditionChange(opt: SearchSelectOption | SearchSelectOption[] | null) {
    this.userHasInteracted = true;
    const pc = opt as SearchSelectOption | null;
    this.form.get('paymentCondition')!.setValue(pc?.value ?? 'CONTADO');
  }

  onSupplierChange(opt: SearchSelectOption | SearchSelectOption[] | null) {
    this.userHasInteracted = true;
    const s = opt as SearchSelectOption | null;
    this.form.get('supplierId')!.setValue(s?.value ?? '');
    const m = (s as any)?.meta ?? {};
    this.selectedSupplierName.set(s?.label ?? '');
    this.selectedSupplierRuc.set(m.ruc ?? '');
    this.selectedSupplierEmail.set(m.email ?? '');
    this.selectedSupplierPhone.set(m.phone ?? '');
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  save(approve: boolean) {
    this.submitted.set(true);
    if (this.form.invalid || this.itemsArray.length === 0) {
      this.form.markAllAsTouched();
      if (!this.form.get('supplierId')!.value) this.toastService.error('Selecciona un proveedor');
      else if (!this.form.get('branchId')!.value) this.toastService.error('Selecciona una sucursal');
      else if (!this.form.get('warehouseId')!.value) this.toastService.error('Selecciona una bodega');
      else if (this.itemsArray.length === 0) this.toastService.error('Agrega al menos un item');
      return;
    }

    this.isSaving.set(true);
    this.savingAndApproving.set(approve);

    const v = this.form.getRawValue();
    const payload = {
      documentType: v.documentType,
      supplierId: v.supplierId,
      branchId: v.branchId,
      warehouseId: v.warehouseId || undefined,
      paymentCondition: v.paymentCondition,
      expectedDeliveryDate: v.expectedDeliveryDate || undefined,
      deliveryAddress: v.deliveryAddress?.trim() || undefined,
      internalNotes: v.internalNotes?.trim() || undefined,
      items: v.items.map((item: any, i: number) => {
        const meta = this._itemsMeta()[i];
        return {
          variantId: this._getVariantId(i),
          variantName: meta.variantName || undefined,
          sku: meta.sku || undefined,
          productName: meta.productName || undefined,
          unitId: item.unitId || undefined,
          quantityOrdered: Number(item.quantityOrdered),
          unitCost: Number(item.unitCost),
          discountPercent: Number(item.discountPercent) || undefined,
          taxIds: meta.taxDetails.length ? meta.taxDetails.map(t => t.id) : undefined,
        } as PurchaseOrderItemPayload;
      }),
    };

    const request = this.isEdit()
      ? this.orderService.update(this.editId()!, payload as UpdatePurchaseOrderPayload)
      : this.orderService.create(payload as CreatePurchaseOrderPayload);

    request.subscribe({
      next: order => {
        this.savedSuccessfully = true;
        if (approve && !this.isEdit()) {
          this.orderService.approve(order.id).subscribe({
            next: () => {
              this.toastService.success('Orden creada y aprobada');
              this.isSaving.set(false);
              this.router.navigate(['/inventario/ordenes-compra']);
            },
            error: (err: any) => {
              this.toastService.error(err?.error?.message || 'Orden guardada como borrador, pero hubo un error al aprobar. Puedes aprobarla desde el listado.');
              this.isSaving.set(false);
              this.router.navigate(['/inventario/ordenes-compra']);
            }
          });
        } else {
          this.toastService.success(this.isEdit() ? 'Borrador actualizado' : 'Orden guardada como borrador');
          this.isSaving.set(false);
          this.router.navigate(['/inventario/ordenes-compra']);
        }
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al guardar la orden');
        this.isSaving.set(false);
      }
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(e: BeforeUnloadEvent) {
    if (this.isDirty() && !this.savedSuccessfully) {
      e.preventDefault();
    }
  }

  async goBack() {
    if (this.isDirty() && !this.savedSuccessfully) {
      const confirmed = await this.confirmService.confirm({
        title: 'Cambios sin guardar',
        message: 'Tienes cambios sin guardar en esta orden. ¿Deseas salir de todos modos?',
        confirmLabel: 'Salir sin guardar',
        cancelLabel: 'Seguir editando',
        variant: 'warning',
      });
      if (!confirmed) return;
    }
    this.savedSuccessfully = true;
    this.router.navigate(['/inventario/ordenes-compra']);
  }
}
