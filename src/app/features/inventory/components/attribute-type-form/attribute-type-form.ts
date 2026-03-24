import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AttributeTypeService } from '../../../../core/services/attribute-type.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AttributeType, AttributeDataType, DATA_TYPE_LABELS } from '../../models/product.model';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { FieldToggleComponent } from '../../../../shared/components/ui/field-toggle/field-toggle';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/ui/custom-select/custom-select.component';

@Component({
  selector: 'app-attribute-type-form',
  standalone: true,
  imports: [ReactiveFormsModule, FieldInputComponent, FieldToggleComponent, CustomSelectComponent],
  template: `
    <form [formGroup]="attrForm" class="af">

      <app-field-input
        label="Nombre del Atributo"
        formControlName="name"
        placeholder="Ej: Talla, Color, Memoria..."
        [required]="true"
        [errorMessages]="{ required: 'El nombre es obligatorio', maxlength: 'Máximo 100 caracteres' }"
      ></app-field-input>

      <div class="af__field">
        <label class="af__label">Tipo de Dato <span class="af__req">*</span></label>
        <app-custom-select
          [options]="dataTypeOptions"
          [value]="attrForm.get('dataType')!.value!"
          (valueChange)="onDataTypeChange($event)"
        ></app-custom-select>
      </div>

      <app-field-input
        label="Unidad"
        formControlName="unit"
        placeholder="Ej: ml, cm, kg..."
        [optional]="true"
        hint="Unidad de referencia que se muestra junto al campo"
      ></app-field-input>

      <div class="af__divider"><span>Estado</span></div>

      <app-field-toggle
        label="Atributo activo"
        description="Los atributos inactivos no aparecen al configurar variantes"
        formControlName="isActive"
      ></app-field-toggle>

    </form>
  `,
  styles: [`
    .af {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .af__divider {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.5rem;
    }
    .af__field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .af__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
    }
    .af__req {
      color: var(--color-danger-text);
    }
  `]
})
export class AttributeTypeFormComponent {
  private fb = inject(FormBuilder);
  private attrSvc = inject(AttributeTypeService);
  private toastSvc = inject(ToastService);

  @Output() saved = new EventEmitter<AttributeType>();

  editingId = signal<string | null>(null);
  isSubmitting = signal(false);

  readonly dataTypeOptions: SelectOption[] = [
    { value: 'TEXT',    label: DATA_TYPE_LABELS.TEXT    },
    { value: 'NUMBER',  label: DATA_TYPE_LABELS.NUMBER  },
    { value: 'COLOR',   label: DATA_TYPE_LABELS.COLOR   },
    { value: 'BOOLEAN', label: DATA_TYPE_LABELS.BOOLEAN },
  ];

  attrForm = this.fb.group({
    name:     ['', [Validators.required, Validators.maxLength(100)]],
    dataType: ['TEXT'],
    unit:     [''],
    isActive: [true],
  });

  onDataTypeChange(value: string) {
    this.attrForm.get('dataType')!.setValue(value);
    this.attrForm.markAsDirty();
  }

  setAttributeType(attr: AttributeType) {
    this.editingId.set(attr.id);
    this.attrForm.patchValue({
      name: attr.name,
      dataType: attr.dataType,
      unit: attr.unit ?? '',
      isActive: attr.isActive,
    });
    if (attr.isSystem) {
      this.attrForm.get('name')!.disable();
      this.attrForm.get('dataType')!.disable();
    } else {
      this.attrForm.get('name')!.enable();
      this.attrForm.get('dataType')!.enable();
    }
    this.attrForm.markAsPristine();
  }

  resetForm() {
    this.editingId.set(null);
    this.attrForm.reset({ name: '', dataType: 'TEXT', unit: '', isActive: true });
    this.attrForm.get('name')!.enable();
    this.attrForm.get('dataType')!.enable();
    this.attrForm.markAsPristine();
  }

  onSubmit() {
    if (this.attrForm.invalid || this.isSubmitting()) {
      this.attrForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const v = this.attrForm.getRawValue();
    const id = this.editingId();

    const payload = {
      name: v.name!,
      dataType: v.dataType! as AttributeDataType,
      unit: v.unit || undefined,
      isActive: v.isActive ?? true,
    };

    const req$ = id ? this.attrSvc.update(id, payload) : this.attrSvc.create(payload);

    req$.subscribe({
      next: (attr) => {
        this.toastSvc.success(`Atributo ${id ? 'actualizado' : 'creado'} correctamente`);
        this.saved.emit(attr);
        this.isSubmitting.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.toastSvc.error(err?.error?.error ?? `Error al ${id ? 'actualizar' : 'crear'} el atributo`);
        this.isSubmitting.set(false);
      },
    });
  }

  hasUnsavedChanges(): boolean { return this.attrForm.dirty; }
}
