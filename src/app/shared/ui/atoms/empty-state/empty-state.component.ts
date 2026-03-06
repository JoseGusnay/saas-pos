import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * EmptyState — DS Atom
 * Shown when a list/table has no data.
 * Accepts an icon (SVG path), title, description, and optional action slot.
 */
@Component({
    selector: 'ui-empty-state',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="empty-state">
            <div class="empty-state__icon" *ngIf="icon()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path [attr.d]="icon()" />
                </svg>
            </div>
            <h3 class="empty-state__title">{{ title() }}</h3>
            <p class="empty-state__description" *ngIf="description()">{{ description() }}</p>
            <div class="empty-state__action" *ngIf="hasAction">
                <ng-content select="[action]" />
            </div>
        </div>
    `,
    styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
    readonly icon = input<string>(''); // SVG path d=""
    readonly title = input.required<string>();
    readonly description = input<string>('');

    get hasAction(): boolean {
        return true; // Always render slot, let content projection handle emptiness
    }
}
