import {
  Component,
  Input,
  forwardRef,
  ChangeDetectionStrategy,
  signal,
  computed
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideClock } from '@ng-icons/lucide';

@Component({
  selector: 'app-duration-picker',
  standalone: true,
  imports: [FormsModule, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DurationPickerComponent),
      multi: true
    },
    provideIcons({ lucideClock })
  ],
  template: `
    <div class="dp" [class.dp--disabled]="isDisabled">
      <div class="dp__presets">
        @for (p of presets; track p) {
          <button
            type="button"
            class="dp__chip"
            [class.dp__chip--active]="value() === p"
            [disabled]="isDisabled"
            (click)="select(p)"
          >
            {{ label(p) }}
          </button>
        }
      </div>
      <div class="dp__custom">
        <ng-icon name="lucideClock" class="dp__icon"></ng-icon>
        <input
          type="number"
          class="dp__input"
          [ngModel]="customValue()"
          [disabled]="isDisabled"
          min="1"
          placeholder="Personalizado (min)"
          (ngModelChange)="onCustomInput($event)"
        >
      </div>
    </div>
  `,
  styles: [`
    .dp {
      display: flex;
      flex-direction: column;
      gap: 10px;

      &--disabled { opacity: 0.5; pointer-events: none; }

      &__presets {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      &__chip {
        padding: 5px 12px;
        border-radius: 999px;
        border: 1px solid var(--color-border-light);
        background: var(--color-bg-surface);
        color: var(--color-text-muted);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all var(--transition-fast);
        font-family: inherit;

        &:hover:not(:disabled) {
          border-color: var(--color-text-muted);
          color: var(--color-text-main);
        }

        &--active {
          background: var(--color-accent-primary);
          border-color: var(--color-accent-primary);
          color: var(--color-bg-surface);
        }
      }

      &__custom {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        padding: 0 12px;
        height: 40px;
        transition: border-color var(--transition-fast);

        &:focus-within {
          border-color: var(--color-accent-primary);
        }
      }

      &__icon {
        color: var(--color-text-muted);
        font-size: 14px;
        flex-shrink: 0;
      }

      &__input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: var(--font-size-base);
        color: var(--color-text-main);
        outline: none;
        font-family: inherit;

        &::placeholder { color: var(--color-text-muted); }

        &::-webkit-inner-spin-button,
        &::-webkit-outer-spin-button { -webkit-appearance: none; }
      }
    }
  `]
})
export class DurationPickerComponent implements ControlValueAccessor {
  readonly presets = [15, 30, 45, 60, 90, 120];

  value = signal<number | null>(null);

  customValue = computed(() => {
    const v = this.value();
    return v !== null && !this.presets.includes(v) ? v : null;
  });

  isDisabled = false;

  private onChange = (_: number | null) => {};
  private onTouched = () => {};

  label(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  select(preset: number) {
    const next = this.value() === preset ? null : preset;
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }

  onCustomInput(raw: number | string) {
    const parsed = raw !== '' && raw !== null ? Number(raw) : null;
    const next = parsed && parsed > 0 ? parsed : null;
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }

  writeValue(val: number | null): void {
    this.value.set(val ?? null);
  }

  registerOnChange(fn: (_: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
}
