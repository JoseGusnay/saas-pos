import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideRuler, lucideHash, lucideLayers } from '@ng-icons/lucide';
import { UnitsService } from '../../../../core/services/units.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Unit, UnitType, UNIT_TYPE_LABELS } from '../../../../core/models/unit.models';

@Component({
  selector: 'app-unit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [provideIcons({ lucideRuler, lucideHash, lucideLayers })],
  template: `
    <div class="unit-form-container">
      <form [formGroup]="unitForm" class="premium-form" (ngSubmit)="onSubmit()">
        <fieldset [disabled]="isSubmitting()" style="border: none; padding: 0; margin: 0; display: contents;">

          <div class="form-section">
            <h3 class="section-title">Información General</h3>

            <!-- Nombre -->
            <div class="form-group" [class.has-error]="unitForm.get('name')?.invalid && unitForm.get('name')?.touched">
              <label for="unit-name">Nombre de la Unidad</label>
              <div class="input-wrapper">
                <ng-icon name="lucideRuler"></ng-icon>
                <input
                  id="unit-name"
                  type="text"
                  formControlName="name"
                  placeholder="Ej: Kilogramo, Litro, Pieza…">
              </div>
              @if (unitForm.get('name')?.invalid && unitForm.get('name')?.touched) {
                <small class="error-msg">El nombre es obligatorio (mín. 2 caracteres).</small>
              }
            </div>

            <!-- Abreviación -->
            <div class="form-group" [class.has-error]="unitForm.get('abbreviation')?.invalid && unitForm.get('abbreviation')?.touched">
              <label for="unit-abbr">Abreviación</label>
              <div class="input-wrapper">
                <ng-icon name="lucideHash"></ng-icon>
                <input
                  id="unit-abbr"
                  type="text"
                  formControlName="abbreviation"
                  placeholder="Ej: kg, L, pza…"
                  maxlength="10">
              </div>
              @if (unitForm.get('abbreviation')?.invalid && unitForm.get('abbreviation')?.touched) {
                <small class="error-msg">La abreviación es obligatoria (máx. 10 caracteres).</small>
              }
            </div>

            <!-- Tipo -->
            <div class="form-group">
              <label for="unit-type">Tipo de Unidad</label>
              <div class="select-wrapper">
                <ng-icon name="lucidelayers"></ng-icon>
                <select id="unit-type" formControlName="type">
                  @for (opt of typeOptions; track opt.value) {
                    <option [value]="opt.value">{{ opt.label }}</option>
                  }
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Estado</h3>
            <div class="form-switches">
              <div class="form-check">
                <input
                  id="unit-active"
                  type="checkbox"
                  [checked]="unitForm.get('isActive')?.value"
                  (change)="toggleActive($event)">
                <label for="unit-active">Unidad activa</label>
              </div>
            </div>
          </div>

        </fieldset>
      </form>
    </div>
  `,
  styles: [`
    .unit-form-container { padding: 0; width: 100%; box-sizing: border-box; }
    .premium-form { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; }

    .form-section {
      display: flex; flex-direction: column; gap: 1rem; width: 100%;
    }
    .section-title {
      font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-muted);
      text-transform: uppercase; letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 0.5rem; margin-bottom: 0.5rem;
    }

    .form-group {
      display: flex; flex-direction: column; gap: 0.5rem;
      label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-main); }
    }

    .input-wrapper, .select-wrapper {
      position: relative; display: block;
      ng-icon {
        position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%);
        color: var(--color-text-muted); font-size: 1rem; z-index: 5; pointer-events: none;
      }
    }
    .input-wrapper input, .select-wrapper select {
      width: 100%; box-sizing: border-box;
      padding: 0.625rem 1rem 0.625rem 2.5rem;
      background: var(--color-bg-surface); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); font-size: var(--font-size-base); color: var(--color-text-main);
      transition: var(--transition-fast); outline: none; appearance: none;
      &::placeholder { color: var(--color-text-muted); }
      &:focus { border-color: var(--color-accent-primary); box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1); }
    }

    .form-switches { display: flex; flex-direction: column; gap: 0.75rem; padding-top: 0.5rem; }
    .form-check {
      display: flex; align-items: center; gap: 0.75rem; cursor: pointer;
      input[type="checkbox"] { width: 1rem; height: 1rem; accent-color: var(--color-accent-primary); cursor: pointer; }
      label { font-size: var(--font-size-base); color: var(--color-text-main); cursor: pointer; }
    }

    .error-msg { font-size: var(--font-size-xs); color: var(--color-danger-text); margin-top: 0.25rem; display: block; }
    .has-error .input-wrapper input {
      border-color: var(--color-danger-text) !important;
      background-color: rgba(var(--color-danger-rgb), 0.02) !important;
    }
  `]
})
export class UnitFormComponent {
  private fb = inject(FormBuilder);
  private unitsSvc = inject(UnitsService);
  private toastSvc = inject(ToastService);

  @Output() saved = new EventEmitter<Unit>();
  @Output() cancelled = new EventEmitter<void>();

  editingId = signal<string | null>(null);
  isSubmitting = signal(false);

  readonly typeOptions: { value: UnitType; label: string }[] = [
    { value: 'UNIT',   label: UNIT_TYPE_LABELS.UNIT   },
    { value: 'WEIGHT', label: UNIT_TYPE_LABELS.WEIGHT },
    { value: 'VOLUME', label: UNIT_TYPE_LABELS.VOLUME },
    { value: 'OTHER',  label: UNIT_TYPE_LABELS.OTHER  },
  ];

  unitForm: FormGroup = this.fb.group({
    name:         ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    abbreviation: ['', [Validators.required, Validators.maxLength(10)]],
    type:         ['UNIT'],
    isActive:     [true],
  });

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
    if (this.unitForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const id = this.editingId();
    const dto = this.unitForm.value;

    const req$ = id ? this.unitsSvc.update(id, dto) : this.unitsSvc.create(dto);

    req$.subscribe({
      next: (unit) => {
        this.toastSvc.success(`Unidad ${id ? 'actualizada' : 'creada'} correctamente`);
        this.saved.emit(unit);
        this.isSubmitting.set(false);
        this.resetForm();
      },
      error: (err) => {
        console.error('Error saving unit:', err);
        this.toastSvc.error(`Error al ${id ? 'actualizar' : 'crear'} la unidad`);
        this.isSubmitting.set(false);
      }
    });
  }

  toggleActive(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.unitForm.get('isActive')?.setValue(checked);
    this.unitForm.markAsDirty();
  }

  onCancel() { this.cancelled.emit(); }
  hasUnsavedChanges(): boolean { return this.unitForm.dirty; }
}
