import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { BranchService } from '../../../../core/services/branch.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  PaymentCondition,
  PAYMENT_CONDITION_LABELS,
  CreatePurchaseOrderPayload,
  UpdatePurchaseOrderPayload,
  PurchaseOrderItemPayload,
} from '../../../../core/models/purchase-order.models';
import { environment } from '../../../../../environments/environment';

import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideTrash2, lucideSave, lucideArrowLeft,
  lucidePackagePlus, lucideCheck, lucideBuilding2,
  lucideTruck, lucideFileText, lucidePrinter,
} from '@ng-icons/lucide';

// ─── Local types ─────────────────────────────────────────────────────────────

interface LineItem {
  variantId: string;
  variantLabel: string;
  productName: string;
  variantName: string;
  sku: string;
  unitOfMeasure: string;
  quantityOrdered: number;
  unitCost: number;
  discountPercent: number;
  taxRate: number;
}

function calcLine(item: LineItem) {
  const base = item.quantityOrdered * item.unitCost;
  const disc = base * (item.discountPercent / 100);
  const sub  = base - disc;
  const iva  = sub * (item.taxRate / 100);
  return { base, disc, sub, iva, lineTotal: sub + iva };
}

const TAX_RATES = [
  { value: 0,  label: '0%' },
  { value: 5,  label: '5%' },
  { value: 15, label: '15%' },
];

const PAYMENT_CONDITIONS: { value: PaymentCondition; label: string }[] =
  (Object.entries(PAYMENT_CONDITION_LABELS) as [PaymentCondition, string][]).map(
    ([value, label]) => ({ value, label })
  );

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-purchase-order-form',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelectComponent, FormButtonComponent, SpinnerComponent, NgIconComponent],
  providers: [
    provideIcons({ lucidePlus, lucideTrash2, lucideSave, lucideArrowLeft, lucidePackagePlus, lucideCheck, lucideBuilding2, lucideTruck, lucideFileText, lucidePrinter })
  ],
  template: `
    <div class="doc-page">

      @if (isLoadingOrder()) {
        <div class="doc-loading"><app-spinner></app-spinner></div>
      } @else {

        <!-- ══ DOCUMENT HEADER ════════════════════════════════════════════ -->
        <div class="doc-header">
          <div class="doc-header__left">
            <button class="back-btn" (click)="goBack()">
              <ng-icon name="lucideArrowLeft" size="15"></ng-icon>
              Volver
            </button>
            <div class="doc-header__title">
              <span class="doc-header__label">ORDEN DE COMPRA</span>
              <h1 class="doc-header__number">
                {{ isEdit() ? editOrderNumber() : 'NUEVA' }}
              </h1>
            </div>
          </div>
          <div class="doc-header__actions">
            @if (isEdit()) {
              <span class="badge-status">Borrador</span>
            }
            <app-form-button
              [label]="isEdit() ? 'Actualizar' : 'Guardar Borrador'"
              loadingLabel="Guardando..."
              icon="lucideSave"
              variant="secondary"
              [loading]="isSaving() && !savingAndApproving()"
              [disabled]="!canSave() || isSaving()"
              (click)="save(false)"
            ></app-form-button>
            @if (!isEdit()) {
              <app-form-button
                label="Guardar y Aprobar"
                loadingLabel="Aprobando..."
                icon="lucideCheck"
                [loading]="isSaving() && savingAndApproving()"
                [disabled]="!canSave() || isSaving()"
                (click)="save(true)"
              ></app-form-button>
            }
          </div>
        </div>

        <!-- ══ TWO CARDS ROW ═════════════════════════════════════════════ -->
        <div class="doc-cards">

          <!-- Card: Proveedor -->
          <div class="doc-card doc-card--vendor">
            <div class="doc-card__head">
              <ng-icon name="lucideBuilding2" size="14"></ng-icon>
              <span>IDENTIFICACIÓN DEL PROVEEDOR</span>
            </div>
            <div class="doc-card__body">
              <div class="vendor-search">
                <app-search-select
                  placeholder="Buscar proveedor por nombre o RUC..."
                  searchPlaceholder="Buscar proveedor..."
                  [searchFn]="supplierSearchFn"
                  [initialOption]="initialSupplier()"
                  (selectionChange)="onSupplierChange($event)"
                ></app-search-select>
              </div>

              @if (selectedSupplierName()) {
                <div class="vendor-grid">
                  <div class="vendor-field">
                    <span class="vf-label">RUC / N° ID</span>
                    <span class="vf-value">{{ selectedSupplierRuc() || '—' }}</span>
                  </div>
                  <div class="vendor-field">
                    <span class="vf-label">RAZÓN SOCIAL</span>
                    <span class="vf-value">{{ selectedSupplierName() }}</span>
                  </div>
                  @if (selectedSupplierEmail()) {
                    <div class="vendor-field">
                      <span class="vf-label">CORREO DE CONTACTO</span>
                      <span class="vf-value">{{ selectedSupplierEmail() }}</span>
                    </div>
                  }
                  @if (selectedSupplierPhone()) {
                    <div class="vendor-field">
                      <span class="vf-label">TELÉFONO</span>
                      <span class="vf-value">{{ selectedSupplierPhone() }}</span>
                    </div>
                  }
                </div>
              } @else {
                <p class="vendor-empty">Selecciona un proveedor para ver su información</p>
              }
            </div>
          </div>

          <!-- Card: Logística -->
          <div class="doc-card doc-card--logistics">
            <div class="doc-card__head">
              <ng-icon name="lucideTruck" size="14"></ng-icon>
              <span>LOGÍSTICA</span>
            </div>
            <div class="doc-card__body">

              <div class="logi-field">
                <span class="lf-label">FECHA DE EMISIÓN</span>
                <span class="lf-value">{{ today | date:'MMM dd, yyyy' }}</span>
              </div>

              <div class="logi-field">
                <span class="lf-label">SUCURSAL DESTINO *</span>
                <select class="lf-select" [(ngModel)]="selectedBranchId">
                  <option value="">Seleccionar sucursal...</option>
                  @for (b of branches(); track b.id) {
                    <option [value]="b.id">{{ b.name }}</option>
                  }
                </select>
              </div>

              <div class="logi-field">
                <span class="lf-label">CONDICIÓN DE PAGO</span>
                <select class="lf-select" [(ngModel)]="paymentCondition">
                  @for (pc of paymentConditions; track pc.value) {
                    <option [value]="pc.value">{{ pc.label }}</option>
                  }
                </select>
              </div>

              <div class="logi-field">
                <span class="lf-label">FECHA DE ENTREGA ESPERADA</span>
                <input class="lf-input" type="date" [(ngModel)]="expectedDeliveryDate" />
              </div>

              <div class="logi-field">
                <span class="lf-label">DIRECCIÓN DE ENTREGA</span>
                <input class="lf-input" type="text" [(ngModel)]="deliveryAddress" placeholder="Dirección (opcional)" />
              </div>

            </div>
          </div>
        </div>

        <!-- ══ ORDER ITEMS TABLE ══════════════════════════════════════════ -->
        <div class="doc-section">
          <div class="doc-section__head">
            <span>ÍTEMS DE LA ORDEN</span>
            <div class="add-item-wrap">
              <app-search-select
                placeholder="+ Agregar producto"
                searchPlaceholder="Buscar por nombre o SKU..."
                [searchFn]="variantSearchFn"
                [initialOption]="variantSelectorReset()"
                (selectionChange)="onVariantSelect($event)"
              ></app-search-select>
            </div>
          </div>

          @if (items().length === 0) {
            <div class="items-empty">
              <ng-icon name="lucidePackagePlus" size="32"></ng-icon>
              <span>Busca y agrega productos desde el buscador de arriba</span>
            </div>
          } @else {
            <div class="items-table-wrap">
              <table class="items-tbl">
                <thead>
                  <tr>
                    <th class="th-code">CÓDIGO</th>
                    <th class="th-desc">DESCRIPCIÓN</th>
                    <th class="th-um">U.M.</th>
                    <th class="th-num">CANT.</th>
                    <th class="th-num">PRECIO</th>
                    <th class="th-num">DESC. %</th>
                    <th class="th-num">IVA</th>
                    <th class="th-num">IVA $</th>
                    <th class="th-num">TOTAL</th>
                    <th class="th-del"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of items(); track $index; let i = $index) {
                    @let c = lineCalc(item);
                    <tr class="item-row">
                      <td class="td-code">{{ item.sku || '—' }}</td>
                      <td class="td-desc">
                        <span class="item-name">{{ item.variantLabel }}</span>
                      </td>
                      <td class="td-um">
                        <input class="cell-in" type="text" [(ngModel)]="item.unitOfMeasure"
                          (ngModelChange)="touch()" placeholder="UN" maxlength="10" />
                      </td>
                      <td class="td-num">
                        <input class="cell-in cell-right" type="number" min="1" step="1"
                          [(ngModel)]="item.quantityOrdered" (ngModelChange)="touch()" />
                      </td>
                      <td class="td-num">
                        <input class="cell-in cell-right" type="number" min="0" step="0.01"
                          [(ngModel)]="item.unitCost" (ngModelChange)="touch()" />
                      </td>
                      <td class="td-num">
                        <input class="cell-in cell-right" type="number" min="0" max="100" step="0.1"
                          [(ngModel)]="item.discountPercent" (ngModelChange)="touch()" />
                      </td>
                      <td class="td-num">
                        <select class="cell-sel" [(ngModel)]="item.taxRate" (ngModelChange)="touch()">
                          @for (t of taxRates; track t.value) {
                            <option [value]="t.value">{{ t.label }}</option>
                          }
                        </select>
                      </td>
                      <td class="td-num td-muted">{{ c.iva | currency:'USD':'symbol':'1.2-2' }}</td>
                      <td class="td-num td-bold">{{ c.lineTotal | currency:'USD':'symbol':'1.2-2' }}</td>
                      <td class="td-del">
                        <button class="del-btn" (click)="removeItem(i)">
                          <ng-icon name="lucideTrash2" size="13"></ng-icon>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- ── Totals block ──────────────────────────────────────────── -->
            <div class="totals-block">
              <div class="totals-rows">
                <div class="t-row">
                  <span class="t-label">SUBTOTAL</span>
                  <span class="t-val">{{ subtotal() | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
                @if (totalDiscount() > 0) {
                  <div class="t-row">
                    <span class="t-label">DESCUENTO TOTAL</span>
                    <span class="t-val t-val--red">- {{ totalDiscount() | currency:'USD':'symbol':'1.2-2' }}</span>
                  </div>
                }
                @if (baseIva0() > 0) {
                  <div class="t-row">
                    <span class="t-label">BASE IVA 0%</span>
                    <span class="t-val">{{ baseIva0() | currency:'USD':'symbol':'1.2-2' }}</span>
                  </div>
                }
                @if (baseIva5() > 0) {
                  <div class="t-row">
                    <span class="t-label">BASE IVA 5%</span>
                    <span class="t-val">{{ baseIva5() | currency:'USD':'symbol':'1.2-2' }}</span>
                  </div>
                  <div class="t-row">
                    <span class="t-label">IVA (5%)</span>
                    <span class="t-val">{{ ivaAmount5() | currency:'USD':'symbol':'1.2-2' }}</span>
                  </div>
                }
                @if (baseIva15() > 0) {
                  <div class="t-row">
                    <span class="t-label">BASE IVA 15%</span>
                    <span class="t-val">{{ baseIva15() | currency:'USD':'symbol':'1.2-2' }}</span>
                  </div>
                  <div class="t-row">
                    <span class="t-label">IVA (15%)</span>
                    <span class="t-val">{{ ivaAmount15() | currency:'USD':'symbol':'1.2-2' }}</span>
                  </div>
                }
              </div>
              <div class="t-grand">
                <span>TOTAL</span>
                <span>{{ total() | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            </div>
          }
        </div>

        <!-- ══ INTERNAL NOTES ════════════════════════════════════════════ -->
        <div class="doc-section doc-section--notes">
          <div class="doc-section__head">
            <ng-icon name="lucideFileText" size="14"></ng-icon>
            <span>NOTAS INTERNAS</span>
          </div>
          <textarea class="notes-input" rows="3" [(ngModel)]="internalNotes"
            placeholder="Observaciones, condiciones especiales, instrucciones de entrega..."></textarea>
        </div>

        <!-- ══ FOOTER ACTIONS ════════════════════════════════════════════ -->
        <div class="doc-footer">
          <app-form-button label="Cancelar" variant="secondary" [disabled]="isSaving()" (click)="goBack()"></app-form-button>
          <div class="doc-footer__right">
            <app-form-button
              [label]="isEdit() ? 'Actualizar Borrador' : 'Guardar como Borrador'"
              loadingLabel="Guardando..."
              icon="lucideSave"
              variant="secondary"
              [loading]="isSaving() && !savingAndApproving()"
              [disabled]="!canSave() || isSaving()"
              (click)="save(false)"
            ></app-form-button>
            @if (!isEdit()) {
              <app-form-button
                label="Guardar y Aprobar"
                loadingLabel="Aprobando..."
                icon="lucideCheck"
                [loading]="isSaving() && savingAndApproving()"
                [disabled]="!canSave() || isSaving()"
                (click)="save(true)"
              ></app-form-button>
            }
          </div>
        </div>

      }
    </div>
  `,
  styles: [`
    /* ── Page wrapper ──────────────────────────────────────────────────────── */
    .doc-page {
      display: flex; flex-direction: column; gap: 1.5rem;
      max-width: 1100px; margin: 0 auto; padding-bottom: 2rem;
    }
    .doc-loading { display: flex; justify-content: center; padding: 5rem; }

    /* ── Document header ───────────────────────────────────────────────────── */
    .doc-header {
      display: flex; align-items: flex-end; justify-content: space-between;
      flex-wrap: wrap; gap: 1rem;
      padding-bottom: 1.25rem;
      border-bottom: 2px solid var(--color-border-light);
    }
    .doc-header__left { display: flex; flex-direction: column; gap: 0.5rem; }
    .back-btn {
      display: inline-flex; align-items: center; gap: 0.375rem;
      background: none; border: none; cursor: pointer;
      color: var(--color-text-muted); font-size: var(--font-size-xs);
      padding: 0; transition: color var(--transition-base);
    }
    .back-btn:hover { color: var(--color-text-main); }
    .doc-header__label {
      font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
      color: var(--color-text-muted); text-transform: uppercase;
    }
    .doc-header__number {
      font-size: 2rem; font-weight: 800; color: var(--color-text-main);
      margin: 0; letter-spacing: -0.02em; line-height: 1;
    }
    .doc-header__actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .badge-status {
      padding: 4px 12px; border-radius: 99px;
      background: var(--color-border-subtle); color: var(--color-text-muted);
      font-size: 11px; font-weight: 600;
    }

    /* ── Two-card row ──────────────────────────────────────────────────────── */
    .doc-cards {
      display: grid; grid-template-columns: 1fr 340px; gap: 1.25rem;
    }
    @media (max-width: 860px) { .doc-cards { grid-template-columns: 1fr; } }

    .doc-card {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .doc-card__head {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--color-border-light);
      background: var(--color-bg-subtle);
      font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
      color: var(--color-text-muted); text-transform: uppercase;
    }
    .doc-card__body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

    /* Vendor card */
    .vendor-search { }
    .vendor-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 1.5rem;
      padding-top: 0.25rem;
    }
    .vendor-field { display: flex; flex-direction: column; gap: 3px; }
    .vf-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.07em;
      color: var(--color-text-muted); text-transform: uppercase;
    }
    .vf-value { font-size: var(--font-size-sm); color: var(--color-text-main); font-weight: 500; }
    .vendor-empty { font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0.5rem 0 0; }

    /* Logistics card */
    .logi-field { display: flex; flex-direction: column; gap: 4px; }
    .lf-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.07em;
      color: var(--color-text-muted); text-transform: uppercase;
    }
    .lf-value { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-main); }
    .lf-select, .lf-input {
      width: 100%; padding: 0.45rem 0.75rem; box-sizing: border-box;
      border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
      background: var(--color-bg-surface); color: var(--color-text-main);
      font-size: var(--font-size-sm); transition: border-color var(--transition-base);
    }
    .lf-select:focus, .lf-input:focus { outline: none; border-color: var(--color-accent-primary); }
    .lf-select { cursor: pointer; }

    /* ── Order items section ───────────────────────────────────────────────── */
    .doc-section {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .doc-section__head {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--color-border-light);
      background: var(--color-bg-subtle);
      font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
      color: var(--color-text-muted); text-transform: uppercase;
    }
    .add-item-wrap { width: 280px; }

    .items-empty {
      display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
      padding: 3rem 1rem; color: var(--color-text-muted); font-size: var(--font-size-sm);
    }

    /* Items table */
    .items-table-wrap { overflow-x: auto; }
    .items-tbl { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }

    .items-tbl th {
      padding: 0.625rem 0.75rem; text-align: left;
      font-size: 10px; font-weight: 700; letter-spacing: 0.07em;
      color: var(--color-text-muted); text-transform: uppercase;
      border-bottom: 1px solid var(--color-border-light);
      white-space: nowrap; background: var(--color-bg-subtle);
    }
    .th-num, .items-tbl td.td-num { text-align: right; }
    .th-del { width: 36px; }

    .item-row { border-bottom: 1px solid var(--color-border-subtle); transition: background var(--transition-base); }
    .item-row:last-child { border-bottom: none; }
    .item-row:hover { background: var(--color-bg-hover); }

    .items-tbl td { padding: 0.5rem 0.75rem; vertical-align: middle; }
    .td-code { font-family: monospace; font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }
    .td-desc { min-width: 180px; }
    .item-name { font-weight: var(--font-weight-medium); color: var(--color-text-main); }
    .td-muted { color: var(--color-text-muted); }
    .td-bold { font-weight: var(--font-weight-semibold); color: var(--color-text-main); }

    .cell-in {
      width: 100%; padding: 0.3rem 0.4rem; box-sizing: border-box;
      border: 1px solid transparent; border-radius: var(--radius-sm);
      background: transparent; color: var(--color-text-main);
      font-size: var(--font-size-sm); transition: border-color var(--transition-base), background var(--transition-base);
    }
    .cell-in:hover { border-color: var(--color-border-light); background: var(--color-bg-hover); }
    .cell-in:focus { outline: none; border-color: var(--color-accent-primary); background: var(--color-bg-surface); }
    .cell-right { text-align: right; }
    .cell-sel {
      width: 100%; padding: 0.3rem 0.25rem; box-sizing: border-box;
      border: 1px solid transparent; border-radius: var(--radius-sm);
      background: transparent; color: var(--color-text-main);
      font-size: var(--font-size-sm); cursor: pointer;
    }
    .cell-sel:hover { border-color: var(--color-border-light); background: var(--color-bg-hover); }
    .cell-sel:focus { outline: none; border-color: var(--color-accent-primary); }
    .td-del { width: 36px; }
    .del-btn {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border: none; background: none;
      border-radius: var(--radius-sm); color: var(--color-text-muted);
      cursor: pointer; transition: all var(--transition-base);
    }
    .del-btn:hover { color: var(--color-danger); background: var(--color-danger-bg); }

    /* Totals block */
    .totals-block {
      display: flex; flex-direction: column; align-items: flex-end;
      padding: 1rem 1.25rem; border-top: 2px solid var(--color-border-light);
      gap: 0.75rem;
    }
    .totals-rows { display: flex; flex-direction: column; gap: 0.375rem; min-width: 280px; }
    .t-row { display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
    .t-label {
      font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
      color: var(--color-text-muted); text-transform: uppercase;
    }
    .t-val { font-size: var(--font-size-sm); color: var(--color-text-main); font-weight: 500; }
    .t-val--red { color: var(--color-danger-text); font-weight: 600; }
    .t-grand {
      display: flex; justify-content: space-between; align-items: baseline;
      gap: 2rem; min-width: 280px;
      padding-top: 0.625rem; border-top: 2px solid var(--color-border-light);
    }
    .t-grand span:first-child {
      font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
      color: var(--color-text-muted); text-transform: uppercase;
    }
    .t-grand span:last-child {
      font-size: 1.625rem; font-weight: 800; color: var(--color-text-main);
      letter-spacing: -0.02em;
    }

    /* Notes section */
    .doc-section--notes .doc-section__head { justify-content: flex-start; }
    .notes-input {
      width: 100%; padding: 1rem 1.25rem; box-sizing: border-box;
      border: none; border-radius: 0;
      background: var(--color-bg-surface); color: var(--color-text-main);
      font-size: var(--font-size-sm); resize: vertical; min-height: 80px;
      font-family: inherit;
    }
    .notes-input:focus { outline: none; }
    .notes-input::placeholder { color: var(--color-text-muted); }

    /* Footer */
    .doc-footer {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 0.75rem;
      padding-top: 1rem; border-top: 1px solid var(--color-border-light);
    }
    .doc-footer__right { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  `]
})
export class PurchaseOrderFormComponent implements OnInit {
  private orderService  = inject(PurchaseOrderService);
  private branchService = inject(BranchService);
  private toastService  = inject(ToastService);
  private router        = inject(Router);
  private route         = inject(ActivatedRoute);
  private http          = inject(HttpClient);

  readonly taxRates          = TAX_RATES;
  readonly paymentConditions = PAYMENT_CONDITIONS;
  readonly today             = new Date();

  isEdit             = signal(false);
  editId             = signal<string | null>(null);
  editOrderNumber    = signal('');
  isLoadingOrder     = signal(false);
  isSaving           = signal(false);
  savingAndApproving = signal(false);

  // Form state
  selectedSupplierId    = '';
  selectedSupplierName  = signal('');
  selectedSupplierRuc   = signal('');
  selectedSupplierEmail = signal('');
  selectedSupplierPhone = signal('');

  selectedBranchId      = '';
  paymentCondition: PaymentCondition = 'CONTADO';
  expectedDeliveryDate  = '';
  deliveryAddress       = '';
  internalNotes         = '';

  initialSupplier      = signal<SearchSelectOption | undefined>(undefined);
  variantSelectorReset = signal<SearchSelectOption | undefined>(undefined);

  private itemsSignal = signal<LineItem[]>([]);
  items = this.itemsSignal.asReadonly();

  private branchesRaw = signal<{ data: any[] }>({ data: [] });
  branches = computed(() => this.branchesRaw()?.data ?? []);

  // ─── Computed totals ────────────────────────────────────────────────────────

  private calcs = computed(() => this.itemsSignal().map(calcLine));

  subtotal      = computed(() => this.calcs().reduce((s, c) => s + c.sub,  0));
  totalDiscount = computed(() => this.calcs().reduce((s, c) => s + c.disc, 0));
  baseIva0      = computed(() => this.itemsSignal().filter(i => i.taxRate === 0).reduce((s, i)  => s + calcLine(i).sub, 0));
  baseIva5      = computed(() => this.itemsSignal().filter(i => i.taxRate === 5).reduce((s, i)  => s + calcLine(i).sub, 0));
  baseIva15     = computed(() => this.itemsSignal().filter(i => i.taxRate === 15).reduce((s, i) => s + calcLine(i).sub, 0));
  ivaAmount5    = computed(() => this.baseIva5()  * 0.05);
  ivaAmount15   = computed(() => this.baseIva15() * 0.15);
  totalIva      = computed(() => this.calcs().reduce((s, c) => s + c.iva, 0));
  total         = computed(() => this.subtotal() + this.totalIva());

  canSave = computed(() =>
    !!this.selectedSupplierId && !!this.selectedBranchId && this.itemsSignal().length > 0
  );

  // ─── Search functions ───────────────────────────────────────────────────────

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

  variantSearchFn = (query: string, page: number): Observable<{ data: SearchSelectOption[]; hasMore: boolean }> => {
    const params = new HttpParams().set('q', query).set('page', page).set('limit', 20);
    return this.http.get<any>(`${environment.apiUrl}/business/products/variants/search`, { params }).pipe(
      map(res => {
        const payload = res?.data ?? res;
        const list: any[] = payload?.data ?? payload ?? [];
        return {
          data: list.map(v => ({
            value: v.variantId,
            label: `${v.productName}${v.variantName ? ' — ' + v.variantName : ''}`,
            description: `SKU: ${v.sku ?? '—'}`,
            meta: { sku: v.sku, productName: v.productName, variantName: v.variantName, costPrice: v.costPrice }
          })),
          hasMore: payload?.hasMore ?? false
        };
      })
    );
  };

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit() {
    this.branchService.findAll({ limit: 100 }).subscribe(res => this.branchesRaw.set(res as any));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId.set(id);
      this.isLoadingOrder.set(true);
      this.orderService.findOne(id).subscribe({
        next: order => {
          this.editOrderNumber.set(order.orderNumber);
          this.selectedSupplierId = order.supplierId;
          this.selectedBranchId   = order.branchId;
          this.paymentCondition   = order.paymentCondition ?? 'CONTADO';
          this.expectedDeliveryDate = order.expectedDeliveryDate?.slice(0, 10) ?? '';
          this.deliveryAddress    = order.deliveryAddress ?? '';
          this.internalNotes      = order.internalNotes ?? '';
          this.initialSupplier.set({
            value:       order.supplierId,
            label:       order.supplierName ?? '',
            description: order.supplierRuc ? `RUC: ${order.supplierRuc}` : '',
          });
          this.selectedSupplierName.set(order.supplierName ?? '');
          this.selectedSupplierRuc.set(order.supplierRuc ?? '');
          this.itemsSignal.set((order.items ?? []).map(item => ({
            variantId:       item.variantId,
            variantLabel:    item.variantName
              ? `${item.productName} — ${item.variantName}`
              : (item.productName ?? item.variantId),
            productName:     item.productName ?? '',
            variantName:     item.variantName ?? '',
            sku:             item.sku ?? '',
            unitOfMeasure:   item.unitOfMeasure ?? 'UN',
            quantityOrdered: item.quantityOrdered,
            unitCost:        Number(item.unitCost),
            discountPercent: Number(item.discountPercent ?? 0),
            taxRate:         Number(item.taxRate ?? 0),
          })));
          this.isLoadingOrder.set(false);
        },
        error: () => {
          this.toastService.error('Error al cargar la orden');
          this.isLoadingOrder.set(false);
        }
      });
    }
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  onSupplierChange(opt: SearchSelectOption | SearchSelectOption[] | null) {
    const s = opt as SearchSelectOption | null;
    this.selectedSupplierId = s?.value ?? '';
    const m = (s as any)?.meta ?? {};
    this.selectedSupplierName.set(s?.label ?? '');
    this.selectedSupplierRuc.set(m.ruc ?? '');
    this.selectedSupplierEmail.set(m.email ?? '');
    this.selectedSupplierPhone.set(m.phone ?? '');
  }

  onVariantSelect(opt: SearchSelectOption | SearchSelectOption[] | null) {
    if (!opt || Array.isArray(opt)) return;
    if (this.itemsSignal().some(i => i.variantId === opt.value)) {
      this.toastService.error('Este producto ya está en la lista');
      return;
    }
    const m = (opt as any).meta ?? {};
    this.itemsSignal.update(items => [...items, {
      variantId:       opt.value,
      variantLabel:    opt.label,
      productName:     m.productName ?? '',
      variantName:     m.variantName ?? '',
      sku:             m.sku ?? '',
      unitOfMeasure:   'UN',
      quantityOrdered: 1,
      unitCost:        Number(m.costPrice ?? 0),
      discountPercent: 0,
      taxRate:         15,
    }]);
    this.variantSelectorReset.set(undefined);
  }

  removeItem(index: number) {
    this.itemsSignal.update(items => items.filter((_, i) => i !== index));
  }

  touch() { this.itemsSignal.update(items => [...items]); }

  lineCalc(item: LineItem) { return calcLine(item); }

  // ─── Save ──────────────────────────────────────────────────────────────────

  save(approve: boolean) {
    if (!this.canSave()) return;
    this.isSaving.set(true);
    this.savingAndApproving.set(approve);

    const base = {
      supplierId:           this.selectedSupplierId,
      branchId:             this.selectedBranchId,
      paymentCondition:     this.paymentCondition,
      expectedDeliveryDate: this.expectedDeliveryDate || undefined,
      deliveryAddress:      this.deliveryAddress.trim() || undefined,
      internalNotes:        this.internalNotes.trim() || undefined,
      items: this.itemsSignal().map(i => ({
        variantId:       i.variantId,
        variantName:     i.variantName || undefined,
        sku:             i.sku || undefined,
        productName:     i.productName || undefined,
        unitOfMeasure:   i.unitOfMeasure || undefined,
        quantityOrdered: i.quantityOrdered,
        unitCost:        i.unitCost,
        discountPercent: i.discountPercent || undefined,
        taxRate:         i.taxRate,
      } as PurchaseOrderItemPayload)),
    };

    const request = this.isEdit()
      ? this.orderService.update(this.editId()!, base as UpdatePurchaseOrderPayload)
      : this.orderService.create(base as CreatePurchaseOrderPayload);

    request.subscribe({
      next: order => {
        if (approve && !this.isEdit()) {
          this.orderService.approve(order.id).subscribe({
            next: () => {
              this.toastService.success('Orden creada y aprobada');
              this.isSaving.set(false);
              this.router.navigate(['/inventario/ordenes-compra']);
            },
            error: (err: any) => {
              this.toastService.error(err?.error?.message || 'Orden guardada pero error al aprobar');
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

  goBack() { this.router.navigate(['/inventario/ordenes-compra']); }
}
