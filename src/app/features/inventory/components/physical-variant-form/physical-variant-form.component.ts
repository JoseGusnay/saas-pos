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
import { TaxService } from '../../../../core/services/tax.service';
import { PresentationService } from '../../../../core/services/presentation.service';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';
import { CategoryAttributeType } from '../../models/product.model';

@Component({
  selector: 'app-physical-variant-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, NgIconComponent,
    SearchSelectComponent, BarcodeFieldComponent, FieldInputComponent, StockTrackingConfigComponent,
    ToggleSwitchComponent
  ],
  providers: [provideIcons({ lucideAlertCircle })],
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
  templateUrl: './physical-variant-form.component.html',
  styles: [`:host { display: flex; flex-direction: column; gap: 20px; }`]
})
export class PhysicalVariantFormComponent {
  private taxSvc          = inject(TaxService);
  private presentationSvc = inject(PresentationService);
  private fg = inject(ControlContainer).control as FormGroup;

  // ── Signal inputs ────────────────────────────────────────────────────────
  categoryAttributes      = input<CategoryAttributeType[]>([]);
  productName             = input('');
  initialTaxOptions       = input<SearchSelectOption[]>([]);
  initialPresentationOption = input<SearchSelectOption | undefined>(undefined);

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

  // ── Internal option tracking ─────────────────────────────────────────────
  _taxOptions         = signal<SearchSelectOption[]>([]);
  _presentationOption = signal<SearchSelectOption | undefined>(undefined);

  constructor() {
    effect(() => { this._taxOptions.set(this.initialTaxOptions()); });
    effect(() => { const o = this.initialPresentationOption(); if (o) this._presentationOption.set(o); });
  }

  // ── Getters ──────────────────────────────────────────────────────────────
  get salePriceCtrl() { return this.fg.get('salePrice'); }

  // ── Event handlers ───────────────────────────────────────────────────────
  onTaxChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (Array.isArray(event))  this._taxOptions.set(event);
    else if (!event)           this._taxOptions.set([]);
  }

  onPresentationChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (!Array.isArray(event)) this._presentationOption.set(event ?? undefined);
  }

  // ── Search functions ─────────────────────────────────────────────────────
  searchTaxesFn = (query: string) =>
    this.taxSvc.findAllSimple().pipe(
      map((taxes: any[]) => {
        const filtered = taxes.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));
        return {
          data: filtered.map(t => ({ value: t.id, label: `${t.name} (${t.percentage}%)` } as SearchSelectOption)),
          hasMore: false
        };
      })
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
}
