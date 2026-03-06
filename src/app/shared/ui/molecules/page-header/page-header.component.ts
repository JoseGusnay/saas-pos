import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * PageHeader — DS Molecule
 * Consistent page title + optional subtitle + primary action slot.
 * Used on every feature page — Branches, Orders, Products, etc.
 */
@Component({
    selector: 'ui-page-header',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <header class="page-header">
            <div class="page-header__text">
                <h1 class="page-header__title">{{ title() }}</h1>
                <p *ngIf="subtitle()" class="page-header__subtitle">{{ subtitle() }}</p>
            </div>
            <div class="page-header__actions">
                <ng-content />
            </div>
        </header>
    `,
    styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
    readonly title = input.required<string>();
    readonly subtitle = input<string>('');
}
