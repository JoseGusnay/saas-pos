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
      gap: 6px;
      padding: 0 14px;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), opacity var(--transition-fast);
      border: 1px solid transparent;
      line-height: 1;
      white-space: nowrap;
      user-select: none;
      height: 34px;
      font-family: inherit;

      &--full { width: 100%; }

      &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-bg-surface), 0 0 0 4px var(--color-accent-interactive);
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }
    }

    .btn__content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    /* ── Primary ─────────────────────────── */
    .btn-primary {
      background: var(--color-accent-primary);
      color: var(--color-accent-primary-text);

      &:hover:not(:disabled) {
        background: var(--color-accent-hover);
      }

      &:active:not(:disabled) {
        opacity: 0.85;
      }
    }

    /* ── Secondary ───────────────────────── */
    .btn-secondary {
      background: var(--color-bg-surface);
      color: var(--color-text-soft);
      border-color: var(--color-border-light);

      &:hover:not(:disabled) {
        background: var(--color-bg-hover);
        color: var(--color-text-main);
        border-color: var(--color-border-hover);
      }

      &:active:not(:disabled) {
        background: var(--color-bg-active);
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
        background: var(--color-bg-active);
      }
    }

    /* ── Danger ──────────────────────────── */
    .btn-danger {
      background: var(--color-danger-bg);
      color: var(--color-danger-text);

      &:hover:not(:disabled) {
        background: var(--color-danger-text);
        color: var(--text-inverse);
      }

      &:active:not(:disabled) {
        opacity: 0.85;
      }
    }

    ng-icon {
      font-size: 14px;
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
