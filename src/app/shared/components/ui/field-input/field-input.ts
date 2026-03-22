import {
  Component, ChangeDetectionStrategy, inject, signal, input, computed,
  OnInit, DestroyRef
} from '@angular/core';
import { ControlValueAccessor, NgControl, TouchedChangeEvent } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle, lucideHash, lucideSearch, lucideUser, lucideMail, lucidePhone, lucideLock } from '@ng-icons/lucide';
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
  providers: [provideIcons({ lucideAlertCircle, lucideHash, lucideSearch, lucideUser, lucideMail, lucidePhone, lucideLock })],
  template: `
    <div class="fi" [class.fi--error]="showError()" [class.fi--disabled]="disabled">

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
            [value]="_value()"
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

    .fi__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-main);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
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
      border-radius: var(--radius-md);
      overflow: hidden;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

      &:focus-within {
        border-color: var(--color-accent-primary);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
      }

      .fi--error & {
        border-color: var(--color-danger-text);
        &:focus-within { box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08); }
      }

      .fi--disabled & {
        background: var(--color-bg-canvas);
        opacity: 0.6;
      }
    }

    /* Icono tipo hash / lupa */
    .fi__icon-wrap {
      display: flex;
      align-items: center;
      padding: 0 10px;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .fi__icon { font-size: 14px; }

    /* Prefijo texto tipo "$" */
    .fi__prefix {
      display: flex;
      align-items: center;
      padding: 0 10px;
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
      padding: 0.625rem 0.875rem;
      border: none;
      background: transparent;
      font-size: var(--font-size-base);
      color: var(--color-text-main);
      font-family: inherit;
      outline: none;

      .fi__wrap--prefix & { padding-left: 8px; }

      &::placeholder { color: var(--color-text-muted); }

      &:disabled { cursor: not-allowed; }

      /* Ocultar spinners en number */
      &[type="number"] {
        &::-webkit-inner-spin-button,
        &::-webkit-outer-spin-button { -webkit-appearance: none; }
        -moz-appearance: textfield;
      }

      /* Textarea */
      &--textarea {
        padding: 0.625rem 0.875rem;
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

      ng-icon { font-size: 12px; flex-shrink: 0; }
    }

    .fi__hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
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
    return ERROR_MAP[firstKey]?.(errors[firstKey]) ?? 'Valor inválido';
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
