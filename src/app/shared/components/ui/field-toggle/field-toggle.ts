import {
  Component, ChangeDetectionStrategy, inject, signal, input, computed,
  OnInit, DestroyRef
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';

let uid = 0;

@Component({
  selector: 'app-field-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="ft" [class.ft--disabled]="disabled" [for]="inputId">
      <div class="ft__track" [class.ft--on]="checked()">
        <input
          [id]="inputId"
          type="checkbox"
          class="ft__input"
          [checked]="checked()"
          [disabled]="disabled"
          (change)="toggle()"
        >
        <span class="ft__thumb"></span>
      </div>
      @if (label()) {
        <span class="ft__label">{{ label() }}</span>
      }
      @if (description()) {
        <span class="ft__desc">{{ description() }}</span>
      }
    </label>
  `,
  styles: [`
    .ft {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;

      &--disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }
    }

    .ft__input {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }

    .ft__track {
      position: relative;
      display: inline-flex;
      align-items: center;
      width: 36px;
      height: 20px;
      border-radius: 999px;
      padding: 2px;
      background: var(--color-border-hover);
      flex-shrink: 0;
      transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1);

      &.ft--on {
        background: var(--color-accent-soft);
      }
    }

    .ft__thumb {
      display: block;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--color-bg-surface);
      box-shadow: var(--shadow-sm);
      transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);

      .ft--on & {
        transform: translateX(16px);
      }
    }

    .ft__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
      line-height: var(--line-height-tight);
    }

    .ft__desc {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      line-height: var(--line-height-normal);
      margin-left: auto;
    }
  `]
})
export class FieldToggleComponent implements ControlValueAccessor, OnInit {
  private ngCtrl = inject(NgControl, { optional: true, self: true });
  private destroyRef = inject(DestroyRef);

  readonly inputId = `ft-${uid++}`;

  label = input('');
  description = input('');

  checked = signal(false);
  disabled = false;

  private _onChange = (_: boolean) => {};
  private _onTouched = () => {};

  constructor() {
    if (this.ngCtrl) this.ngCtrl.valueAccessor = this;
  }

  ngOnInit() {
    const ctrl = this.ngCtrl?.control;
    if (ctrl) {
      ctrl.statusChanges.pipe(
        startWith(ctrl.status),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe();
    }
  }

  toggle() {
    if (this.disabled) return;
    const next = !this.checked();
    this.checked.set(next);
    this._onChange(next);
    this._onTouched();
  }

  writeValue(val: any) {
    this.checked.set(!!val);
  }

  registerOnChange(fn: any) { this._onChange = fn; }
  registerOnTouched(fn: any) { this._onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }
}
