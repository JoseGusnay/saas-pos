import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UnitsService } from '../../../../core/services/units.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Unit, UnitType, UNIT_TYPE_LABELS } from '../../../../core/models/unit.models';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { FieldToggleComponent } from '../../../../shared/components/ui/field-toggle/field-toggle';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/ui/custom-select/custom-select.component';

@Component({
  selector: 'app-unit-form',
  standalone: true,
  imports: [ReactiveFormsModule, FieldInputComponent, FieldToggleComponent, CustomSelectComponent],
  template: `
    <form [formGroup]="unitForm" class="uf">

      <app-field-input
        label="Nombre de la Unidad"
        formControlName="name"
        placeholder="Ej: Kilogramo, Litro, Pieza..."
        [required]="true"
        [errorMessages]="{ required: 'El nombre es obligatorio', minlength: 'Mínimo 2 caracteres' }"
      ></app-field-input>

      <app-field-input
        label="Abreviación"
        formControlName="abbreviation"
        placeholder="Ej: kg, L, pza..."
        [required]="true"
        [errorMessages]="{ required: 'La abreviación es obligatoria', maxlength: 'Máximo 10 caracteres' }"
      ></app-field-input>

      <div class="uf__field">
        <label class="uf__label">Tipo de Unidad</label>
        <app-custom-select
          [options]="typeOptions"
          [value]="unitForm.get('type')!.value!"
          (valueChange)="onTypeChange($event)"
        ></app-custom-select>
      </div>

      <div class="uf__divider"><span>Estado</span></div>

      <app-field-toggle
        label="Unidad activa"
        description="Las unidades inactivas no se muestran en el catálogo"
        formControlName="isActive"
      ></app-field-toggle>

    </form>
  `,
  styles: [`
    .uf {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .uf__divider {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.5rem;
    }
    .uf__field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .uf__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
    }
  `]
})
export class UnitFormComponent {
  private fb = inject(FormBuilder);
  private unitsSvc = inject(UnitsService);
  private toastSvc = inject(ToastService);

  @Output() saved = new EventEmitter<Unit>();

  editingId = signal<string | null>(null);
  isSubmitting = signal(false);

  readonly typeOptions: SelectOption[] = [
    { value: 'UNIT',   label: UNIT_TYPE_LABELS.UNIT   },
    { value: 'WEIGHT', label: UNIT_TYPE_LABELS.WEIGHT },
    { value: 'VOLUME', label: UNIT_TYPE_LABELS.VOLUME },
    { value: 'OTHER',  label: UNIT_TYPE_LABELS.OTHER  },
  ];

  unitForm = this.fb.group({
    name:         ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    abbreviation: ['', [Validators.required, Validators.maxLength(10)]],
    type:         ['UNIT'],
    isActive:     [true],
  });

  onTypeChange(value: string) {
    this.unitForm.get('type')!.setValue(value);
    this.unitForm.markAsDirty();
  }

  setUnit(unit: Unit) {
    this.editingId.set(unit.id);
    this.unitForm.patchValue({
      name: unit.name,
      abbreviation: unit.abbreviation,
      type: unit.type,
      isActive: unit.isActive,
    });
    this.unitForm.markAsPristine();
  }

  resetForm() {
    this.editingId.set(null);
    this.unitForm.reset({ type: 'UNIT', isActive: true });
    this.unitForm.markAsPristine();
  }

  onSubmit() {
    if (this.unitForm.invalid || this.isSubmitting()) {
      this.unitForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const v = this.unitForm.getRawValue();
    const id = this.editingId();

    const payload = {
      name: v.name!,
      abbreviation: v.abbreviation!,
      type: v.type as UnitType,
      isActive: v.isActive ?? true,
    };

    const req$ = id ? this.unitsSvc.update(id, payload) : this.unitsSvc.create(payload);

    req$.subscribe({
      next: (unit) => {
        this.toastSvc.success(`Unidad ${id ? 'actualizada' : 'creada'} correctamente`);
        this.saved.emit(unit);
        this.isSubmitting.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.toastSvc.error(err?.error?.error ?? `Error al ${id ? 'actualizar' : 'crear'} la unidad`);
        this.isSubmitting.set(false);
      },
    });
  }

  hasUnsavedChanges(): boolean { return this.unitForm.dirty; }
}
