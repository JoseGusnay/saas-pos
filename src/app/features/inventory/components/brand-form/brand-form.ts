import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrandService } from '../../../../core/services/brand.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Brand } from '../../../../core/models/brand.models';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { FieldToggleComponent } from '../../../../shared/components/ui/field-toggle/field-toggle';

@Component({
  selector: 'app-brand-form',
  standalone: true,
  imports: [ReactiveFormsModule, FieldInputComponent, FieldToggleComponent],
  template: `
    <form [formGroup]="brandForm" class="bf">

      <app-field-input
        label="Nombre de la Marca"
        formControlName="name"
        placeholder="Ej: Johnnie Walker, Smirnoff..."
        [required]="true"
        [errorMessages]="{ required: 'El nombre es obligatorio', minlength: 'Mínimo 2 caracteres' }"
      ></app-field-input>

      <app-field-input
        label="País de Origen"
        formControlName="country"
        placeholder="Ej: Escocia, Rusia, México..."
        [optional]="true"
      ></app-field-input>

      <div class="bf__divider"><span>Estado</span></div>

      <app-field-toggle
        label="Marca activa"
        description="Las marcas inactivas no se muestran en el catálogo"
        formControlName="isActive"
      ></app-field-toggle>

    </form>
  `,
  styles: [`
    .bf {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .bf__divider {
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
export class BrandFormComponent {
  private fb = inject(FormBuilder);
  private brandService = inject(BrandService);
  private toastService = inject(ToastService);

  @Output() saved = new EventEmitter<Brand>();

  editingBrandId = signal<string | null>(null);
  isSubmitting = signal(false);

  brandForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    country: [''],
    isActive: [true],
  });

  setBrand(brand: Brand) {
    this.editingBrandId.set(brand.id);
    this.brandForm.patchValue({
      name: brand.name,
      country: brand.country,
      isActive: brand.status === 'ACTIVE',
    });
    this.brandForm.markAsPristine();
  }

  resetForm() {
    this.editingBrandId.set(null);
    this.brandForm.reset({ isActive: true });
    this.brandForm.markAsPristine();
  }

  onSubmit() {
    if (this.brandForm.invalid || this.isSubmitting()) {
      this.brandForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const v = this.brandForm.getRawValue();
    const id = this.editingBrandId();

    const payload: any = {
      name: v.name,
      country: v.country || undefined,
      status: v.isActive ? 'ACTIVE' : 'INACTIVE',
    };

    const request$ = id
      ? this.brandService.update(id, payload)
      : this.brandService.create(payload);

    request$.subscribe({
      next: (brand) => {
        this.toastService.success(`Marca ${id ? 'actualizada' : 'creada'} correctamente`);
        this.saved.emit(brand);
        this.isSubmitting.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? `Error al ${id ? 'actualizar' : 'crear'} la marca`);
        this.isSubmitting.set(false);
      },
    });
  }

  hasUnsavedChanges(): boolean { return this.brandForm.dirty; }
}
