import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PresentationService } from '../../../../core/services/presentation.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Presentation } from '../../../../core/models/presentation.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle } from '@ng-icons/lucide';

@Component({
  selector: 'app-presentation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [
    provideIcons({ lucideAlertCircle })
  ],
  templateUrl: './presentation-form.html',
  styleUrls: ['./presentation-form.scss']
})
export class PresentationFormComponent {
  private fb = inject(FormBuilder);
  private presentationService = inject(PresentationService);
  private toastService = inject(ToastService);

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  editingPresentationId = signal<string | null>(null);

  presentationForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    isActive: [true]
  });

  isSubmitting = false;

  setPresentation(presentation: Presentation) {
    this.editingPresentationId.set(presentation.id);
    this.presentationForm.patchValue({
      name: presentation.name,
      description: presentation.description,
      isActive: presentation.isActive
    });
    this.presentationForm.markAsPristine();
  }

  resetForm() {
    this.editingPresentationId.set(null);
    this.presentationForm.reset({
      isActive: true
    });
    this.presentationForm.markAsPristine();
  }

  onSubmit() {
    if (this.presentationForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const presentationData = this.presentationForm.value;
    const presentationId = this.editingPresentationId();

    const request$ = presentationId 
      ? this.presentationService.update(presentationId, presentationData)
      : this.presentationService.create(presentationData);

    request$.subscribe({
      next: () => {
        const isEditing = !!this.editingPresentationId();
        this.toastService.success(`Presentación ${isEditing ? 'actualizada' : 'creada'} correctamente`);
        this.saved.emit();
        this.isSubmitting = false;
        this.resetForm();
      },
      error: (err) => {
        console.error('Error saving presentation:', err);
        const isEditing = !!this.editingPresentationId();
        this.toastService.error(`Error al ${isEditing ? 'actualizar' : 'crear'} la presentación`);
        this.isSubmitting = false;
      }
    });
  }

  onCancel() {
    this.cancelled.emit();
  }

  hasUnsavedChanges(): boolean {
    return this.presentationForm.dirty;
  }
}
