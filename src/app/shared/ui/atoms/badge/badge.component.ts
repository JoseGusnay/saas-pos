import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant =
    | 'default'
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'secondary';

export type BadgeSize = 'sm' | 'md';

/**
 * Badge — DS Atom
 * Displays a small status/label indicator.
 * Variants map directly to semantic color tokens.
 */
@Component({
    selector: 'ui-badge',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span
            class="badge"
            [class]="'badge--' + variant() + ' badge--' + size()"
        >
            <span *ngIf="dot()" class="badge__dot"></span>
            <ng-content />
        </span>
    `,
    styleUrl: './badge.component.scss',
})
export class BadgeComponent {
    readonly variant = input<BadgeVariant>('default');
    readonly size = input<BadgeSize>('md');
    readonly dot = input<boolean>(false);
}
