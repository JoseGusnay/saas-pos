import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideTag, lucideGlobe } from '@ng-icons/lucide';
import { BrandService } from '../../../../core/services/brand.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Brand } from '../../../../core/models/brand.models';

@Component({
  selector: 'app-brand-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [
    provideIcons({ lucideTag, lucideGlobe })
  ],
  template: `
    <div class="brand-form-container">
      <form [formGroup]="brandForm" class="premium-form" (ngSubmit)="onSubmit()">
        <fieldset [disabled]="isSubmitting()" style="border: none; padding: 0; margin: 0; display: contents;">

          <div class="form-section">
            <h3 class="section-title">Información General</h3>

            <div class="form-group" [class.has-error]="brandForm.get('name')?.invalid && brandForm.get('name')?.touched">
              <label for="name">Nombre de la Marca</label>
              <div class="input-wrapper">
                <ng-icon name="lucideTag"></ng-icon>
                <input
                  id="name"
                  type="text"
                  formControlName="name"
                  placeholder="Ej: Johnnie Walker, Smirnoff...">
              </div>
              @if (brandForm.get('name')?.invalid && brandForm.get('name')?.touched) {
                <small class="error-msg">El nombre es obligatorio (min. 2 caracteres).</small>
              }
            </div>

            <div class="form-group">
              <label for="country">País de Origen</label>
              <div class="input-wrapper">
                <ng-icon name="lucideGlobe"></ng-icon>
                <input
                  id="country"
                  type="text"
                  formControlName="country"
                  placeholder="Ej: Escocia, Rusia, México...">
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3 class="section-title">Ajustes y Estado</h3>
            <div class="form-switches">
              <div class="form-check">
                <input id="status" type="checkbox" [checked]="brandForm.get('status')?.value === 'ACTIVE'" (change)="toggleStatus($event)">
                <label for="status">Marca activa</label>
              </div>
            </div>
          </div>

        </fieldset>
      </form>
    </div>
  `,
  styles: [`
    .brand-form-container {
      padding: 0;
      width: 100%;
      box-sizing: border-box;
    }

    .premium-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
    }

    .section-title {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-main);
      }
    }

    .input-wrapper {
      position: relative;
      display: block;

      ng-icon {
        position: absolute;
        left: 0.875rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-text-muted);
        font-size: 1rem;
        z-index: 5;
      }

      input {
        width: 100%;
        box-sizing: border-box;
        padding: 0.625rem 2.875rem 0.625rem 2.5rem;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        font-size: var(--font-size-base);
        color: var(--color-text-main);
        transition: var(--transition-fast);
        outline: none;

        &::placeholder {
          color: var(--color-text-muted);
        }

        &:focus {
          border-color: var(--color-accent-primary);
          box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
        }
      }
    }

    .form-switches {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-top: 0.5rem;
    }

    .form-check {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;

      input[type="checkbox"] {
        width: 1rem;
        height: 1rem;
        accent-color: var(--color-accent-primary);
        cursor: pointer;
      }

      label {
        font-size: var(--font-size-base);
        color: var(--color-text-main);
        cursor: pointer;
      }
    }

    .error-msg {
      font-size: var(--font-size-xs);
      color: var(--color-danger-text);
      margin-top: 0.25rem;
      display: block;
    }

    .has-error {
      .input-wrapper input {
        border-color: var(--color-danger-text) !important;
        background-color: rgba(var(--color-danger-rgb), 0.02) !important;
      }
    }
  `]
})
export class BrandFormComponent {
  private fb = inject(FormBuilder);
  private brandService = inject(BrandService);
  private toastService = inject(ToastService);

  @Output() saved = new EventEmitter<Brand>();
  @Output() cancelled = new EventEmitter<void>();

  editingBrandId = signal<string | null>(null);

  brandForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    country: [''],
    status: ['ACTIVE']
  });

  isSubmitting = signal(false);

  setBrand(brand: Brand) {
    this.editingBrandId.set(brand.id);
    this.brandForm.patchValue({
      name: brand.name,
      country: brand.country,
      status: brand.status
    });
    this.brandForm.markAsPristine();
  }

  resetForm() {
    this.editingBrandId.set(null);
    this.brandForm.reset({ status: 'ACTIVE' });
    this.brandForm.markAsPristine();
  }

  onSubmit() {
    if (this.brandForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const brandData = this.brandForm.value;
    const brandId = this.editingBrandId();

    const request$ = brandId
      ? this.brandService.update(brandId, brandData)
      : this.brandService.create(brandData);

    request$.subscribe({
      next: (brand) => {
        this.toastService.success(`Marca ${brandId ? 'actualizada' : 'creada'} correctamente`);
        this.saved.emit(brand);
        this.isSubmitting.set(false);
        this.resetForm();
      },
      error: (err) => {
        console.error('Error saving brand:', err);
        const isEditing = !!this.editingBrandId();
        this.toastService.error(`Error al ${isEditing ? 'actualizar' : 'crear'} la marca`);
        this.isSubmitting.set(false);
      }
    });
  }

  toggleStatus(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.brandForm.get('status')?.setValue(isChecked ? 'ACTIVE' : 'INACTIVE');
    this.brandForm.markAsDirty();
  }

  onCancel() { this.cancelled.emit(); }
  hasUnsavedChanges(): boolean { return this.brandForm.dirty; }
}
