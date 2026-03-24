import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { SpinnerComponent } from '../spinner/spinner';
import { lucideSave, lucideCheck, lucideX, lucidePencil, lucideHistory, lucideTrash2, lucidePlus, lucideArrowRight, lucideDownload } from '@ng-icons/lucide';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

@Component({
  selector: 'app-form-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIconComponent, SpinnerComponent],
  providers: [
    provideIcons({ lucideSave, lucideCheck, lucideX, lucidePencil, lucideHistory, lucideTrash2, lucidePlus, lucideArrowRight, lucideDownload })
  ],
  template: `
    <button
      [type]="type()"
      [class]="btnClass()"
      [disabled]="disabled() || loading()"
    >
      <span class="btn__content" [class.btn__content--loading]="loading()">
        @if (loading()) {
          <app-spinner [size]="16"></app-spinner>
        } @else if (icon() && iconPosition() === 'left') {
          <ng-icon [name]="icon()!"></ng-icon>
        }
        <span>{{ loading() ? loadingLabel() : label() }}</span>
        @if (!loading() && icon() && iconPosition() === 'right') {
          <ng-icon [name]="icon()!"></ng-icon>
        }
      </span>
    </button>
  `,
  styles: [`
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
      border: 1px solid transparent;
      line-height: 1;
      white-space: nowrap;
      user-select: none;
      height: 36px;
      font-family: inherit;

      &--full { width: 100%; }

      &:focus-visible {
        outline: none;
        box-shadow: var(--shadow-input-focus);
      }

      &:disabled {
        cursor: not-allowed;
      }
    }

    .btn__content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: opacity var(--transition-fast);

      &--loading { opacity: 0.8; }
    }

    /* ── Primary ─────────────────────────── */
    .btn-primary {
      background: var(--color-accent-primary);
      color: var(--color-accent-primary-text);
      border-color: var(--color-accent-primary);

      &:hover:not(:disabled) {
        background: var(--color-accent-hover);
        border-color: var(--color-accent-hover);
      }

      &:active:not(:disabled) {
        opacity: 0.9;
      }

      &:disabled {
        background: var(--color-text-muted);
        border-color: var(--color-text-muted);
        color: var(--color-bg-surface);
      }
    }

    /* ── Secondary ───────────────────────── */
    .btn-secondary {
      background: var(--color-bg-surface);
      color: var(--color-text-main);
      border-color: var(--color-border-light);

      &:hover:not(:disabled) {
        background: var(--color-bg-hover);
        border-color: var(--color-border-hover);
      }

      &:active:not(:disabled) {
        background: var(--color-bg-subtle);
      }

      &:disabled {
        background: var(--color-bg-surface);
        color: var(--color-placeholder);
        border-color: var(--color-border-light);
      }
    }

    /* ── Ghost ───────────────────────────── */
    .btn-ghost {
      background: transparent;
      color: var(--color-text-muted);

      &:hover:not(:disabled) {
        background: var(--color-bg-hover);
        color: var(--color-text-soft);
      }

      &:active:not(:disabled) {
        background: var(--color-bg-subtle);
      }

      &:disabled {
        color: var(--color-placeholder);
      }
    }

    /* ── Danger ──────────────────────────── */
    .btn-danger {
      background: var(--color-danger-bg);
      color: var(--color-danger-text);
      border-color: transparent;

      &:hover:not(:disabled) {
        background: var(--color-danger-text);
        color: var(--color-accent-primary-text);
        border-color: var(--color-danger-text);
      }

      &:active:not(:disabled) {
        opacity: 0.9;
      }

      &:disabled {
        background: var(--color-bg-subtle);
        color: var(--color-placeholder);
      }
    }

    ng-icon {
      font-size: 1rem;
      display: inline-flex;
      align-items: center;
    }
  `]
})
export class FormButtonComponent {
  label = input('Guardar');
  loadingLabel = input('Guardando...');
  icon = input<string>();
  iconPosition = input<'left' | 'right'>('left');
  loading = input(false);
  disabled = input(false);
  type = input<'submit' | 'button'>('submit');
  variant = input<Variant>('primary');
  fullWidth = input(true);

  btnClass = computed(() => {
    const classes = ['btn', `btn-${this.variant()}`];
    if (this.fullWidth()) classes.push('btn--full');
    return classes.join(' ');
  });
}
