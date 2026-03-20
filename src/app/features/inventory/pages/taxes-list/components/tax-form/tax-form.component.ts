import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaxService } from '../../../../../../core/services/tax.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { Tax } from '../../../../../../core/models/tax.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideTag, lucidePercent, lucideHash, lucideFileText } from '@ng-icons/lucide';

@Component({
  selector: 'app-tax-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [
    provideIcons({ lucideTag, lucidePercent, lucideHash, lucideFileText })
  ],
  template: `
    <div class="tax-form-container">
      <form [formGroup]="taxForm" class="premium-form" (ngSubmit)="onSubmit()">
        <fieldset [disabled]="isSubmitting()" style="border: none; padding: 0; margin: 0; display: contents;">

          <div class="form-section">
            <h3 class="section-title">Identificación</h3>

            <div class="form-group" [class.has-error]="taxForm.get('name')?.invalid && taxForm.get('name')?.touched">
              <label for="name">Nombre del Impuesto *</label>
              <div class="input-wrapper">
                <ng-icon name="lucideTag"></ng-icon>
                <input id="name" type="text" formControlName="name" placeholder="Ej: IVA 12%, ICE Bebidas...">
              </div>
              @if (taxForm.get('name')?.invalid && taxForm.get('name')?.touched) {
                <small class="error-msg">El nombre es obligatorio (mín. 2 caracteres).</small>
              }
            </div>

            <div class="form-row">
              <div class="form-group" [class.has-error]="taxForm.get('code')?.invalid && taxForm.get('code')?.touched">
                <label for="code">Código Interno *</label>
                <div class="input-wrapper">
                  <ng-icon name="lucideHash"></ng-icon>
                  <input id="code" type="text" formControlName="code" placeholder="Ej: IVA12, ICE">
                </div>
                @if (taxForm.get('code')?.invalid && taxForm.get('code')?.touched) {
                  <small class="error-msg">El código es obligatorio.</small>
                }
              </div>

              <div class="form-group">
                <label for="sriCode">Código SRI</label>
                <div class="input-wrapper">
                  <ng-icon name="lucideFileText"></ng-icon>
                  <input id="sriCode" type="text" formControlName="sriCode" placeholder="Cód. tributario">
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Tipo y Tarifa</h3>

            <div class="form-group">
              <label>Tipo de Impuesto *</label>
              <div class="type-selector">
                <label class="type-option" [class.selected]="taxForm.get('type')?.value === 'PERCENTAGE'">
                  <input type="radio" formControlName="type" value="PERCENTAGE">
                  <ng-icon name="lucidePercent"></ng-icon>
                  <span>Porcentual</span>
                </label>
                <label class="type-option" [class.selected]="taxForm.get('type')?.value === 'FIXED'">
                  <input type="radio" formControlName="type" value="FIXED">
                  <span class="dollar-symbol">$</span>
                  <span>Monto Fijo</span>
                </label>
              </div>
            </div>

            <div class="form-row">
              @if (taxForm.get('type')?.value === 'PERCENTAGE') {
                <div class="form-group" [class.has-error]="taxForm.get('percentage')?.invalid && taxForm.get('percentage')?.touched">
                  <label for="percentage">Porcentaje (%)</label>
                  <div class="input-wrapper">
                    <ng-icon name="lucidePercent"></ng-icon>
                    <input id="percentage" type="number" formControlName="percentage" min="0" max="100" step="0.01" placeholder="12.00">
                  </div>
                  @if (taxForm.get('percentage')?.invalid && taxForm.get('percentage')?.touched) {
                    <small class="error-msg">Porcentaje requerido (0–100).</small>
                  }
                </div>
              }

              <div class="form-group">
                <label for="fixedAmount">Monto Fijo ($)</label>
                <div class="input-wrapper">
                  <span class="input-prefix">$</span>
                  <input id="fixedAmount" type="number" formControlName="fixedAmount" min="0" step="0.01" placeholder="0.00">
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Estado</h3>
            <div class="form-switches">
              <div class="form-check">
                <input id="isActive" type="checkbox" formControlName="isActive">
                <label for="isActive">Impuesto activo</label>
              </div>
            </div>
          </div>

        </fieldset>
      </form>
    </div>
  `,
  styles: [`
    .tax-form-container { padding: 0; width: 100%; box-sizing: border-box; }

    .premium-form { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; }

    .form-section {
      display: flex; flex-direction: column; gap: 1rem; width: 100%;
    }

    .section-title {
      font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-muted);
      text-transform: uppercase; letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 0.5rem;
    }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

    .form-group { display: flex; flex-direction: column; gap: 0.5rem;
      label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-main); }
    }

    .input-wrapper {
      position: relative; display: block;
      ng-icon, .input-prefix {
        position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%);
        color: var(--color-text-muted); font-size: 1rem; z-index: 5;
        font-style: normal; font-weight: 600;
      }
      input {
        width: 100%; box-sizing: border-box; padding: 0.625rem 1rem 0.625rem 2.5rem;
        background: var(--color-bg-surface); border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md); font-size: var(--font-size-base);
        color: var(--color-text-main); transition: var(--transition-fast); outline: none;
        &::placeholder { color: var(--color-text-muted); }
        &:focus { border-color: var(--color-accent-primary); box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1); }
      }
    }

    .type-selector {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
      .type-option {
        display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem;
        border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
        cursor: pointer; transition: all var(--transition-fast);
        input[type="radio"] { display: none; }
        ng-icon, .dollar-symbol { color: var(--color-text-muted); font-size: 1rem; font-weight: 700; }
        span { font-size: var(--font-size-sm); font-weight: 500; }
        &.selected {
          border-color: var(--color-accent-primary);
          background-color: rgba(var(--color-primary-rgb), 0.05);
          ng-icon, .dollar-symbol { color: var(--color-accent-primary); }
        }
        &:hover:not(.selected) { border-color: var(--color-border-main); }
      }
    }

    .form-switches { padding-top: 0.5rem; }
    .form-check {
      display: flex; align-items: center; gap: 0.75rem; cursor: pointer;
      input[type="checkbox"] { width: 1rem; height: 1rem; accent-color: var(--color-accent-primary); cursor: pointer; }
      label { font-size: var(--font-size-base); color: var(--color-text-main); cursor: pointer; }
    }

    .error-msg { font-size: var(--font-size-xs); color: var(--color-danger-text); display: block; }
    .has-error .input-wrapper input {
      border-color: var(--color-danger-text) !important;
      background-color: rgba(var(--color-danger-rgb), 0.02) !important;
    }
  `]
})
export class TaxFormComponent {
  private fb = inject(FormBuilder);
  private taxService = inject(TaxService);
  private toastService = inject(ToastService);

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  editingTaxId = signal<string | null>(null);
  isSubmitting = signal(false);

  taxForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: ['', Validators.required],
    sriCode: [''],
    type: ['PERCENTAGE', Validators.required],
    percentage: [null],
    fixedAmount: [0],
    isActive: [true]
  });

  setTax(tax: Tax) {
    this.editingTaxId.set(tax.id);
    this.taxForm.patchValue({
      name: tax.name,
      code: tax.code,
      sriCode: tax.sriCode ?? '',
      type: tax.type,
      percentage: tax.percentage ?? null,
      fixedAmount: tax.fixedAmount ?? 0,
      isActive: tax.isActive
    });
    this.taxForm.markAsPristine();
  }

  resetForm() {
    this.editingTaxId.set(null);
    this.taxForm.reset({ type: 'PERCENTAGE', fixedAmount: 0, isActive: true });
    this.taxForm.markAsPristine();
  }

  onSubmit() {
    if (this.taxForm.invalid || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    const id = this.editingTaxId();
    const request$ = id
      ? this.taxService.update(id, this.taxForm.value)
      : this.taxService.create(this.taxForm.value);

    request$.subscribe({
      next: () => {
        this.toastService.success(`Impuesto ${id ? 'actualizado' : 'creado'} correctamente`);
        this.saved.emit();
        this.isSubmitting.set(false);
        this.resetForm();
      },
      error: (err) => {
        const msg = err?.error?.message || `Error al ${id ? 'actualizar' : 'crear'} el impuesto`;
        this.toastService.error(msg);
        this.isSubmitting.set(false);
      }
    });
  }

  hasUnsavedChanges(): boolean { return this.taxForm.dirty; }
}
