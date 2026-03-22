import {
  Component,
  signal,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePackage,
  lucideWrench,
  lucideGift,
  lucideLeaf,
  lucideArrowRight,
  lucideArrowLeft
} from '@ng-icons/lucide';

export type ProductType = 'PHYSICAL' | 'SERVICE' | 'COMBO' | 'RAW_MATERIAL';

interface TypeCard {
  value: ProductType;
  label: string;
  description: string;
  detail: string;
  icon: string;
  colorClass: string;
}

@Component({
  selector: 'app-product-type-page',
  standalone: true,
  imports: [NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({ lucidePackage, lucideWrench, lucideGift, lucideLeaf, lucideArrowRight, lucideArrowLeft })
  ],
  template: `
    <div class="ptp">
      <div class="ptp__inner">

        <header class="ptp__header">
          <button class="ptp__back" (click)="goBack()">
            <ng-icon name="lucideArrowLeft"></ng-icon>
            Productos
          </button>
          <h1 class="ptp__title">¿Qué tipo de producto vas a crear?</h1>
          <p class="ptp__subtitle">
            El tipo define cómo se comporta el producto en inventario, ventas y recetas.
          </p>
        </header>

        <div class="ptp__grid">
          @for (card of cards; track card.value) {
            <button
              class="ptp__card"
              [class.ptp__card--selected]="selected() === card.value"
              [class]="'ptp__card ptp__card--' + card.colorClass + (selected() === card.value ? ' ptp__card--selected' : '')"
              (click)="select(card.value)"
            >
              <div class="ptp__card-icon" [class]="'ptp__card-icon--' + card.colorClass">
                <ng-icon [name]="card.icon"></ng-icon>
              </div>
              <div class="ptp__card-body">
                <strong class="ptp__card-label">{{ card.label }}</strong>
                <p class="ptp__card-desc">{{ card.description }}</p>
                <p class="ptp__card-detail">{{ card.detail }}</p>
              </div>
              <div class="ptp__card-arrow" [class.ptp__card-arrow--visible]="selected() === card.value">
                <ng-icon name="lucideArrowRight"></ng-icon>
              </div>
            </button>
          }
        </div>

        <div class="ptp__footer">
          <button
            class="ptp__cta"
            [disabled]="!selected()"
            (click)="proceed()"
          >
            Continuar
            <ng-icon name="lucideArrowRight"></ng-icon>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .ptp {
      min-height: 100%;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      background: var(--color-bg-canvas);
      padding: 48px 24px;

      &__inner {
        width: 100%;
        max-width: 720px;
        display: flex;
        flex-direction: column;
        gap: 32px;
      }

      &__header { display: flex; flex-direction: column; gap: 8px; }

      &__back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0;
        background: transparent;
        border: none;
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        font-family: inherit;
        transition: color var(--transition-fast);
        margin-bottom: 8px;
        width: fit-content;

        ng-icon { font-size: 14px; }
        &:hover { color: var(--color-text-main); }
      }

      &__title {
        font-size: 1.5rem;
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-main);
        margin: 0;
        line-height: 1.25;
      }

      &__subtitle {
        font-size: var(--font-size-base);
        color: var(--color-text-muted);
        margin: 0;
        line-height: 1.5;
      }

      &__grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;

        @media (max-width: 560px) { grid-template-columns: 1fr; }
      }

      &__card {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 20px;
        background: var(--color-bg-surface);
        border: 1.5px solid var(--color-border-light);
        border-radius: var(--radius-lg);
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
        position: relative;

        &:hover {
          border-color: var(--color-text-muted);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        &--selected {
          border-color: var(--color-accent-primary) !important;
          box-shadow: 0 0 0 1px var(--color-accent-primary), var(--shadow-md) !important;
          transform: translateY(-1px);
        }
      }

      &__card-icon {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;

        &--blue   { background: rgba(79, 70, 229, 0.1);  color: #4F46E5; }
        &--purple { background: rgba(168, 85, 247, 0.1); color: #A855F7; }
        &--orange { background: rgba(249, 115, 22, 0.1); color: #F97316; }
        &--green  { background: rgba(34, 197, 94, 0.1);  color: #22C55E; }

        [data-theme='dark'] &--blue   { background: rgba(99, 102, 241, 0.15);  color: #818CF8; }
        [data-theme='dark'] &--purple { background: rgba(192, 132, 252, 0.15); color: #C084FC; }
        [data-theme='dark'] &--orange { background: rgba(251, 146, 60, 0.15);  color: #FB923C; }
        [data-theme='dark'] &--green  { background: rgba(74, 222, 128, 0.15);  color: #4ADE80; }
      }

      &__card-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      &__card-label {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-main);
      }

      &__card-desc {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        margin: 0;
        line-height: 1.4;
      }

      &__card-detail {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        margin: 4px 0 0;
        line-height: 1.4;
        opacity: 0.8;
      }

      &__card-arrow {
        color: var(--color-text-muted);
        font-size: 16px;
        flex-shrink: 0;
        opacity: 0;
        transform: translateX(-4px);
        transition: opacity var(--transition-fast), transform var(--transition-fast);
        align-self: center;

        &--visible {
          opacity: 1;
          transform: translateX(0);
          color: var(--color-accent-primary);
        }
      }

      &__footer {
        display: flex;
        justify-content: flex-end;
        padding-top: 8px;
        border-top: 1px solid var(--color-border-subtle);
      }

      &__cta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 24px;
        background: var(--color-accent-primary);
        color: var(--color-bg-surface);
        border: none;
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        cursor: pointer;
        font-family: inherit;
        transition: var(--transition-base);

        ng-icon { font-size: 15px; }

        &:hover:not(:disabled) {
          opacity: 0.88;
          transform: translateY(-1px);
        }

        &:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          transform: none;
        }
      }
    }
  `]
})
export class ProductTypePageComponent {
  private router = inject(Router);

  selected = signal<ProductType | null>(null);

  readonly cards: TypeCard[] = [
    {
      value: 'PHYSICAL',
      label: 'Físico',
      description: 'Producto con inventario, stock y presentaciones.',
      detail: 'Ideal para: ropa, alimentos, electrónicos, bebidas.',
      icon: 'lucidePackage',
      colorClass: 'blue'
    },
    {
      value: 'SERVICE',
      label: 'Servicio',
      description: 'Sin inventario. Se cobra por tiempo o acto.',
      detail: 'Ideal para: cortes de cabello, consultas, instalaciones.',
      icon: 'lucideWrench',
      colorClass: 'purple'
    },
    {
      value: 'COMBO',
      label: 'Combo',
      description: 'Bundle de productos o servicios existentes.',
      detail: 'Ideal para: combos de menú, kits, paquetes promocionales.',
      icon: 'lucideGift',
      colorClass: 'orange'
    },
    {
      value: 'RAW_MATERIAL',
      label: 'Materia Prima',
      description: 'Ingrediente interno usado en recetas de producción.',
      detail: 'Ideal para: harina, aceite, tela, materiales de fabricación.',
      icon: 'lucideLeaf',
      colorClass: 'green'
    }
  ];

  select(type: ProductType) {
    this.selected.set(type);
  }

  proceed() {
    const type = this.selected();
    if (!type) return;
    this.router.navigate(['/inventario/productos/crear'], { queryParams: { tipo: type } });
  }

  goBack() {
    this.router.navigate(['/inventario/productos']);
  }
}
