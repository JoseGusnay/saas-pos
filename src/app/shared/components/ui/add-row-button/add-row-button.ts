import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';

@Component({
  selector: 'app-add-row-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIconComponent],
  providers: [provideIcons({ lucidePlus })],
  template: `
    <button
      type="button"
      class="arb"
      [disabled]="disabled()"
      (click)="clicked.emit()"
    >
      <ng-icon name="lucidePlus"></ng-icon>
      {{ label() }}
    </button>
  `,
  styles: [`
    .arb {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1.5px dashed var(--color-border-light);
      border-radius: var(--radius-sm);
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: border-color var(--transition-fast), color var(--transition-fast), background-color var(--transition-fast);

      ng-icon { font-size: 14px; }

      &:hover:not(:disabled) {
        border-color: var(--color-border-focus);
        color: var(--color-text-soft);
        background: var(--color-bg-hover);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  `]
})
export class AddRowButtonComponent {
  label = input('Agregar');
  disabled = input(false);
  clicked = output();
}
