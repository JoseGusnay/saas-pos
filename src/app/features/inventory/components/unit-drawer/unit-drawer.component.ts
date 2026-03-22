import {
  Component, Input, Output, EventEmitter, ViewChild, OnChanges, SimpleChanges, signal
} from '@angular/core';
import { DrawerComponent } from '../../../../shared/components/ui/drawer/drawer';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';
import { FormButtonComponent } from '../../../../shared/components/ui/form-button/form-button';
import { UnitFormComponent } from '../unit-form/unit-form';
import { Unit } from '../../../../core/models/unit.models';

@Component({
  selector: 'app-unit-drawer',
  standalone: true,
  imports: [DrawerComponent, ModalComponent, FormButtonComponent, UnitFormComponent],
  template: `
    <app-drawer
      [isOpen]="isOpen"
      [title]="unit ? 'Editar Unidad' : 'Nueva Unidad'"
      [allowClose]="!(unitFormRef?.isSubmitting() ?? false)"
      (close)="onClose()"
      size="md"
    >
      <div drawerBody>
        <app-unit-form #unitForm (saved)="onFormSaved($event)"></app-unit-form>
      </div>
      <div drawerFooter class="drawer-footer-actions">
        <app-form-button
          label="Cancelar"
          variant="secondary"
          [disabled]="unitFormRef?.isSubmitting() ?? false"
          (click)="onClose()"
        ></app-form-button>
        <app-form-button
          [label]="unit ? 'Actualizar' : 'Guardar'"
          icon="lucideSave"
          [loading]="unitFormRef?.isSubmitting() ?? false"
          [disabled]="unitFormRef?.unitForm?.invalid ?? true"
          (click)="unitFormRef?.onSubmit()"
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
export class UnitDrawerComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() unit?: Unit;

  @Output() saved = new EventEmitter<Unit>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('unitForm') unitFormRef?: UnitFormComponent;

  showConfirmModal = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue === true) {
      setTimeout(() => {
        if (this.unit) {
          this.unitFormRef?.setUnit(this.unit);
        } else {
          this.unitFormRef?.resetForm();
        }
      }, 0);
    }
  }

  onClose() {
    if (this.unitFormRef?.hasUnsavedChanges()) {
      this.showConfirmModal.set(true);
    } else {
      this.close.emit();
    }
  }

  onFormSaved(unit: Unit) {
    this.saved.emit(unit);
    this.close.emit();
  }

  confirmClose() {
    this.showConfirmModal.set(false);
    this.close.emit();
  }
}
