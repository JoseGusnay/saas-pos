import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrandService } from '../../../../core/services/brand.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Brand } from '../../../../core/models/brand.models';

@Component({
  selector: 'app-brand-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './brand-form.html',
  styleUrls: ['./brand-form.scss']
})
export class BrandFormComponent {
  private fb = inject(FormBuilder);
  private brandService = inject(BrandService);
  private toastService = inject(ToastService);

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  editingBrandId = signal<string | null>(null);

  brandForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    country: [''],
    status: ['ACTIVE']
  });

  isSubmitting = false;

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
    this.brandForm.reset({
      status: 'ACTIVE'
    });
    this.brandForm.markAsPristine();
  }

  onSubmit() {
    if (this.brandForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const brandData = this.brandForm.value;
    const brandId = this.editingBrandId();

    const request$ = brandId 
      ? this.brandService.update(brandId, brandData)
      : this.brandService.create(brandData);

    request$.subscribe({
      next: () => {
        this.saved.emit();
        this.isSubmitting = false;
        this.resetForm();
      },
      error: (err) => {
        console.error('Error saving brand:', err);
        const isEditing = !!this.editingBrandId();
        this.toastService.error(`Error al ${isEditing ? 'actualizar' : 'crear'} la marca`);
        this.isSubmitting = false;
      }
    });
  }

  onCancel() {
    this.cancelled.emit();
  }

  hasUnsavedChanges(): boolean {
    return this.brandForm.dirty;
  }
}
