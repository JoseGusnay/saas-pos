import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Location } from '../../../../core/models/warehouse.models';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { FieldToggleComponent } from '../../../../shared/components/ui/field-toggle/field-toggle';

@Component({
  selector: 'app-location-form',
  standalone: true,
  imports: [ReactiveFormsModule, FieldInputComponent, FieldToggleComponent],
  template: `
    <form [formGroup]="form" class="lf">
      <app-field-input
        label="Nombre"
        formControlName="name"
        placeholder="Ej: Estante A1, Refrigerador, Rack Norte..."
        [required]="true"
      ></app-field-input>

      <app-field-input
        label="Codigo"
        formControlName="code"
        placeholder="Ej: A1, R01 (opcional)"
        [optional]="true"
      ></app-field-input>

      @if (editingId()) {
        <app-field-toggle
          label="Ubicacion activa"
          description="Las ubicaciones inactivas no reciben movimientos de stock"
          formControlName="isActive"
        ></app-field-toggle>
      }
    </form>
  `,
  styles: [`
    .lf {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
  `]
})
export class LocationFormComponent {
  private fb = inject(FormBuilder);
  private warehouseService = inject(WarehouseService);
  private toastService = inject(ToastService);

  @Input({ required: true }) warehouseId!: string;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  editingId = signal<string | null>(null);
  isSubmitting = false;

  form = this.fb.group({
    name:     ['', [Validators.required, Validators.minLength(1), Validators.maxLength(150)]],
    code:     [''],
    isActive: [true],
  });

  setLocation(loc: Location) {
    this.editingId.set(loc.id);
    this.form.patchValue({
      name: loc.name,
      code: loc.code ?? '',
      isActive: loc.isActive,
    });
    this.form.markAsPristine();
  }

  resetForm() {
    this.editingId.set(null);
    this.form.reset({ isActive: true });
    this.form.markAsPristine();
  }

  onSubmit() {
    if (this.form.invalid || this.isSubmitting) return;
    this.form.markAllAsTouched();

    this.isSubmitting = true;
    const v = this.form.getRawValue();
    const id = this.editingId();

    const request$ = id
      ? this.warehouseService.updateLocation(id, {
          name: v.name!,
          code: v.code || undefined,
          isActive: v.isActive!,
        })
      : this.warehouseService.createLocation({
          warehouseId: this.warehouseId,
          name: v.name!,
          code: v.code || undefined,
        });

    request$.subscribe({
      next: () => {
        this.toastService.success(`Ubicacion ${id ? 'actualizada' : 'creada'} correctamente`);
        this.saved.emit();
        this.isSubmitting = false;
        this.resetForm();
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? `Error al ${id ? 'actualizar' : 'crear'} la ubicacion`);
        this.isSubmitting = false;
      },
    });
  }

  hasUnsavedChanges(): boolean { return this.form.dirty; }
}
