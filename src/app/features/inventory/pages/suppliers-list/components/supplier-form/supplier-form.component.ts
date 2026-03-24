import { Component, inject, output, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SupplierService } from '../../../../../../core/services/supplier.service';
import { Supplier, TipoIdentificacion, TipoContribuyente } from '../../../../../../core/models/supplier.models';
import { ToastService } from '../../../../../../core/services/toast.service';
import { FieldInputComponent } from '../../../../../../shared/components/ui/field-input/field-input';
import { FieldToggleComponent } from '../../../../../../shared/components/ui/field-toggle/field-toggle';
import { CustomSelectComponent, SelectOption } from '../../../../../../shared/components/ui/custom-select/custom-select.component';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [ReactiveFormsModule, FieldInputComponent, FieldToggleComponent, CustomSelectComponent],
  template: `
    <form [formGroup]="supplierForm" class="sf">

      <div class="sf__divider"><span>Identificación</span></div>

      <app-field-input
        label="Razón Social / Nombre"
        formControlName="name"
        placeholder="Nombre o razón social del proveedor"
        [required]="true"
        [errorMessages]="{ required: 'El nombre es requerido' }"
      ></app-field-input>

      <div class="sf__row">
        <div class="sf__field">
          <label class="sf__label">Tipo de Identificación</label>
          <app-custom-select
            [options]="tipoIdOptions"
            [value]="supplierForm.get('tipoIdentificacion')!.value!"
            (valueChange)="onSelectChange('tipoIdentificacion', $event)"
          ></app-custom-select>
        </div>

        <app-field-input
          [label]="idDocLabel()"
          formControlName="ruc"
          [placeholder]="idDocPlaceholder()"
          [optional]="true"
        ></app-field-input>
      </div>

      <div class="sf__row">
        <app-field-input
          label="Correo electrónico"
          formControlName="email"
          type="email"
          placeholder="proveedor&#64;ejemplo.com"
          [optional]="true"
        ></app-field-input>

        <app-field-input
          label="Teléfono"
          formControlName="phone"
          type="tel"
          placeholder="+593 99 000 0000"
          [optional]="true"
        ></app-field-input>
      </div>

      <div class="sf__divider"><span>Datos Fiscales</span></div>

      <div class="sf__row">
        <div class="sf__field">
          <label class="sf__label">Tipo de Contribuyente</label>
          <app-custom-select
            [options]="contribuyenteOptions"
            [value]="supplierForm.get('tipoContribuyente')!.value!"
            (valueChange)="onSelectChange('tipoContribuyente', $event)"
          ></app-custom-select>
        </div>

        <div class="sf__field">
          <label class="sf__label">Régimen RIMPE</label>
          <app-custom-select
            [options]="rimpeOptions"
            [value]="supplierForm.get('regimenRimpe')!.value!"
            (valueChange)="onSelectChange('regimenRimpe', $event)"
          ></app-custom-select>
        </div>
      </div>

      <div class="sf__field">
        <label class="sf__label">Tipo Sujeto Retenido</label>
        <app-custom-select
          [options]="sujetoOptions"
          [value]="supplierForm.get('tipoSujetoRetenido')!.value!"
          (valueChange)="onSelectChange('tipoSujetoRetenido', $event)"
        ></app-custom-select>
      </div>

      <app-field-toggle
        label="Obligado a llevar contabilidad"
        formControlName="obligadoContabilidad"
      ></app-field-toggle>

      <app-field-toggle
        label="Parte relacionada"
        formControlName="parteRelacionada"
      ></app-field-toggle>

      <div class="sf__divider"><span>Contacto</span></div>

      <app-field-input
        label="Persona de contacto"
        formControlName="contactName"
        placeholder="Nombre del contacto"
        [optional]="true"
      ></app-field-input>

      <app-field-input
        label="Dirección"
        formControlName="address"
        placeholder="Dirección del proveedor"
        [optional]="true"
        [multiline]="true"
        [rows]="2"
      ></app-field-input>

      <div class="sf__divider"><span>Estado</span></div>

      <app-field-toggle
        label="Proveedor activo"
        description="Los proveedores inactivos no aparecen en órdenes de compra"
        formControlName="isActive"
      ></app-field-toggle>

    </form>
  `,
  styles: [`
    .sf {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .sf__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }
    .sf__divider {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.5rem;
    }
    .sf__field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .sf__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
    }
  `]
})
export class SupplierFormComponent {
  private fb = inject(FormBuilder);
  private supplierService = inject(SupplierService);
  private toastService = inject(ToastService);

  saved = output<void>();
  cancelled = output<void>();

  isSubmitting = signal(false);
  private editingId: string | null = null;

  readonly tipoIdOptions: SelectOption[] = [
    { value: 'RUC', label: 'RUC' },
    { value: 'CEDULA', label: 'Cédula' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
  ];

  readonly contribuyenteOptions: SelectOption[] = [
    { value: 'PERSONA_NATURAL', label: 'Persona Natural' },
    { value: 'SOCIEDAD', label: 'Sociedad' },
    { value: 'CONTRIBUYENTE_ESPECIAL', label: 'Contribuyente Especial' },
    { value: 'ENTIDAD_PUBLICA', label: 'Entidad Pública' },
  ];

  readonly rimpeOptions: SelectOption[] = [
    { value: '', label: 'No aplica' },
    { value: 'POPULAR', label: 'Negocio Popular' },
    { value: 'EMPRENDEDOR', label: 'Emprendedor' },
  ];

  readonly sujetoOptions: SelectOption[] = [
    { value: '01', label: 'Persona Natural' },
    { value: '02', label: 'Sociedad' },
  ];

  supplierForm = this.fb.group({
    name:                 ['', Validators.required],
    tipoIdentificacion:   ['RUC'],
    ruc:                  [''],
    tipoContribuyente:    ['PERSONA_NATURAL'],
    obligadoContabilidad: [false],
    regimenRimpe:         [''],
    parteRelacionada:     [false],
    tipoSujetoRetenido:   ['01'],
    email:                [''],
    phone:                [''],
    contactName:          [''],
    address:              [''],
    isActive:             [true],
  });

  idDocLabel = signal('RUC');
  idDocPlaceholder = signal('0000000000001');

  constructor() {
    this.supplierForm.get('tipoIdentificacion')!.valueChanges.subscribe(val => {
      const labels: Record<string, string> = { RUC: 'RUC', CEDULA: 'Cédula', PASAPORTE: 'Pasaporte' };
      const placeholders: Record<string, string> = { RUC: '0000000000001', CEDULA: '0000000000', PASAPORTE: 'Número' };
      this.idDocLabel.set(labels[val!] ?? 'Documento');
      this.idDocPlaceholder.set(placeholders[val!] ?? 'Número');
    });
  }

  onSelectChange(field: string, value: string) {
    this.supplierForm.get(field)!.setValue(value);
    this.supplierForm.markAsDirty();
  }

  setSupplier(supplier: Supplier) {
    this.editingId = supplier.id;
    this.supplierForm.patchValue({
      name:                 supplier.name,
      tipoIdentificacion:   supplier.tipoIdentificacion ?? 'RUC',
      ruc:                  supplier.ruc ?? '',
      tipoContribuyente:    supplier.tipoContribuyente ?? 'PERSONA_NATURAL',
      obligadoContabilidad: supplier.obligadoContabilidad ?? false,
      regimenRimpe:         supplier.regimenRimpe ?? '',
      parteRelacionada:     supplier.parteRelacionada ?? false,
      tipoSujetoRetenido:   supplier.tipoSujetoRetenido ?? '01',
      email:                supplier.email ?? '',
      phone:                supplier.phone ?? '',
      contactName:          supplier.contactName ?? '',
      address:              supplier.address ?? '',
      isActive:             supplier.isActive,
    });
    this.supplierForm.markAsPristine();
  }

  resetForm() {
    this.editingId = null;
    this.supplierForm.reset({
      tipoIdentificacion: 'RUC', tipoContribuyente: 'PERSONA_NATURAL',
      tipoSujetoRetenido: '01', regimenRimpe: '', isActive: true,
    });
    this.supplierForm.markAsPristine();
  }

  hasUnsavedChanges(): boolean { return this.supplierForm.dirty; }

  onSubmit() {
    if (this.supplierForm.invalid || this.isSubmitting()) {
      this.supplierForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const v = this.supplierForm.getRawValue();

    const payload = {
      name:                 v.name!.trim(),
      tipoIdentificacion:   v.tipoIdentificacion as TipoIdentificacion,
      ruc:                  v.ruc?.trim() || undefined,
      tipoContribuyente:    v.tipoContribuyente as TipoContribuyente,
      obligadoContabilidad: v.obligadoContabilidad ?? false,
      regimenRimpe:         (v.regimenRimpe || null) as any,
      parteRelacionada:     v.parteRelacionada ?? false,
      tipoSujetoRetenido:   v.tipoSujetoRetenido!,
      email:                v.email?.trim() || undefined,
      phone:                v.phone?.trim() || undefined,
      contactName:          v.contactName?.trim() || undefined,
      address:              v.address?.trim() || undefined,
      isActive:             v.isActive ?? true,
    };

    const req$ = this.editingId
      ? this.supplierService.update(this.editingId, payload)
      : this.supplierService.create(payload);

    req$.subscribe({
      next: () => {
        this.toastService.success(this.editingId ? 'Proveedor actualizado' : 'Proveedor creado');
        this.isSubmitting.set(false);
        this.saved.emit();
        this.resetForm();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || 'Error al guardar');
        this.isSubmitting.set(false);
      },
    });
  }
}
