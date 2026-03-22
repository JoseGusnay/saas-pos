import {
  Component,
  forwardRef,
  ChangeDetectionStrategy,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePackage,
  lucideWrench,
  lucideGift,
  lucideLeaf,
  lucideCheck
} from '@ng-icons/lucide';

export type ProductType = 'PHYSICAL' | 'SERVICE' | 'COMBO' | 'RAW_MATERIAL';

interface TypeOption {
  value: ProductType;
  label: string;
  description: string;
  icon: string;
  colorClass: string;
}

@Component({
  selector: 'app-product-type-selector',
  standalone: true,
  imports: [NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ProductTypeSelectorComponent),
      multi: true
    },
    provideIcons({ lucidePackage, lucideWrench, lucideGift, lucideLeaf, lucideCheck })
  ],
  template: `
    <div class="pts" [class.pts--disabled]="isDisabled">
      @for (opt of types; track opt.value) {
        <button
          type="button"
          class="pts__card"
          [class.pts__card--selected]="value() === opt.value"
          [class]="'pts__card pts__card--' + opt.colorClass + (value() === opt.value ? ' pts__card--selected' : '')"
          [disabled]="isDisabled"
          (click)="select(opt.value)"
        >
          <div class="pts__icon-wrap" [class]="'pts__icon-wrap--' + opt.colorClass">
            <ng-icon [name]="opt.icon"></ng-icon>
          </div>
          <div class="pts__text">
            <strong class="pts__label">{{ opt.label }}</strong>
            <span class="pts__desc">{{ opt.description }}</span>
          </div>
          <div class="pts__check" [class.pts__check--visible]="value() === opt.value">
            <ng-icon name="lucideCheck"></ng-icon>
          </div>
        </button>
      }
    </div>
  `,
  styles: [`
    .pts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;

      &--disabled { opacity: 0.5; pointer-events: none; }

      &__card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border-radius: var(--radius-lg);
        border: 1.5px solid var(--color-border-light);
        background: var(--color-bg-surface);
        cursor: pointer;
        text-align: left;
        transition: border-color var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);
        font-family: inherit;
        width: 100%;
        position: relative;

        &:hover:not(:disabled) {
          border-color: var(--color-text-muted);
          background: var(--color-bg-hover);
        }

        &--selected {
          border-color: var(--color-accent-primary) !important;
          background: var(--color-bg-surface) !important;
          box-shadow: 0 0 0 1px var(--color-accent-primary);
        }
      }

      &__icon-wrap {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;

        &--blue   { background: rgba(79, 70, 229, 0.1);  color: #4F46E5; }
        &--purple { background: rgba(168, 85, 247, 0.1); color: #A855F7; }
        &--orange { background: rgba(249, 115, 22, 0.1); color: #F97316; }
        &--green  { background: rgba(34, 197, 94, 0.1);  color: #22C55E; }

        [data-theme='dark'] &--blue   { background: rgba(99, 102, 241, 0.15); color: #818CF8; }
        [data-theme='dark'] &--purple { background: rgba(192, 132, 252, 0.15); color: #C084FC; }
        [data-theme='dark'] &--orange { background: rgba(251, 146, 60, 0.15);  color: #FB923C; }
        [data-theme='dark'] &--green  { background: rgba(74, 222, 128, 0.15);  color: #4ADE80; }
      }

      &__text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      &__label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-main);
      }

      &__desc {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        line-height: 1.4;
      }

      &__check {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--color-accent-primary);
        color: var(--color-bg-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        flex-shrink: 0;
        opacity: 0;
        transform: scale(0.6);
        transition: opacity var(--transition-fast), transform var(--transition-fast);

        &--visible {
          opacity: 1;
          transform: scale(1);
        }
      }
    }
  `]
})
export class ProductTypeSelectorComponent implements ControlValueAccessor {
  readonly types: TypeOption[] = [
    {
      value: 'PHYSICAL',
      label: 'Físico',
      description: 'Con stock, variantes y presentaciones',
      icon: 'lucidePackage',
      colorClass: 'blue'
    },
    {
      value: 'SERVICE',
      label: 'Servicio',
      description: 'Sin inventario, con duración',
      icon: 'lucideWrench',
      colorClass: 'purple'
    },
    {
      value: 'COMBO',
      label: 'Combo',
      description: 'Bundle de productos existentes',
      icon: 'lucideGift',
      colorClass: 'orange'
    },
    {
      value: 'RAW_MATERIAL',
      label: 'Materia Prima',
      description: 'Ingrediente de recetas internas',
      icon: 'lucideLeaf',
      colorClass: 'green'
    }
  ];

  value = signal<ProductType>('PHYSICAL');
  isDisabled = false;

  private onChange = (_: ProductType) => {};
  private onTouched = () => {};

  select(type: ProductType) {
    if (this.isDisabled || this.value() === type) return;
    this.value.set(type);
    this.onChange(type);
    this.onTouched();
  }

  writeValue(val: ProductType): void {
    this.value.set(val ?? 'PHYSICAL');
  }

  registerOnChange(fn: (_: ProductType) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
}
