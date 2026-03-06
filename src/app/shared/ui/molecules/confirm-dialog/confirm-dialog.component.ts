import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { ButtonComponent } from '../../atoms/button/button.component';

/**
 * ConfirmDialog — DS Molecule
 * Destructive action confirmation modal.
 * Reusable for delete/dangerous operations across the app.
 */
@Component({
    selector: 'ui-confirm-dialog',
    standalone: true,
    imports: [ButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (isOpen()) {
            <div class="confirm-backdrop" (click)="onCancel()">
                <div
                    class="confirm-dialog"
                    role="alertdialog"
                    [attr.aria-label]="title()"
                    aria-modal="true"
                    (click)="$event.stopPropagation()"
                >
                    <!-- Icon -->
                    <div class="confirm-dialog__icon confirm-dialog__icon--danger">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        </svg>
                    </div>

                    <h3 class="confirm-dialog__title">{{ title() }}</h3>
                    <p class="confirm-dialog__message">{{ message() }}</p>

                    <div class="confirm-dialog__actions">
                        <ui-button variant="outline" size="md" (clicked)="onCancel()">
                            {{ cancelLabel() }}
                        </ui-button>
                        <ui-button variant="danger" size="md" [loading]="loading()" (clicked)="onConfirm()">
                            {{ confirmLabel() }}
                        </ui-button>
                    </div>
                </div>
            </div>
        }
    `,
    styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
    readonly isOpen = input<boolean>(false);
    readonly title = input<string>('¿Estás seguro?');
    readonly message = input<string>('Esta acción no se puede deshacer.');
    readonly confirmLabel = input<string>('Eliminar');
    readonly cancelLabel = input<string>('Cancelar');
    readonly loading = input<boolean>(false);

    readonly confirmed = output<void>();
    readonly cancelled = output<void>();

    onConfirm(): void { this.confirmed.emit(); }
    onCancel(): void { this.cancelled.emit(); }
}
