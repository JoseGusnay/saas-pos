import {
  Component, ChangeDetectionStrategy, inject, signal, input, effect
} from '@angular/core';
import { ControlContainer, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle } from '@ng-icons/lucide';

import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { BarcodeFieldComponent } from '../../../../shared/components/ui/barcode-field/barcode-field.component';
import { StockTrackingConfigComponent } from '../stock-tracking-config/stock-tracking-config';
import { UnitDrawerComponent } from '../unit-drawer/unit-drawer.component';
import { UnitsService } from '../../../../core/services/units.service';
import { Unit } from '../../../../core/models/unit.models';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { CategoryAttributeType } from '../../models/product.model';

@Component({
  selector: 'app-raw-material-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent, SearchSelectComponent, FieldInputComponent, BarcodeFieldComponent, StockTrackingConfigComponent, UnitDrawerComponent],
  providers: [provideIcons({ lucideAlertCircle })],
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
  styles: [`:host { display: flex; flex-direction: column; gap: 20px; }`],
  template: `
    <!-- Atributos de categoría dinámicos -->
    @if (categoryAttributes().length > 0) {
      <div class="pff__section-label">Características</div>
      <div class="pff__row" formGroupName="attributes">
        @for (cat of categoryAttributes(); track cat.attributeTypeId) {
          <app-field-input
            [formControlName]="cat.attributeTypeId"
            [label]="cat.attributeType.unit ? cat.attributeType.name + ' (' + cat.attributeType.unit + ')' : cat.attributeType.name"
            [type]="cat.attributeType.dataType === 'NUMBER' ? 'number' : 'text'"
            [placeholder]="cat.attributeType.dataType === 'NUMBER' ? 'Ej: 750' : 'Ej: ' + cat.attributeType.name"
            [required]="cat.isRequired"
            [optional]="!cat.isRequired"
          ></app-field-input>
        }
      </div>
    }

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
      <div class="pff" [class.pff--error]="fg.get('baseUnitId')?.invalid && fg.get('baseUnitId')?.touched">
        <label class="pff__label">Unidad Base <span class="pff__req">*</span></label>
        <app-search-select
          formControlName="baseUnitId"
          placeholder="Buscar unidad (kg, lt, und…)"
          [searchFn]="searchUnitsFn"
          [initialOption]="_unitOption()"
          createNewLabel="Crear nueva unidad"
          (selectionChange)="onUnitChange($event)"
          (createNew)="unitCreateOpen.set(true)"
        ></app-search-select>
        @if (fg.get('baseUnitId')?.invalid && fg.get('baseUnitId')?.touched) {
          <small class="pff__error">
            <ng-icon name="lucideAlertCircle"></ng-icon>
            Selecciona una unidad de medida.
          </small>
        }
      </div>
      <app-field-input
        formControlName="conversionFactor"
        label="Factor de Conversión"
        type="number"
        placeholder="1"
        [required]="true"
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

    <app-unit-drawer
      [isOpen]="unitCreateOpen()"
      (saved)="onUnitCreated($event)"
      (close)="unitCreateOpen.set(false)"
    ></app-unit-drawer>
  `,
})
export class RawMaterialFormComponent {
  private unitsSvc = inject(UnitsService);
  fg = inject(ControlContainer).control as FormGroup;

  categoryAttributes = input<CategoryAttributeType[]>([]);
  productName        = input('');
  initialUnitOption  = input<SearchSelectOption | undefined>(undefined);
  _unitOption       = signal<SearchSelectOption | undefined>(undefined);
  unitCreateOpen    = signal(false);

  constructor() {
    effect(() => { const o = this.initialUnitOption(); if (o) this._unitOption.set(o); });
  }

  onUnitChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (!Array.isArray(event)) this._unitOption.set(event ?? undefined);
  }

  onUnitCreated(unit: Unit) {
    const opt: SearchSelectOption = { value: unit.id, label: `${unit.name} (${unit.abbreviation})` };
    this.fg.get('baseUnitId')!.setValue(unit.id);
    this._unitOption.set(opt);
    this.unitCreateOpen.set(false);
  }

  searchUnitsFn = (query: string, page: number) =>
    this.unitsSvc.findAll({ search: query, page, limit: 8, onlyActive: true }).pipe(
      map(res => ({
        data: res.data.map((u: any) => ({ value: u.id, label: `${u.name} (${u.abbreviation})` } as SearchSelectOption)),
        hasMore: res.data.length === 8
      }))
    );
}
