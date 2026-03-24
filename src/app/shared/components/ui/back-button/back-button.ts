import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';

@Component({
  selector: 'app-back-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIconComponent],
  providers: [provideIcons({ lucideArrowLeft })],
  template: `
    <button type="button" class="back-btn" [disabled]="disabled()" (click)="clicked.emit()">
      <ng-icon name="lucideArrowLeft"></ng-icon>
      @if (label()) {
        <span class="back-btn__label">{{ label() }}</span>
      }
    </button>
  `,
  styles: [`
    .back-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-light);
      background: var(--color-bg-surface);
      color: var(--color-text-soft);
      cursor: pointer;
      transition: background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
      flex-shrink: 0;
      font-family: inherit;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      padding: 0;

      ng-icon {
        font-size: 15px;
        display: inline-flex;
        align-items: center;
      }

      &:hover:not(:disabled) {
        background: var(--color-bg-hover);
        color: var(--color-text-main);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    /* When label is present, expand to pill shape */
    :host([data-with-label]) .back-btn,
    .back-btn:has(.back-btn__label) {
      width: auto;
      padding: 0 10px;
    }

    .back-btn__label {
      white-space: nowrap;

      @media (max-width: 480px) {
        display: none;
      }
    }
  `]
})
export class BackButtonComponent {
  label = input('');
  disabled = input(false);
  clicked = output<void>();
}
