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
import { PresentationService } from '../../../../core/services/presentation.service';
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
  private presentationSvc = inject(PresentationService);
  private unitsSvc        = inject(UnitsService);
  private fg = inject(ControlContainer).control as FormGroup;

  // ── Signal inputs ────────────────────────────────────────────────────────
  categoryAttributes      = input<CategoryAttributeType[]>([]);
  productName             = input('');
  initialTaxOptions       = input<SearchSelectOption[]>([]);
  initialPresentationOption = input<SearchSelectOption | undefined>(undefined);
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

  simpleMargin = computed(() => {
    const sale = Number(this.salePriceValue()) || 0;
    const cost = Number(this.costPriceValue()) || 0;
    return sale > 0 ? ((sale - cost) / sale) * 100 : null;
  });

  // ── Signal outputs ──────────────────────────────────────────────────────
  taxOptionsChange = output<SearchSelectOption[]>();
  presentationOptionChange = output<SearchSelectOption | undefined>();
  unitOptionChange = output<SearchSelectOption | undefined>();

  // ── Internal option tracking ─────────────────────────────────────────────
  _taxOptions         = signal<SearchSelectOption[]>([]);
  _presentationOption = signal<SearchSelectOption | undefined>(undefined);
  _unitOption         = signal<SearchSelectOption | undefined>(undefined);
  unitCreateOpen      = signal(false);

  constructor() {
    effect(() => { this._taxOptions.set(this.initialTaxOptions()); });
    effect(() => { const o = this.initialPresentationOption(); if (o) this._presentationOption.set(o); });
    effect(() => { const o = this.initialUnitOption(); if (o) this._unitOption.set(o); });
  }

  // ── Getters ──────────────────────────────────────────────────────────────
  get salePriceCtrl() { return this.fg.get('salePrice'); }

  // ── Event handlers ───────────────────────────────────────────────────────
  onTaxChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (Array.isArray(event))  { this._taxOptions.set(event); this.taxOptionsChange.emit(event); }
    else if (!event)           { this._taxOptions.set([]); this.taxOptionsChange.emit([]); }
  }

  onPresentationChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (!Array.isArray(event)) {
      this._presentationOption.set(event ?? undefined);
      this.presentationOptionChange.emit(event ?? undefined);
    }
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

  searchPresentationsFn = (query: string, page: number) =>
    this.presentationSvc.findAll({ search: query, page, limit: 15 }).pipe(
      map((res: any) => {
        const items = Array.isArray(res) ? res : (res.data ?? []);
        return {
          data: items.map((p: any) => ({ label: p.name, value: p.id } as SearchSelectOption)),
          hasMore: items.length === 15
        };
      })
    );

  searchUnitsFn = (query: string, page: number = 1) =>
    this.unitsSvc.findAll({ search: query, page, limit: 8, onlyActive: true }).pipe(
      map(res => ({
        data: res.data.map((u: any) => ({ value: u.id, label: `${u.name} (${u.abbreviation})` } as SearchSelectOption)),
        hasMore: res.data.length >= 8
      }))
    );
}
