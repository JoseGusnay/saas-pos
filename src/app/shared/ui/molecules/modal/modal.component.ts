import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
    signal,
    HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Modal — DS Molecule
 * Generic modal shell with header, body, and footer content slots.
 * Closes on backdrop click or Escape key.
 */
@Component({
    selector: 'ui-modal',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (isOpen()) {
            <div class="modal-backdrop" (click)="onBackdropClick($event)">
                <div
                    class="modal"
                    [class]="'modal--' + size()"
                    role="dialog"
                    [attr.aria-label]="title()"
                    aria-modal="true"
                    (click)="$event.stopPropagation()"
                >
                    <!-- Header -->
                    <div class="modal__header">
                        <h2 class="modal__title">{{ title() }}</h2>
                        <button
                            class="modal__close"
                            type="button"
                            aria-label="Cerrar"
                            (click)="closed.emit()"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 6 6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="modal__body">
                        <ng-content select="[body]" />
                    </div>

                    <!-- Footer -->
                    <div class="modal__footer">
                        <ng-content select="[footer]" />
                    </div>
                </div>
            </div>
        }
    `,
    styleUrl: './modal.component.scss',
})
export class ModalComponent {
    readonly isOpen = input<boolean>(false);
    readonly title = input.required<string>();
    readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');

    readonly closed = output<void>();

    @HostListener('document:keydown.escape')
    onEscapeKey(): void {
        if (this.isOpen()) {
            this.closed.emit();
        }
    }

    onBackdropClick(event: MouseEvent): void {
        this.closed.emit();
    }
}
