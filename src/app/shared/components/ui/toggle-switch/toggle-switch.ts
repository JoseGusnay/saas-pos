import {
  Component,
  Input,
  forwardRef,
  ChangeDetectionStrategy,
  signal,
  HostListener
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleSwitchComponent),
      multi: true
    }
  ],
  template: `
    <button
      type="button"
      role="switch"
      class="toggle"
      [class.toggle--on]="checked()"
      [class.toggle--sm]="size === 'sm'"
      [class.toggle--disabled]="isDisabled"
      [attr.aria-checked]="checked()"
      [disabled]="isDisabled"
      (click)="toggle()"
    >
      <span class="toggle__thumb"></span>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; }

    .toggle {
      position: relative;
      display: inline-flex;
      align-items: center;
      width: 44px;
      height: 24px;
      border-radius: 999px;
      border: 1.5px solid var(--color-border-hover);
      padding: 2px;
      background-color: var(--color-bg-subtle);
      cursor: pointer;
      transition: background-color var(--transition-base), border-color var(--transition-base);
      flex-shrink: 0;

      &--sm {
        width: 36px;
        height: 20px;
      }

      &--on {
        background-color: var(--color-accent-primary);
        border-color: var(--color-accent-primary);
      }

      &--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent-primary);
        outline-offset: 2px;
      }

      &__thumb {
        position: absolute;
        left: 2px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: var(--color-bg-surface);
        box-shadow: var(--shadow-sm);
        transition: transform var(--transition-base);

        .toggle--sm & {
          width: 16px;
          height: 16px;
        }

        .toggle--on & {
          transform: translateX(20px);
        }

        .toggle--on.toggle--sm & {
          transform: translateX(16px);
        }
      }
    }
  `]
})
export class ToggleSwitchComponent implements ControlValueAccessor {
  @Input() size: 'sm' | 'md' = 'md';

  checked = signal(false);
  isDisabled = false;

  private onChange = (_: boolean) => {};
  private onTouched = () => {};

  toggle() {
    if (this.isDisabled) return;
    const next = !this.checked();
    this.checked.set(next);
    this.onChange(next);
    this.onTouched();
  }

  writeValue(val: boolean): void {
    this.checked.set(!!val);
  }

  registerOnChange(fn: (_: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
}
