import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type IconButtonVariant = 'ghost' | 'subtle' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

/**
 * IconButton — DS Atom
 * Square icon-only button. Used for table actions, toolbar items, etc.
 */
@Component({
    selector: 'ui-icon-button',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <button
            class="icon-btn"
            [class]="'icon-btn--' + variant() + ' icon-btn--' + size()"
            [disabled]="disabled()"
            [type]="type()"
            [attr.aria-label]="label()"
            [title]="label()"
            (click)="clicked.emit($event)"
        >
            <ng-content />
        </button>
    `,
    styleUrl: './icon-button.component.scss',
})
export class IconButtonComponent {
    readonly variant = input<IconButtonVariant>('ghost');
    readonly size = input<IconButtonSize>('md');
    readonly disabled = input<boolean>(false);
    readonly label = input.required<string>();
    readonly type = input<'button' | 'submit'>('button');

    readonly clicked = output<MouseEvent>();
}
