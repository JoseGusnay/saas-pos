import {
  Component, ChangeDetectionStrategy, inject, signal, computed, input, output, effect
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ControlContainer, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle } from '@ng-icons/lucide';
import { map } from 'rxjs';

import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { BarcodeFieldComponent } from '../../../../shared/components/ui/barcode-field/barcode-field.component';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { StockTrackingConfigComponent } from '../stock-tracking-config/stock-tracking-config';
import { ToggleSwitchComponent } from '../../../../shared/components/ui/toggle-switch/toggle-switch';
import { UnitDrawerComponent } from '../unit-drawer/unit-drawer.component';
import { TaxService } from '../../../../core/services/tax.service';
import { UnitsService } from '../../../../core/services/units.service';
import { Unit } from '../../../../core/models/unit.models';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { CategoryAttributeType } from '../../models/product.model';

@Component({
  selector: 'app-physical-variant-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, NgIconComponent,
    SearchSelectComponent, BarcodeFieldComponent, FieldInputComponent, StockTrackingConfigComponent,
    ToggleSwitchComponent, UnitDrawerComponent
  ],
  providers: [provideIcons({ lucideAlertCircle })],
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
  templateUrl: './physical-variant-form.component.html',
  styles: [`:host { display: flex; flex-direction: column; gap: 20px; }`]
})
export class PhysicalVariantFormComponent {
  private taxSvc          = inject(TaxService);
  private unitsSvc        = inject(UnitsService);
  private fg = inject(ControlContainer).control as FormGroup;

  // ── Signal inputs ────────────────────────────────────────────────────────
  categoryAttributes      = input<CategoryAttributeType[]>([]);
  productName             = input('');
  initialTaxOptions       = input<SearchSelectOption[]>([]);
  initialUnitOption       = input<SearchSelectOption | undefined>(undefined);

  // ── Reactive form values ─────────────────────────────────────────────────
  private salePriceValue = toSignal(
    this.fg.get('salePrice')!.valueChanges,
    { initialValue: this.fg.get('salePrice')?.value ?? 0 }
  );
  private costPriceValue = toSignal(
    this.fg.get('costPrice')!.valueChanges,
    { initialValue: this.fg.get('costPrice')?.value ?? 0 }
  );

  hasBaseUnit = toSignal(
    this.fg.get('baseUnitId')!.valueChanges,
    { initialValue: this.fg.get('baseUnitId')?.value ?? '' }
  );

  simpleMargin = computed(() => {
    const sale = Number(this.salePriceValue()) || 0;
    const cost = Number(this.costPriceValue()) || 0;
    return sale > 0 ? ((sale - cost) / sale) * 100 : null;
  });

  // ── Signal outputs ──────────────────────────────────────────────────────
  taxOptionsChange = output<SearchSelectOption[]>();
  unitOptionChange = output<SearchSelectOption | undefined>();

  // ── Internal option tracking ─────────────────────────────────────────────
  _taxOptions         = signal<SearchSelectOption[]>([]);
  _unitOption         = signal<SearchSelectOption | undefined>(undefined);
  unitCreateOpen      = signal(false);

  constructor() {
    effect(() => { this._taxOptions.set(this.initialTaxOptions()); });
    effect(() => { const o = this.initialUnitOption(); if (o) this._unitOption.set(o); });
  }

  // ── Getters ──────────────────────────────────────────────────────────────
  get salePriceCtrl() { return this.fg.get('salePrice'); }

  // ── Event handlers ───────────────────────────────────────────────────────
  onTaxChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (Array.isArray(event))  { this._taxOptions.set(event); this.taxOptionsChange.emit(event); }
    else if (!event)           { this._taxOptions.set([]); this.taxOptionsChange.emit([]); }
  }

  onUnitChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (!Array.isArray(event)) {
      this._unitOption.set(event ?? undefined);
      this.unitOptionChange.emit(event ?? undefined);
    }
  }

  onUnitCreated(unit: Unit) {
    const opt: SearchSelectOption = { value: unit.id, label: `${unit.name} (${unit.abbreviation})` };
    this.fg.get('baseUnitId')!.setValue(unit.id);
    this._unitOption.set(opt);
    this.unitOptionChange.emit(opt);
    this.unitCreateOpen.set(false);
  }

  // ── Search functions ─────────────────────────────────────────────────────
  searchTaxesFn = (query: string, page: number = 1) =>
    this.taxSvc.findAll({ search: query || undefined, page, limit: 20, filterModel: { isActive: { filterType: 'boolean', type: 'equals', filter: true } } }).pipe(
      map(res => ({
        data: (res.data ?? []).map(t => ({ value: t.id, label: `${t.name} (${t.percentage}%)` } as SearchSelectOption)).reverse(),
        hasMore: (res.data ?? []).length === 20
      }))
    );

  searchUnitsFn = (query: string, page: number = 1) =>
    this.unitsSvc.findAll({ search: query, page, limit: 8, onlyActive: true }).pipe(
      map(res => ({
        data: res.data.map((u: any) => ({ value: u.id, label: `${u.name} (${u.abbreviation})` } as SearchSelectOption)),
        hasMore: res.data.length >= 8
      }))
    );
}
