import { Component, inject, output, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplierService } from '../../../../../../core/services/supplier.service';
import { Supplier, TipoIdentificacion, TipoContribuyente } from '../../../../../../core/models/supplier.models';
import { ToastService } from '../../../../../../core/services/toast.service';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="supplier-form" (ngSubmit)="onSubmit()">

      <div class="form-section">
        <h3 class="section-title">Identificación</h3>
        <div class="form-group">
          <label for="name">Razón Social / Nombre *</label>
          <input id="name" type="text" class="form-control" [(ngModel)]="formData.name" name="name" placeholder="Nombre o razón social del proveedor" required />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="tipoIdentificacion">Tipo de Identificación</label>
            <select id="tipoIdentificacion" class="form-control" [(ngModel)]="formData.tipoIdentificacion" name="tipoIdentificacion">
              <option value="RUC">RUC</option>
              <option value="CEDULA">Cédula</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
          </div>
          <div class="form-group">
            <label for="ruc">{{ formData.tipoIdentificacion === 'RUC' ? 'RUC' : formData.tipoIdentificacion === 'CEDULA' ? 'Cédula' : 'Pasaporte' }}</label>
            <input id="ruc" type="text" class="form-control" [(ngModel)]="formData.ruc" name="ruc"
              [placeholder]="formData.tipoIdentificacion === 'RUC' ? '0000000000001' : formData.tipoIdentificacion === 'CEDULA' ? '0000000000' : 'Número'"
              [maxlength]="formData.tipoIdentificacion === 'RUC' ? 13 : formData.tipoIdentificacion === 'CEDULA' ? 10 : 20" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="email">Correo electrónico</label>
            <input id="email" type="email" class="form-control" [(ngModel)]="formData.email" name="email" placeholder="proveedor@ejemplo.com" />
          </div>
          <div class="form-group">
            <label for="phone">Teléfono</label>
            <input id="phone" type="text" class="form-control" [(ngModel)]="formData.phone" name="phone" placeholder="+593 99 000 0000" />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">Datos Fiscales</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="tipoContribuyente">Tipo de Contribuyente</label>
            <select id="tipoContribuyente" class="form-control" [(ngModel)]="formData.tipoContribuyente" name="tipoContribuyente">
              <option value="PERSONA_NATURAL">Persona Natural</option>
              <option value="SOCIEDAD">Sociedad</option>
              <option value="CONTRIBUYENTE_ESPECIAL">Contribuyente Especial</option>
              <option value="ENTIDAD_PUBLICA">Entidad Pública</option>
            </select>
          </div>
          <div class="form-group">
            <label for="regimenRimpe">Régimen RIMPE</label>
            <select id="regimenRimpe" class="form-control" [(ngModel)]="formData.regimenRimpe" name="regimenRimpe">
              <option [ngValue]="''">No aplica</option>
              <option value="POPULAR">Negocio Popular</option>
              <option value="EMPRENDEDOR">Emprendedor</option>
            </select>
          </div>
        </div>
        <div class="form-switches">
          <div class="form-check">
            <input id="obligadoContabilidad" type="checkbox" [(ngModel)]="formData.obligadoContabilidad" name="obligadoContabilidad" />
            <label for="obligadoContabilidad">Obligado a llevar contabilidad</label>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">Contacto</h3>
        <div class="form-group">
          <label for="contactName">Persona de contacto</label>
          <input id="contactName" type="text" class="form-control" [(ngModel)]="formData.contactName" name="contactName" placeholder="Nombre del contacto" />
        </div>
        <div class="form-group">
          <label for="address">Dirección</label>
          <textarea id="address" class="form-control" [(ngModel)]="formData.address" name="address" rows="2" placeholder="Dirección del proveedor"></textarea>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">Estado</h3>
        <div class="form-switches">
          <div class="form-check">
            <input id="isActive" type="checkbox" [(ngModel)]="formData.isActive" name="isActive" />
            <label for="isActive">Proveedor activo</label>
          </div>
        </div>
      </div>

    </form>
  `,
  styles: [`
    .supplier-form { display: flex; flex-direction: column; gap: 1.5rem; }
    .form-section { display: flex; flex-direction: column; gap: 1rem; }
    .section-title {
      font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-muted);
      text-transform: uppercase; letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 0.5rem; margin: 0;
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-main); }
    .form-control {
      width: 100%; box-sizing: border-box; padding: 0.625rem 1rem;
      background: var(--color-bg-surface); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); font-size: var(--font-size-base);
      color: var(--color-text-main); transition: var(--transition-fast); outline: none;
      &::placeholder { color: var(--color-text-muted); }
      &:focus { border-color: var(--color-accent-primary); box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1); }
    }
    .form-switches { padding-top: 0.25rem; }
    .form-check {
      display: flex; align-items: center; gap: 0.75rem; cursor: pointer;
      input[type="checkbox"] { width: 1rem; height: 1rem; accent-color: var(--color-accent-primary); cursor: pointer; }
      label { font-size: var(--font-size-base); color: var(--color-text-main); cursor: pointer; }
    }
    @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
  `]
})
export class SupplierFormComponent {
  private supplierService = inject(SupplierService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  saved = output<void>();
  cancelled = output<void>();

  isSubmitting = signal(false);
  private editingId: string | null = null;
  private pristineData = this.emptyForm();

  formData = this.emptyForm();

  private emptyForm() {
    return {
      name: '', tipoIdentificacion: 'RUC' as TipoIdentificacion, ruc: '',
      tipoContribuyente: 'PERSONA_NATURAL' as TipoContribuyente, obligadoContabilidad: false, regimenRimpe: '' as string,
      email: '', phone: '', contactName: '', address: '', isActive: true,
    };
  }

  setSupplier(supplier: Supplier) {
    this.editingId = supplier.id;
    const data = {
      name:                 supplier.name,
      tipoIdentificacion:   supplier.tipoIdentificacion ?? 'RUC',
      ruc:                  supplier.ruc ?? '',
      tipoContribuyente:    supplier.tipoContribuyente ?? 'PERSONA_NATURAL',
      obligadoContabilidad: supplier.obligadoContabilidad ?? false,
      regimenRimpe:         supplier.regimenRimpe ?? '',
      email:                supplier.email ?? '',
      phone:                supplier.phone ?? '',
      contactName:          supplier.contactName ?? '',
      address:              supplier.address ?? '',
      isActive:             supplier.isActive,
    };
    this.formData = { ...data };
    this.pristineData = { ...data };
    this.cdr.detectChanges();
  }

  resetForm() {
    this.editingId = null;
    this.formData = this.emptyForm();
    this.pristineData = this.emptyForm();
  }

  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.formData) !== JSON.stringify(this.pristineData);
  }

  onSubmit() {
    if (!this.formData.name.trim()) { this.toastService.error('El nombre es requerido'); return; }
    this.isSubmitting.set(true);

    const payload = {
      name:                 this.formData.name.trim(),
      tipoIdentificacion:   this.formData.tipoIdentificacion,
      ruc:                  this.formData.ruc.trim() || undefined,
      tipoContribuyente:    this.formData.tipoContribuyente,
      obligadoContabilidad: this.formData.obligadoContabilidad,
      regimenRimpe:         (this.formData.regimenRimpe || null) as any,
      email:                this.formData.email.trim() || undefined,
      phone:                this.formData.phone.trim() || undefined,
      contactName:          this.formData.contactName.trim() || undefined,
      address:              this.formData.address.trim() || undefined,
      isActive:             this.formData.isActive,
    };

    const request = this.editingId
      ? this.supplierService.update(this.editingId, payload)
      : this.supplierService.create(payload);

    request.subscribe({
      next: () => {
        this.toastService.success(this.editingId ? 'Proveedor actualizado' : 'Proveedor creado');
        this.isSubmitting.set(false);
        this.saved.emit();
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Error al guardar');
        this.isSubmitting.set(false);
      }
    });
  }
}
