import {
  Component, ChangeDetectionStrategy, inject, signal, input, output, effect
} from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';

import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { DurationPickerComponent } from '../../../../shared/components/ui/duration-picker/duration-picker';
import { TaxService } from '../../../../core/services/tax.service';
import { SearchSelectOption } from '../../../../shared/models/search-select.models';

@Component({
  selector: 'app-service-variant-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, SearchSelectComponent, FieldInputComponent, DurationPickerComponent],
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
  styles: [`:host { display: flex; flex-direction: column; gap: 20px; }`],
  template: `
    <div class="pfc__pricing-row">
      <app-field-input
        formControlName="salePrice"
        label="Precio"
        type="number"
        placeholder="0.00"
        prefix="$"
        [required]="true"
        [step]="0.01"
        [min]="0"
        [errorMessages]="{ required: 'Precio requerido', min: 'El precio debe ser mayor a 0' }"
      ></app-field-input>

      <div class="pff">
        <label class="pff__label">Impuestos <span class="pff__optional">Opcional</span></label>
        <app-search-select
          formControlName="taxIds"
          placeholder="Seleccionar impuestos…"
          searchPlaceholder="Buscar impuestos…"
          [multiple]="true"
          [searchFn]="searchTaxesFn"
          [initialOptions]="_taxOptions()"
          (selectionChange)="onTaxChange($event)"
        ></app-search-select>
      </div>
    </div>

    <div class="pff">
      <label class="pff__label">Duración <span class="pff__optional">Opcional</span></label>
      <app-duration-picker formControlName="durationMinutes"></app-duration-picker>
    </div>
  `,
})
export class ServiceVariantFormComponent {
  private taxSvc = inject(TaxService);

  initialTaxOptions = input<SearchSelectOption[]>([]);
  taxOptionsChange = output<SearchSelectOption[]>();
  _taxOptions       = signal<SearchSelectOption[]>([]);

  constructor() {
    effect(() => { this._taxOptions.set(this.initialTaxOptions()); });
  }

  onTaxChange(event: SearchSelectOption | SearchSelectOption[] | null) {
    if (Array.isArray(event))  { this._taxOptions.set(event); this.taxOptionsChange.emit(event); }
    else if (!event)           { this._taxOptions.set([]); this.taxOptionsChange.emit([]); }
  }

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
}
