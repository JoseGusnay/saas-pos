import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'app-form-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIconComponent],
  template: `
    <div class="fc">
      <div class="fc__head">
        @if (icon()) {
          <ng-icon [name]="icon()!" size="14"></ng-icon>
        }
        <span>{{ title() }}</span>
      </div>
      <div class="fc__body">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .fc {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);

      @media (max-width: 600px) {
        background: transparent;
        border: none;
        border-radius: 0;
      }
    }

    .fc + .fc {
      @media (max-width: 600px) {
        margin-top: 8px;
      }
    }

    .fc__head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--color-border-light);
      background: var(--color-bg-subtle);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      text-transform: uppercase;

      @media (max-width: 600px) {
        padding: 0 0 10px 0;
        background: transparent;
        border-radius: 0;
      }
    }

    .fc__body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;

      @media (max-width: 600px) {
        padding: 0.75rem 0 0;
      }
    }
  `]
})
export class FormCardComponent {
  title = input.required<string>();
  icon  = input<string>();
}
