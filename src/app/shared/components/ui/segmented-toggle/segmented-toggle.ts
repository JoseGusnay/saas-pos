import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideGrid, lucideList, lucideLayoutGrid, lucideRows3,
  lucideBarChart, lucideTable, lucideKanban
} from '@ng-icons/lucide';

export interface SegmentOption {
  value: string;
  icon?: string;
  label?: string;
}

@Component({
  selector: 'app-segmented-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIconComponent],
  providers: [provideIcons({ lucideGrid, lucideList, lucideLayoutGrid, lucideRows3, lucideBarChart, lucideTable, lucideKanban })],
  template: `
    <div class="st" [class.st--pill]="variant() === 'pill'">
      @for (option of options(); track option.value) {
        <button
          type="button"
          class="st__btn"
          [class.st__btn--active]="option.value === value()"
          [attr.aria-label]="option.label || option.value"
          [title]="option.label || option.value"
          (click)="valueChange.emit(option.value)"
        >
          @if (option.icon) {
            <ng-icon [name]="option.icon"></ng-icon>
          }
          @if (option.label && (variant() === 'pill' || !option.icon)) {
            <span>{{ option.label }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [`
    /* ── Compact (default) ── */
    .st {
      display: flex;
      align-items: center;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm);
      height: 32px;
      padding: 0 2px;
    }

    .st__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--color-text-muted);
      cursor: pointer;
      font-family: inherit;
      transition: color var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);

      ng-icon { font-size: 16px; }

      &:hover:not(.st__btn--active) {
        color: var(--color-text-soft);
      }

      &--active {
        background: var(--color-bg-hover);
        color: var(--color-text-main);
        box-shadow: var(--shadow-sm);
      }
    }

    /* ── Pill variant ── */
    .st--pill {
      background: transparent;
      border: none;
      height: auto;
      padding: 0;
      gap: 0.375rem;
      flex-wrap: wrap;

      .st__btn {
        width: auto;
        height: auto;
        padding: 5px 11px;
        border-radius: 99px;
        border: 1.5px solid var(--color-border-light);
        background: var(--color-bg-surface);
        font-size: var(--font-size-xs);
        font-weight: 600;
        gap: 6px;
        transition: all var(--transition-base);

        &:hover:not(.st__btn--active) {
          border-color: var(--color-accent-primary);
          color: var(--color-text-main);
          background: var(--color-bg-hover);
        }

        &--active {
          background: var(--color-bg-hover);
          border-color: var(--color-accent-primary);
          color: var(--color-text-main);
          font-weight: 700;
          box-shadow: none;
        }
      }
    }
  `]
})
export class SegmentedToggleComponent {
  options     = input<SegmentOption[]>([]);
  value       = input<string | null>('');
  variant     = input<'compact' | 'pill'>('compact');
  valueChange = output<string>();
}
