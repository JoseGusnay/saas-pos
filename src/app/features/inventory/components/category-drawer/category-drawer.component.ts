import {
  Component, Input, Output, EventEmitter, ViewChild, OnChanges, SimpleChanges, signal
} from '@angular/core';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { CategoryFormComponent } from '../category-form/category-form.component';
import { Category } from '../../../../core/models/category.models';

@Component({
  selector: 'app-category-drawer',
  standalone: true,
  imports: [DrawerComponent, ModalComponent, FormButtonComponent, CategoryFormComponent],
  template: `
    <app-drawer
      [isOpen]="isOpen"
      [title]="category ? 'Editar Categoría' : 'Nueva Categoría'"
      [allowClose]="!(catFormRef?.isSubmitting() ?? false)"
      (close)="onClose()"
      size="md"
    >
      <div drawerBody>
        <app-category-form #catForm (saved)="onFormSaved($event)"></app-category-form>
      </div>
      <div drawerFooter class="drawer-footer-actions">
        <app-form-button
          label="Cancelar"
          variant="secondary"
          [disabled]="catFormRef?.isSubmitting() ?? false"
          (click)="onClose()"
        ></app-form-button>
        <app-form-button
          [label]="category ? 'Actualizar' : 'Guardar'"
          icon="lucideSave"
          [loading]="catFormRef?.isSubmitting() ?? false"
          [disabled]="catFormRef?.categoryForm?.invalid ?? true"
          (click)="catFormRef?.onSubmit()"
        ></app-form-button>
      </div>
    </app-drawer>

    <app-modal
      [isOpen]="showConfirmModal()"
      title="Cambios sin guardar"
      (close)="showConfirmModal.set(false)"
    >
      <div modalBody>
        Tienes cambios en el formulario que no has guardado. ¿Estás seguro de que quieres salir? Se perderán todos los datos ingresados.
      </div>
      <div modalFooter class="modal-footer-actions">
        <app-form-button
          label="Continuar Editando"
          variant="secondary"
          (click)="showConfirmModal.set(false)"
        ></app-form-button>
        <app-form-button
          label="Salir sin Guardar"
          variant="danger"
          (click)="confirmClose()"
        ></app-form-button>
      </div>
    </app-modal>
  `
})
export class CategoryDrawerComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() category?: Category;

  @Output() saved = new EventEmitter<Category>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('catForm') catFormRef?: CategoryFormComponent;

  showConfirmModal = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue === true) {
      setTimeout(() => {
        if (this.category) {
          this.catFormRef?.setCategory(this.category);
        } else {
          this.catFormRef?.resetForm();
        }
      }, 0);
    }
  }

  onClose() {
    if (this.catFormRef?.hasUnsavedChanges()) {
      this.showConfirmModal.set(true);
    } else {
      this.close.emit();
    }
  }

  onFormSaved(cat: Category) {
    this.saved.emit(cat);
    this.close.emit();
  }

  confirmClose() {
    this.showConfirmModal.set(false);
    this.close.emit();
  }
}
