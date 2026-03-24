import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Warehouse } from '../../../../core/models/warehouse.models';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { FieldToggleComponent } from '../../../../shared/components/ui/field-toggle/field-toggle';
import { SearchSelectComponent } from '../../../../shared/components/ui/search-select/search-select';
import { BranchService } from '../../../../core/services/branch.service';

@Component({
  selector: 'app-warehouse-form',
  standalone: true,
  imports: [ReactiveFormsModule, FieldInputComponent, FieldToggleComponent, SearchSelectComponent],
  template: `
    <form [formGroup]="form" class="wf">

      <app-field-input
        label="Nombre de la Bodega"
        formControlName="name"
        placeholder="Ej: Bodega Principal, Almacén Norte..."
        [required]="true"
      ></app-field-input>

      @if (!editingId()) {
        <div class="wf__field">
          <label class="wf__label">Sucursal <span class="wf__req">*</span></label>
          <app-search-select
            formControlName="branchId"
            placeholder="Selecciona una sucursal"
            [searchFn]="searchBranches"
            [required]="true"
          ></app-search-select>
        </div>
      }

      <app-field-input
        label="Descripción"
        formControlName="description"
        placeholder="Descripción breve de la bodega (opcional)"
        [optional]="true"
        [multiline]="true"
        [rows]="2"
      ></app-field-input>

      <div class="wf__divider"><span>Configuración</span></div>

      <app-field-toggle
        label="Bodega activa"
        description="Las bodegas inactivas no reciben movimientos de stock"
        formControlName="isActive"
      ></app-field-toggle>

      <app-field-toggle
        label="Usar ubicaciones"
        description="Organizar el stock en ubicaciones (estantes, racks, etc.)"
        formControlName="hasLocations"
      ></app-field-toggle>

    </form>
  `,
  styles: [`
    .wf {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .wf__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .wf__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
    }
    .wf__req { color: var(--color-danger-text); }
    .wf__divider {
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
export class WarehouseFormComponent {
  private fb = inject(FormBuilder);
  private warehouseService = inject(WarehouseService);
  private branchService = inject(BranchService);
  private toastService = inject(ToastService);

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  editingId = signal<string | null>(null);
  isSubmitting = false;

  form = this.fb.group({
    name:         ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    branchId:     ['', [Validators.required]],
    description:  [''],
    isActive:     [true],
    hasLocations: [false],
  });

  searchBranches = (query: string, page: number) => {
    return this.branchService.findAll({ search: query, limit: 20, page }).pipe(
      map(res => ({
        data: (res.data ?? []).map(b => ({ label: b.name, value: b.id, description: b.city || b.address || '' })),
        hasMore: (res.total ?? 0) > page * 20,
      }))
    );
  };

  setWarehouse(w: Warehouse) {
    this.editingId.set(w.id);
    this.form.patchValue({
      name: w.name,
      branchId: w.branchId,
      description: w.description ?? '',
      isActive: w.isActive,
      hasLocations: w.hasLocations,
    });
    this.form.markAsPristine();
  }

  resetForm() {
    this.editingId.set(null);
    this.form.reset({ isActive: true, hasLocations: false });
    this.form.markAsPristine();
  }

  onSubmit() {
    if (this.form.invalid || this.isSubmitting) return;
    this.form.markAllAsTouched();

    this.isSubmitting = true;
    const v = this.form.getRawValue();
    const id = this.editingId();

    const request$ = id
      ? this.warehouseService.update(id, {
          name: v.name!,
          description: v.description || undefined,
          isActive: v.isActive!,
          hasLocations: v.hasLocations!,
        })
      : this.warehouseService.create({
          branchId: v.branchId!,
          name: v.name!,
          description: v.description || undefined,
          hasLocations: v.hasLocations!,
        });

    request$.subscribe({
      next: () => {
        this.toastService.success(`Bodega ${id ? 'actualizada' : 'creada'} correctamente`);
        this.saved.emit();
        this.isSubmitting = false;
        this.resetForm();
      },
      error: (err) => {
        this.toastService.error(err?.error?.data?.message ?? `Error al ${id ? 'actualizar' : 'crear'} la bodega`);
        this.isSubmitting = false;
      }
    });
  }

  hasUnsavedChanges(): boolean { return this.form.dirty; }
}
