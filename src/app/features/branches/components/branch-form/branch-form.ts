import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BranchService } from '../../../../core/services/branch.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Branch } from '../../../../core/models/branch.models';



@Component({
  selector: 'app-branch-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './branch-form.html',
  styleUrls: ['./branch-form.scss']
})

export class BranchFormComponent {
  private fb = inject(FormBuilder);
  private branchService = inject(BranchService);
  private toastService = inject(ToastService);



  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  editingBranchId = signal<string | null>(null);

  branchForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    address: [''],
    phone: [''],
    city: [''],
    manager: [''],
    isActive: [true],
    isMain: [false]
  });

  isSubmitting = false;

  setBranch(branch: Branch) {
    this.editingBranchId.set(branch.id);
    this.branchForm.patchValue({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      city: branch.city,
      manager: branch.manager,
      isActive: branch.isActive,
      isMain: branch.isMain
    });
    this.branchForm.markAsPristine();
  }

  resetForm() {
    this.editingBranchId.set(null);
    this.branchForm.reset({
      isActive: true,
      isMain: false
    });
  }

  onSubmit() {
    if (this.branchForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const branchData = this.branchForm.value;
    const branchId = this.editingBranchId();

    const request$ = branchId 
      ? this.branchService.update(branchId, branchData)
      : this.branchService.create(branchData);

    request$.subscribe({
      next: (branch) => {
        this.saved.emit();
        this.isSubmitting = false;
        this.resetForm();
      },
      error: (err) => {
        console.error('Error saving branch:', err);
        const isEditing = !!this.editingBranchId();
        this.toastService.error(`Error al ${isEditing ? 'actualizar' : 'crear'} la sucursal`);
        this.isSubmitting = false;
      }


    });
  }

  onCancel() {
    this.cancelled.emit();
  }

  hasUnsavedChanges(): boolean {
    return this.branchForm.dirty;
  }
}
