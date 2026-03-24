import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaxService } from '../../../../../../core/services/tax.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { Tax } from '../../../../../../core/models/tax.models';
import { FieldInputComponent } from '../../../../../../shared/components/ui/field-input/field-input';
import { FieldToggleComponent } from '../../../../../../shared/components/ui/field-toggle/field-toggle';
import { SegmentedToggleComponent, SegmentOption } from '../../../../../../shared/components/ui/segmented-toggle/segmented-toggle';
import { provideIcons } from '@ng-icons/core';
import { lucidePercent, lucideDollarSign } from '@ng-icons/lucide';

@Component({
  selector: 'app-tax-form',
  standalone: true,
  imports: [ReactiveFormsModule, FieldInputComponent, FieldToggleComponent, SegmentedToggleComponent],
  providers: [provideIcons({ lucidePercent, lucideDollarSign })],
  template: `
    <form [formGroup]="taxForm" class="tf">

      <app-field-input
        label="Nombre del Impuesto"
        formControlName="name"
        placeholder="Ej: IVA 12%, ICE Bebidas..."
        [required]="true"
        [errorMessages]="{ required: 'El nombre es obligatorio', minlength: 'Mínimo 2 caracteres' }"
      ></app-field-input>

      <div class="tf__row">
        <app-field-input
          label="Código Interno"
          formControlName="code"
          placeholder="Ej: IVA12, ICE"
          [required]="true"
          [errorMessages]="{ required: 'El código es obligatorio' }"
        ></app-field-input>

        <app-field-input
          label="Código SRI"
          formControlName="sriCode"
          placeholder="Cód. tributario"
          [optional]="true"
        ></app-field-input>
      </div>

      <div class="tf__divider"><span>Tipo y Tarifa</span></div>

      <div class="tf__field">
        <label class="tf__label">Tipo de Impuesto <span class="tf__req">*</span></label>
        <app-segmented-toggle
          variant="pill"
          [options]="typeOptions"
          [value]="taxForm.get('type')!.value"
          (valueChange)="onTypeChange($event)"
        ></app-segmented-toggle>
      </div>

      <div class="tf__row">
        @if (taxForm.get('type')!.value === 'PERCENTAGE') {
          <app-field-input
            label="Porcentaje (%)"
            formControlName="percentage"
            type="number"
            placeholder="12.00"
            [required]="true"
            [errorMessages]="{ required: 'Porcentaje requerido', min: 'Mínimo 0', max: 'Máximo 100' }"
          ></app-field-input>
        }

        <app-field-input
          label="Monto Fijo ($)"
          formControlName="fixedAmount"
          type="number"
          placeholder="0.00"
          prefix="$"
        ></app-field-input>
      </div>

      <div class="tf__divider"><span>Estado</span></div>

      <app-field-toggle
        label="Impuesto activo"
        description="Los impuestos inactivos no se aplican a nuevas ventas"
        formControlName="isActive"
      ></app-field-toggle>

    </form>
  `,
  styles: [`
    .tf {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .tf__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .tf__divider {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.5rem;
    }
    .tf__field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .tf__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
    }
    .tf__req {
      color: var(--color-danger-text);
    }
  `]
})
export class TaxFormComponent {
  private fb = inject(FormBuilder);
  private taxService = inject(TaxService);
  private toastService = inject(ToastService);

  @Output() saved = new EventEmitter<void>();

  editingTaxId = signal<string | null>(null);
  isSubmitting = signal(false);

  readonly typeOptions: SegmentOption[] = [
    { value: 'PERCENTAGE', icon: 'lucidePercent', label: 'Porcentual' },
    { value: 'FIXED', icon: 'lucideDollarSign', label: 'Monto Fijo' },
  ];

  taxForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: ['', Validators.required],
    sriCode: [''],
    type: ['PERCENTAGE', Validators.required],
    percentage: [null as number | null],
    fixedAmount: [0],
    isActive: [true],
  });

  onTypeChange(value: string) {
    this.taxForm.get('type')!.setValue(value);
    this.taxForm.markAsDirty();
  }

  setTax(tax: Tax) {
    this.editingTaxId.set(tax.id);
    this.taxForm.patchValue({
      name: tax.name,
      code: tax.code,
      sriCode: tax.sriCode ?? '',
      type: tax.type,
      percentage: tax.percentage ?? null,
      fixedAmount: tax.fixedAmount ?? 0,
      isActive: tax.isActive,
    });
    this.taxForm.markAsPristine();
  }

  resetForm() {
    this.editingTaxId.set(null);
    this.taxForm.reset({ type: 'PERCENTAGE', fixedAmount: 0, isActive: true });
    this.taxForm.markAsPristine();
  }

  onSubmit() {
    if (this.taxForm.invalid || this.isSubmitting()) {
      this.taxForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const v = this.taxForm.getRawValue();
    const id = this.editingTaxId();

    const payload = {
      name: v.name!,
      code: v.code!,
      sriCode: v.sriCode || undefined,
      type: v.type! as 'PERCENTAGE' | 'FIXED',
      percentage: v.type === 'PERCENTAGE' ? v.percentage : undefined,
      fixedAmount: v.fixedAmount ?? 0,
      isActive: v.isActive ?? true,
    };

    const req$ = id
      ? this.taxService.update(id, payload)
      : this.taxService.create(payload);

    req$.subscribe({
      next: () => {
        this.toastService.success(`Impuesto ${id ? 'actualizado' : 'creado'} correctamente`);
        this.saved.emit();
        this.isSubmitting.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? `Error al ${id ? 'actualizar' : 'crear'} el impuesto`);
        this.isSubmitting.set(false);
      },
    });
  }

  hasUnsavedChanges(): boolean { return this.taxForm.dirty; }
}
