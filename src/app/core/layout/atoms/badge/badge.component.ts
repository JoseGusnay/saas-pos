import { Component, input } from '@angular/core';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'danger';

@Component({
    selector: 'app-badge',
    standalone: true,
    template: `
    <span class="badge" [class]="'badge--' + variant()">
      {{ text() }}
    </span>
  `,
    styleUrl: './badge.component.scss'
})
export class BadgeComponent {
    // Signals inputs (Angular 17+)
    text = input.required<string | number>();
    variant = input<BadgeVariant>('default');
}
