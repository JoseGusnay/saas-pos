import {
  Component, ChangeDetectionStrategy, inject, signal, input, computed,
  OnInit, DestroyRef
} from '@angular/core';
import { ControlValueAccessor, NgControl, TouchedChangeEvent } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle, lucideHash, lucideSearch, lucideUser, lucideMail, lucidePhone, lucideLock, lucideGlobe } from '@ng-icons/lucide';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs';

type InputType = 'text' | 'number' | 'email' | 'tel' | 'password';

const ERROR_MAP: Record<string, (e: any) => string> = {
  required:  ()  => 'Este campo es requerido',
  min:       (e) => `El valor mínimo es ${e.min}`,
  max:       (e) => `El valor máximo es ${e.max}`,
  minlength: (e) => `Mínimo ${e.requiredLength} caracteres`,
  maxlength: (e) => `Máximo ${e.requiredLength} caracteres`,
  pattern:   ()  => 'Formato inválido',
  email:     ()  => 'Correo electrónico inválido',
};

let uid = 0;

@Component({
  selector: 'app-field-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIconComponent],
  providers: [provideIcons({ lucideAlertCircle, lucideHash, lucideSearch, lucideUser, lucideMail, lucidePhone, lucideLock, lucideGlobe })],
  template: `
    <div class="fi" [class.fi--error]="showError()" [class.fi--disabled]="disabled" [class.fi--readonly]="readonly()" [class.fi--sm]="size() === 'sm'">

      @if (label()) {
        <label class="fi__label" [for]="inputId">
          {{ label() }}
          @if (required()) { <span class="fi__req">*</span> }
          @if (optional()) { <span class="fi__optional">Opcional</span> }
        </label>
      }

      <div class="fi__wrap" [class.fi__wrap--prefix]="prefix() || prefixIcon()">

        @if (prefixIcon()) {
          <span class="fi__icon-wrap">
            <ng-icon [name]="prefixIcon()" class="fi__icon"></ng-icon>
          </span>
        } @else if (prefix()) {
          <span class="fi__prefix">{{ prefix() }}</span>
        }

        @if (multiline()) {
          <textarea
            [id]="inputId"
            [placeholder]="placeholder()"
            [disabled]="disabled"
            [rows]="rows()"
            [value]="_value()"
            [attr.maxlength]="maxlength() ?? null"
            class="fi__input fi__input--textarea"
            (input)="onInput($event)"
            (blur)="onBlur()"
          ></textarea>
        } @else {
          <input
            [id]="inputId"
            [type]="type()"
            [placeholder]="placeholder()"
            [disabled]="disabled"
            [readOnly]="readonly()"
            [value]="_value()"
            [attr.maxlength]="maxlength() ?? null"
            [attr.step]="step() ?? null"
            [attr.min]="min() ?? null"
            [attr.max]="max() ?? null"
            class="fi__input"
            (input)="onInput($event)"
            (blur)="onBlur()"
          >
        }
      </div>

      @if (showError()) {
        <small class="fi__error">
          <ng-icon name="lucideAlertCircle"></ng-icon>
          {{ errorMessage() }}
        </small>
      } @else if (hint()) {
        <small class="fi__hint">{{ hint() }}</small>
      }

    </div>
  `,
  styles: [`
    .fi {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .fi--sm .fi__wrap {
      height: 32px;
    }

    .fi--sm .fi__icon-wrap {
      padding: 0 0 0 10px;
    }

    .fi--sm .fi__input {
      padding: 0 10px;
      font-size: var(--font-size-sm);
    }

    .fi--sm .fi__wrap--prefix .fi__input {
      padding-left: 8px;
    }

    .fi__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;

      .fi--disabled & { color: var(--color-text-soft); }
    }

    .fi__req      { color: var(--color-danger-text); font-size: inherit; }
    .fi__optional {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      font-weight: var(--font-weight-regular);
    }

    .fi__wrap {
      display: flex;
      align-items: stretch;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm);
      overflow: hidden;
      transition: border-color var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);

      &:hover:not(:focus-within) {
        border-color: var(--color-border-hover);
      }

      &:focus-within {
        border-color: var(--color-border-focus);
        background: var(--color-bg-input-focus);
        box-shadow: var(--shadow-input-focus);
      }

      .fi--error & {
        border-color: var(--color-danger-text);
        &:hover:not(:focus-within) { border-color: var(--color-danger-text); }
      }

      .fi--readonly & {
        background: var(--color-bg-hover);
        &:hover:not(:focus-within) { border-color: var(--color-border-light); }
        &:focus-within { box-shadow: none; background: var(--color-bg-hover); border-color: var(--color-border-light); }
      }

      .fi--disabled & {
        background: var(--color-bg-subtle);
        border-color: var(--color-border-subtle);
        pointer-events: none;
      }
    }

    /* Icono tipo hash / lupa */
    .fi__icon-wrap {
      display: flex;
      align-items: center;
      padding: 0 12px;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .fi__icon { font-size: 14px; }

    /* Prefijo texto tipo "$" */
    .fi__prefix {
      display: flex;
      align-items: center;
      padding: 0 12px;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-muted);
      background: var(--color-bg-canvas);
      border-right: 1px solid var(--color-border-light);
      user-select: none;
      flex-shrink: 0;
      white-space: nowrap;
    }

    /* Input base */
    .fi__input {
      flex: 1;
      min-width: 0;
      padding: 0.5rem 0.75rem;
      border: none;
      background: transparent;
      font-size: var(--font-size-base);
      color: var(--color-text-main);
      font-family: inherit;
      outline: none;

      .fi__wrap--prefix & { padding-left: 8px; }

      &::placeholder { color: var(--color-placeholder); }

      &:disabled {
        cursor: not-allowed;
        color: var(--color-text-muted);
      }

      /* Ocultar spinners en number */
      &[type="number"] {
        &::-webkit-inner-spin-button,
        &::-webkit-outer-spin-button { -webkit-appearance: none; }
        -moz-appearance: textfield;
      }

      /* Textarea */
      &--textarea {
        padding: 0.5rem 0.75rem;
        resize: vertical;
        line-height: 1.5;
      }
    }

    /* Mensajes */
    .fi__error {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: var(--font-size-xs);
      color: var(--color-danger-text);
      animation: fi-slide-in var(--transition-fast);

      ng-icon { font-size: 12px; flex-shrink: 0; }
    }

    .fi__hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }

    @keyframes fi-slide-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class FieldInputComponent implements ControlValueAccessor, OnInit {
  private ngCtrl    = inject(NgControl, { optional: true, self: true });
  private destroyRef = inject(DestroyRef);

  readonly inputId = `fi-${uid++}`;

  // ── Inputs ────────────────────────────────────────────────────────────────
  label         = input('');
  placeholder   = input('');
  type          = input<InputType>('text');
  hint          = input('');
  prefix        = input('');
  prefixIcon    = input('');
  required      = input(false);
  optional      = input(false);
  multiline     = input(false);
  rows          = input(3);
  readonly      = input(false);
  size          = input<'default' | 'sm'>('default');
  maxlength     = input<number | null>(null);
  step          = input<number | null>(null);
  min           = input<number | null>(null);
  max           = input<number | null>(null);
  /** Sobrescribir mensajes por clave: { required: 'Nombre requerido' } */
  errorMessages = input<Record<string, string>>({});

  // ── CVA state ─────────────────────────────────────────────────────────────
  _value   = signal<string>('');
  disabled = false;

  private _onChange  = (_: any) => {};
  private _onTouched = () => {};

  // ── Error state (OnPush friendly) ─────────────────────────────────────────
  private _status  = signal<string>('VALID');
  private _touched = signal(false);
  showError = computed(() => {
    return this._status() !== 'VALID' && this._touched();
  });

  errorMessage = computed(() => {
    this._status(); // rastrear cambios
    const errors = this.ngCtrl?.control?.errors;
    if (!errors) return '';
    const overrides  = this.errorMessages();
    const firstKey   = Object.keys(errors)[0];
    if (overrides[firstKey]) return overrides[firstKey];
    if (ERROR_MAP[firstKey]) return ERROR_MAP[firstKey](errors[firstKey]);
    if (typeof errors[firstKey] === 'string') return errors[firstKey];
    return 'Valor inválido';
  });

  constructor() {
    // Registrar como valueAccessor sin usar el providers array
    // para poder inyectar NgControl.control y leer errores
    if (this.ngCtrl) this.ngCtrl.valueAccessor = this;
  }

  ngOnInit() {
    const ctrl = this.ngCtrl?.control;
    if (ctrl) {
      ctrl.statusChanges.pipe(
        startWith(ctrl.status),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(s => this._status.set(s));

      // Reaccionar a markAllAsTouched() / markAsTouched() que no emiten statusChanges
      ctrl.events.pipe(
        filter(e => e instanceof TouchedChangeEvent),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(e => this._touched.set((e as TouchedChangeEvent).touched));
    }
  }

  // ── CVA ───────────────────────────────────────────────────────────────────
  writeValue(val: any) {
    this._value.set(val == null ? '' : String(val));
  }

  registerOnChange(fn: any)    { this._onChange = fn; }
  registerOnTouched(fn: any)   { this._onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }

  // ── Eventos ───────────────────────────────────────────────────────────────
  onInput(event: Event) {
    const raw = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this._value.set(raw);
    const emitVal = this.type() === 'number'
      ? (raw === '' ? null : +raw)
      : raw;
    this._onChange(emitVal);
  }

  onBlur() { this._onTouched(); }
}
