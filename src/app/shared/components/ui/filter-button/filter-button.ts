import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { IconComponent } from '../../../../core/layout/atoms/icon/icon.component';
import { BadgeComponent } from '../../../../core/layout/atoms/badge/badge.component';

@Component({
  selector: 'app-filter-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, BadgeComponent],
  template: `
    <div class="fb">
      <button
        type="button"
        class="fb__btn"
        [class.fb__btn--active]="activeCount() > 0"
        (click)="openFilters.emit()"
      >
        <app-icon [name]="icon()"></app-icon>
        <span class="fb__label">{{ label() }}</span>
        @if (activeCount() > 0) {
          <app-badge [text]="activeCount().toString()" variant="primary"></app-badge>
        }
      </button>

      @if (activeCount() > 0) {
        <button
          type="button"
          class="fb__clear"
          (click)="clearFilters.emit()"
        >
          {{ clearLabel() }}
        </button>
      }
    </div>
  `,
  styles: [`
    .fb {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .fb__btn {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      background: transparent;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      font-family: inherit;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
      white-space: nowrap;

      app-icon {
        width: 14px;
        height: 14px;
      }

      &:hover {
        border-color: var(--color-border-hover);
        color: var(--color-text-main);
      }

      &--active {
        border-color: var(--color-accent-interactive);
        color: var(--color-text-main);
        background: var(--color-bg-active);
      }
    }

    .fb__label {
      @media (max-width: 768px) {
        display: none;
      }
    }

    .fb__clear {
      background: transparent;
      border: none;
      font-size: var(--font-size-sm);
      font-family: inherit;
      font-weight: var(--font-weight-medium);
      color: var(--color-danger-text);
      cursor: pointer;
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      white-space: nowrap;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-bg-hover);
      }

      @media (max-width: 768px) {
        display: none;
      }
    }
  `]
})
export class FilterButtonComponent {
  icon        = input('lucideFilter');
  label       = input('Filtros Avanzados');
  clearLabel  = input('Limpiar Todo');
  activeCount = input(0);

  openFilters  = output<void>();
  clearFilters = output<void>();
}
