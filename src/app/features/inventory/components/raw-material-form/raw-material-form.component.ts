import {
  Component, ChangeDetectionStrategy, inject, signal, input, effect
} from '@angular/core';
import { ControlContainer, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { map } from 'rxjs';

import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { BarcodeFieldComponent } from '../../../../shared/components/ui/barcode-field/barcode-field.component';
import { StockTrackingConfigComponent } from '../stock-tracking-config/stock-tracking-config';
import { UnitsService } from '../../../../core/services/units.service';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';

@Component({
  selector: 'app-raw-material-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, SearchSelectComponent, FieldInputComponent, BarcodeFieldComponent, StockTrackingConfigComponent],
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
  styles: [`:host { display: flex; flex-direction: column; gap: 20px; }`],
  template: `
    <!-- SKU + Código de barras -->
    <div class="pff__row">
      <app-field-input
        formControlName="sku"
        label="SKU"
        placeholder="Ej: MAT-HARINA-001"
        prefixIcon="lucideHash"
        [optional]="true"
      ></app-field-input>
      <app-barcode-field
        formControlName="barcode"
        label="Código de Barras"
        [optional]="true"
        [productName]="productName()"
        [salePrice]="fg.get('costPrice')?.value"
      ></app-barcode-field>
    </div>

    <!-- Unidad base + Factor de conversión -->
    <div class="pff__row">
      <div class="pff">
        <label class="pff__label">Unidad Base <span class="pff__req">*</span></label>
        <app-search-select
          formControlName="baseUnitId"
          placeholder="Buscar unidad (kg, lt, und…)"
          [searchFn]="searchUnitsFn"
          [initialOption]="_unitOption()"
          (selectionChange)="onUnitChange($event)"
        ></app-search-select>
      </div>
      <app-field-input
        formControlName="conversionFactor"
        label="Factor de Conversión"
        type="number"
        placeholder="1"
        [optional]="true"
        [min]="0.0001"
        [step]="0.001"
        hint="Cuántas unidades base equivale a 1 unidad de compra"
      ></app-field-input>
    </div>

    <!-- Costo unitario -->
    <app-field-input
      formControlName="costPrice"
      label="Costo Unitario"
      type="number"
      placeholder="0.00"
      prefix="$"
      [optional]="true"
      [step]="0.01"
      [min]="0"
    ></app-field-input>

    <!-- Control de stock -->
    <app-stock-tracking-config></app-stock-tracking-config>
  `,
})
export class RawMaterialFormComponent {
  private unitsSvc = inject(UnitsService);
  fg = inject(ControlContainer).control as FormGroup;

  productName       = input('');
  initialUnitOption = input<SearchSelectOption | undefined>(undefined);
  _unitOption       = signal<SearchSelectOption | undefined>(undefined);

  constructor() {
    effect(() => { const o = this.initialUnitOption(); if (o) this._unitOption.set(o); });
  }

  onUnitChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (!Array.isArray(event)) this._unitOption.set(event ?? undefined);
  }

  searchUnitsFn = (query: string) =>
    this.unitsSvc.findAll({ search: query, onlyActive: true }).pipe(
      map(res => ({
        data: res.data.map((u: any) => ({ value: u.id, label: `${u.name} (${u.abbreviation})` } as SearchSelectOption)),
        hasMore: false
      }))
    );
}
