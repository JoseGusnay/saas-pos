import {
  Component, Input, Output, EventEmitter, ViewChild, OnChanges, SimpleChanges, signal
} from '@angular/core';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { BrandFormComponent } from '../brand-form/brand-form';
import { Brand } from '../../../../core/models/brand.models';

@Component({
  selector: 'app-brand-drawer',
  standalone: true,
  imports: [DrawerComponent, ModalComponent, FormButtonComponent, BrandFormComponent],
  template: `
    <app-drawer
      [isOpen]="isOpen"
      [title]="brand ? 'Editar Marca' : 'Nueva Marca'"
      [allowClose]="!(brandFormRef?.isSubmitting() ?? false)"
      (close)="onClose()"
      size="md"
    >
      <div drawerBody>
        <app-brand-form #brandForm (saved)="onFormSaved($event)"></app-brand-form>
      </div>
      <div drawerFooter class="drawer-footer-actions">
        <app-form-button
          label="Cancelar"
          variant="secondary"
          [disabled]="brandFormRef?.isSubmitting() ?? false"
          (click)="onClose()"
        ></app-form-button>
        <app-form-button
          [label]="brand ? 'Actualizar' : 'Guardar'"
          icon="lucideSave"
          [loading]="brandFormRef?.isSubmitting() ?? false"
          [disabled]="brandFormRef?.brandForm?.invalid ?? true"
          (click)="brandFormRef?.onSubmit()"
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
export class BrandDrawerComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() brand?: Brand;

  @Output() saved = new EventEmitter<Brand>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('brandForm') brandFormRef?: BrandFormComponent;

  showConfirmModal = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue === true) {
      setTimeout(() => {
        if (this.brand) {
          this.brandFormRef?.setBrand(this.brand);
        } else {
          this.brandFormRef?.resetForm();
        }
      }, 0);
    }
  }

  onClose() {
    if (this.brandFormRef?.hasUnsavedChanges()) {
      this.showConfirmModal.set(true);
    } else {
      this.close.emit();
    }
  }

  onFormSaved(brand: Brand) {
    this.saved.emit(brand);
    this.close.emit();
  }

  confirmClose() {
    this.showConfirmModal.set(false);
    this.close.emit();
  }
}
