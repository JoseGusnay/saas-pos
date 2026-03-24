import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PresentationService } from '../../../../core/services/presentation.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Presentation } from '../../../../core/models/presentation.models';
import { FieldInputComponent } from '../../../../shared/components/ui/field-input/field-input';
import { FieldToggleComponent } from '../../../../shared/components/ui/field-toggle/field-toggle';

@Component({
  selector: 'app-presentation-form',
  standalone: true,
  imports: [ReactiveFormsModule, FieldInputComponent, FieldToggleComponent],
  template: `
    <form [formGroup]="presentationForm" class="pf">

      <app-field-input
        label="Nombre de la Presentación"
        formControlName="name"
        placeholder="Ej: Botella 750ml, Caja x12..."
        [required]="true"
        [errorMessages]="{ required: 'El nombre es obligatorio', minlength: 'Mínimo 2 caracteres' }"
      ></app-field-input>

      <app-field-input
        label="Descripción"
        formControlName="description"
        placeholder="Describe brevemente esta presentación..."
        [optional]="true"
        [multiline]="true"
        [rows]="3"
      ></app-field-input>

      <div class="pf__divider"><span>Estado</span></div>

      <app-field-toggle
        label="Presentación activa"
        description="Las presentaciones inactivas no se muestran en el catálogo"
        formControlName="isActive"
      ></app-field-toggle>

    </form>
  `,
  styles: [`
    .pf {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .pf__divider {
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
export class PresentationFormComponent {
  private fb = inject(FormBuilder);
  private presentationService = inject(PresentationService);
  private toastService = inject(ToastService);

  @Output() saved = new EventEmitter<void>();

  editingPresentationId = signal<string | null>(null);
  isSubmitting = signal(false);

  presentationForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    isActive: [true],
  });

  setPresentation(presentation: Presentation) {
    this.editingPresentationId.set(presentation.id);
    this.presentationForm.patchValue({
      name: presentation.name,
      description: presentation.description,
      isActive: presentation.isActive,
    });
    this.presentationForm.markAsPristine();
  }

  resetForm() {
    this.editingPresentationId.set(null);
    this.presentationForm.reset({ isActive: true });
    this.presentationForm.markAsPristine();
  }

  onSubmit() {
    if (this.presentationForm.invalid || this.isSubmitting()) {
      this.presentationForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const v = this.presentationForm.getRawValue();
    const id = this.editingPresentationId();

    const payload = {
      name: v.name!,
      description: v.description || undefined,
      isActive: v.isActive ?? true,
    };

    const request$ = id
      ? this.presentationService.update(id, payload)
      : this.presentationService.create(payload);

    request$.subscribe({
      next: () => {
        this.toastService.success(`Presentación ${id ? 'actualizada' : 'creada'} correctamente`);
        this.saved.emit();
        this.isSubmitting.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.toastService.error(err?.error?.error ?? `Error al ${id ? 'actualizar' : 'crear'} la presentación`);
        this.isSubmitting.set(false);
      },
    });
  }

  hasUnsavedChanges(): boolean { return this.presentationForm.dirty; }
}
