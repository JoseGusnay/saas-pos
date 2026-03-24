import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { ConfirmService } from '../services/confirm.service';

export interface HasUnsavedChanges {
  isDirty: () => boolean;
  savedSuccessfully: boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (component.isDirty() && !component.savedSuccessfully) {
    const confirmService = inject(ConfirmService);
    return confirmService.confirm({
      title: 'Cambios sin guardar',
      message: 'Tienes cambios sin guardar. ¿Deseas salir de todos modos?',
      confirmLabel: 'Salir sin guardar',
      cancelLabel: 'Seguir editando',
      variant: 'warning',
    });
  }
  return true;
};
