import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button — DS Atom
 * Full-featured button with variant, size, loading, and icon support.
 * Always uses design tokens — never hardcoded colors.
 */
@Component({
    selector: 'ui-button',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <button
            class="btn"
            [class]="'btn--' + variant() + ' btn--' + size()"
            [class.btn--loading]="loading()"
            [class.btn--icon-only]="iconOnly()"
            [disabled]="disabled() || loading()"
            [type]="type()"
            (click)="clicked.emit($event)"
        >
            <!-- Leading icon slot -->
            <span *ngIf="leadingIcon() && !loading()" class="btn__icon btn__icon--leading">
                <ng-container *ngTemplateOutlet="iconTpl" />
            </span>

            <!-- Spinner when loading -->
            <span *ngIf="loading()" class="btn__spinner" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-linecap="round" />
                </svg>
            </span>

            <!-- Label -->
            <span *ngIf="!iconOnly()" class="btn__label">
                <ng-content />
            </span>

            <!-- Trailing icon slot -->
            <span *ngIf="trailingIcon() && !loading()" class="btn__icon btn__icon--trailing">
                <ng-content select="[trailing]" />
            </span>
        </button>

        <ng-template #iconTpl>
            <ng-content select="[leading]" />
        </ng-template>
    `,
    styleUrl: './button.component.scss',
})
export class ButtonComponent {
    readonly variant = input<ButtonVariant>('primary');
    readonly size = input<ButtonSize>('md');
    readonly loading = input<boolean>(false);
    readonly disabled = input<boolean>(false);
    readonly iconOnly = input<boolean>(false);
    readonly leadingIcon = input<boolean>(false);
    readonly trailingIcon = input<boolean>(false);
    readonly type = input<'button' | 'submit' | 'reset'>('button');

    readonly clicked = output<MouseEvent>();
}
