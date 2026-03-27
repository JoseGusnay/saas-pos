import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../../../../core/services/customer.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Customer, CUSTOMER_ID_TYPES } from '../../../../core/models/customer.models';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { FieldToggleComponent } from '../../../../shared/components/ui/field-toggle/field-toggle';
import { CustomSelectComponent, SelectOption } from '../../../../shared/components/ui/custom-select/custom-select.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [ReactiveFormsModule, FieldInputComponent, FieldToggleComponent, CustomSelectComponent, CommonModule],
  template: `
    <form [formGroup]="customerForm" class="cf">

      <app-field-input
        label="Nombre / Razón Social"
        formControlName="name"
        placeholder="Ej: Juan Pérez, Empresa ABC S.A."
        [required]="true"
        [maxlength]="300"
        [errorMessages]="{ required: 'El nombre es obligatorio', minlength: 'Mínimo 1 carácter' }"
      ></app-field-input>

      <div class="cf__row">
        <div class="cf__field">
          <label class="cf__label">Tipo de Identificación <span class="cf__required">*</span></label>
          <app-custom-select
            [options]="idTypeOptions"
            [value]="customerForm.get('tipoIdentificacion')!.value!"
            (valueChange)="onTipoIdentificacionChange($event)"
          ></app-custom-select>
        </div>

        <app-field-input
          label="Identificación"
          formControlName="identificacion"
          placeholder="Ej: 0912345678001"
          [required]="true"
          [maxlength]="20"
          [errorMessages]="{ required: 'La identificación es obligatoria' }"
          class="cf__field"
        ></app-field-input>
      </div>

      <app-field-input
        label="Email"
        formControlName="email"
        placeholder="correo@ejemplo.com"
        type="email"
        [optional]="true"
        [maxlength]="150"
        [errorMessages]="{ email: 'Ingrese un email válido' }"
      ></app-field-input>

      <app-field-input
        label="Teléfono"
        formControlName="phone"
        placeholder="Ej: 0991234567"
        type="tel"
        [optional]="true"
        [maxlength]="30"
      ></app-field-input>

      <app-field-input
        label="Dirección"
        formControlName="address"
        placeholder="Ej: Av. 9 de Octubre 123, Guayaquil"
        [optional]="true"
        [multiline]="true"
        [rows]="3"
        [maxlength]="500"
      ></app-field-input>

      <div class="cf__divider"><span>Estado</span></div>

      <app-field-toggle
        label="Cliente activo"
        description="Los clientes inactivos no aparecen en búsquedas"
        formControlName="isActive"
      ></app-field-toggle>

    </form>
  `,
  styles: [`
    .cf {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .cf__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;

      @media (max-width: 480px) {
        grid-template-columns: 1fr;
      }
    }
    .cf__field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .cf__label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-main);
    }
    .cf__required {
      color: var(--color-danger);
    }
    .cf__divider {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.5rem;
    }
  `]
})
export class CustomerFormComponent {
  private fb = inject(FormBuilder);
  private customerService = inject(CustomerService);
  private toastService = inject(ToastService);

  @Output() saved = new EventEmitter<Customer>();

  editingCustomerId = signal<string | null>(null);
  isSubmitting = signal(false);

  idTypeOptions: SelectOption[] = CUSTOMER_ID_TYPES.map(t => ({ value: t.value, label: t.label }));

  customerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(300)]],
    tipoIdentificacion: ['05', [Validators.required]],
    identificacion: ['', [Validators.required, Validators.maxLength(20)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    phone: ['', [Validators.maxLength(30)]],
    address: ['', [Validators.maxLength(500)]],
    isActive: [true],
  });

  setCustomer(customer: Customer) {
    this.editingCustomerId.set(customer.id);
    this.customerForm.patchValue({
      name: customer.name,
      tipoIdentificacion: customer.tipoIdentificacion,
      identificacion: customer.identificacion,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      isActive: customer.isActive,
    });
    this.customerForm.markAsPristine();
  }

  resetForm() {
    this.editingCustomerId.set(null);
    this.customerForm.reset({ tipoIdentificacion: '05', isActive: true });
    this.customerForm.markAsPristine();
  }

  onSubmit() {
    if (this.customerForm.invalid || this.isSubmitting()) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const v = this.customerForm.getRawValue();
    const id = this.editingCustomerId();

    const payload: any = {
      name: v.name,
      tipoIdentificacion: v.tipoIdentificacion,
      identificacion: v.identificacion,
      email: v.email || undefined,
      phone: v.phone || undefined,
      address: v.address || undefined,
      isActive: v.isActive,
    };

    const request$ = id
      ? this.customerService.update(id, payload)
      : this.customerService.create(payload);

    request$.subscribe({
      next: (customer) => {
        this.toastService.success(`Cliente ${id ? 'actualizado' : 'creado'} correctamente`);
        this.saved.emit(customer);
        this.isSubmitting.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? `Error al ${id ? 'actualizar' : 'crear'} el cliente`);
        this.isSubmitting.set(false);
      },
    });
  }

  onTipoIdentificacionChange(value: string) {
    this.customerForm.get('tipoIdentificacion')!.setValue(value);
    this.customerForm.get('tipoIdentificacion')!.markAsDirty();
  }

  hasUnsavedChanges(): boolean { return this.customerForm.dirty; }
}
