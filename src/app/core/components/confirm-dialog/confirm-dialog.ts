import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideAlertTriangle, lucideX } from '@ng-icons/lucide';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIconComponent],
  providers: [provideIcons({ lucideAlertTriangle, lucideX })],
  template: `
    @if (confirm.isOpen()) {
      <div class="confirm-backdrop"
        [class.confirm-backdrop--closing]="confirm.isClosing()"
        (click)="confirm.cancel()">
        <div class="confirm-dialog"
          [class.confirm-dialog--closing]="confirm.isClosing()"
          (click)="$event.stopPropagation()">

          <div class="confirm-dialog__body">
            <div class="confirm-dialog__icon"
              [class.confirm-dialog__icon--danger]="confirm.options()?.variant === 'danger'"
              [class.confirm-dialog__icon--warning]="confirm.options()?.variant === 'warning'">
              <ng-icon name="lucideAlertTriangle" size="20"></ng-icon>
            </div>
            <div class="confirm-dialog__text">
              <h3 class="confirm-dialog__title">{{ confirm.options()?.title }}</h3>
              <p class="confirm-dialog__message">{{ confirm.options()?.message }}</p>
            </div>
          </div>

          <div class="confirm-dialog__actions">
            <button class="confirm-btn confirm-btn--cancel" (click)="confirm.cancel()">
              {{ confirm.options()?.cancelLabel || 'Cancelar' }}
            </button>
            <button class="confirm-btn"
              [class.confirm-btn--danger]="confirm.options()?.variant === 'danger'"
              [class.confirm-btn--warning]="confirm.options()?.variant === 'warning'"
              [class.confirm-btn--primary]="!confirm.options()?.variant || confirm.options()?.variant === 'default'"
              (click)="confirm.accept()">
              {{ confirm.options()?.confirmLabel || 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .confirm-backdrop {
      position: fixed; inset: 0; z-index: 1100;
      background: var(--glass-bg);
      backdrop-filter: blur(var(--glass-blur));
      -webkit-backdrop-filter: blur(var(--glass-blur));
      display: flex; align-items: center; justify-content: center;
      animation: confirmFadeIn 0.2s ease-out forwards;
      padding: 1rem;
    }
    .confirm-backdrop--closing {
      animation: confirmFadeOut 0.2s ease-in forwards;
    }

    .confirm-dialog {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg), 0 0 0 1px var(--color-border-light);
      width: 420px; max-width: 100%;
      animation: confirmSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      overflow: hidden;
    }
    .confirm-dialog--closing {
      animation: confirmSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .confirm-dialog__body {
      display: flex; gap: 1rem; padding: 1.25rem 1.5rem;
    }

    .confirm-dialog__icon {
      display: flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
      background: var(--color-bg-subtle); color: var(--color-text-muted);
    }
    .confirm-dialog__icon--danger {
      background: var(--color-danger-bg); color: var(--color-danger-text);
    }
    .confirm-dialog__icon--warning {
      background: var(--color-warning-bg); color: var(--color-warning-text);
    }

    .confirm-dialog__text { flex: 1; min-width: 0; }
    .confirm-dialog__title {
      margin: 0 0 0.25rem; font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold); color: var(--color-text-main);
    }
    .confirm-dialog__message {
      margin: 0; font-size: var(--font-size-sm);
      color: var(--color-text-soft); line-height: var(--line-height-normal);
    }

    .confirm-dialog__actions {
      display: flex; justify-content: flex-end; gap: 0.5rem;
      padding: 0.875rem 1.5rem;
      border-top: 1px solid var(--color-border-subtle);
      background: var(--color-bg-subtle);
    }

    .confirm-btn {
      border: none; padding: 0.5rem 1rem; border-radius: var(--radius-md);
      font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);
      cursor: pointer; font-family: inherit;
      transition: background var(--transition-fast), color var(--transition-fast);
    }
    .confirm-btn--cancel {
      background: transparent; color: var(--color-text-soft);
      border: 1px solid var(--color-border-light);
    }
    .confirm-btn--cancel:hover {
      background: var(--color-bg-hover); color: var(--color-text-main);
    }
    .confirm-btn--primary {
      background: var(--color-accent-primary); color: var(--color-accent-primary-text);
    }
    .confirm-btn--primary:hover { background: var(--color-accent-hover); }
    .confirm-btn--danger {
      background: var(--color-danger-text); color: #fff;
    }
    .confirm-btn--danger:hover { opacity: 0.9; }
    .confirm-btn--warning {
      background: var(--color-warning-text); color: #fff;
    }
    .confirm-btn--warning:hover { opacity: 0.9; }

    @keyframes confirmFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes confirmFadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes confirmSlideUp {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes confirmSlideDown {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(8px) scale(0.98); }
    }
  `]
})
export class ConfirmDialogComponent {
  confirm = inject(ConfirmService);
}
