import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
    signal,
    HostListener,
    ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableAction {
    id: string;
    label: string;
    icon?: string; // SVG path d=""
    variant?: 'default' | 'danger';
    disabled?: boolean;
}

/**
 * TableActionMenu — DS Molecule
 * A "⋯" kebab menu for per-row actions (edit, delete, etc).
 * Auto-closes on outside click or Escape.
 */
@Component({
    selector: 'ui-table-action-menu',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="action-menu">
            <button
                class="action-menu__trigger"
                type="button"
                aria-label="Acciones"
                [attr.aria-expanded]="isOpen()"
                (click)="toggle()"
            >
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5"/>
                    <circle cx="12" cy="12" r="1.5"/>
                    <circle cx="12" cy="19" r="1.5"/>
                </svg>
            </button>

            @if (isOpen()) {
                <div class="action-menu__dropdown" role="menu">
                    @for (action of actions(); track action.id) {
                        <button
                            class="action-menu__item"
                            [class.action-menu__item--danger]="action.variant === 'danger'"
                            [disabled]="action.disabled"
                            role="menuitem"
                            type="button"
                            (click)="onAction(action)"
                        >
                            @if (action.icon) {
                                <svg class="action-menu__item-icon" viewBox="0 0 24 24"
                                     fill="none" stroke="currentColor"
                                     stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                                    <path [attr.d]="action.icon" />
                                </svg>
                            }
                            {{ action.label }}
                        </button>
                    }
                </div>
            }
        </div>
    `,
    styleUrl: './table-action-menu.component.scss',
})
export class TableActionMenuComponent {
    readonly actions = input.required<TableAction[]>();
    readonly actionClicked = output<TableAction>();

    readonly isOpen = signal(false);

    constructor(private el: ElementRef) { }

    toggle(): void {
        this.isOpen.update(v => !v);
    }

    onAction(action: TableAction): void {
        if (action.disabled) return;
        this.isOpen.set(false);
        this.actionClicked.emit(action);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.el.nativeElement.contains(event.target)) {
            this.isOpen.set(false);
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.isOpen.set(false);
    }
}
