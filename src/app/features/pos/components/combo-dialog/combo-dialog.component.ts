import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronRight } from '@ng-icons/lucide';
import {
  ComboItem,
  ChoiceGroup,
  ChoiceOption,
} from '../../../inventory/models/product.model';

@Component({
  selector: 'app-combo-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, CurrencyPipe],
  providers: [provideIcons({ lucideCheck, lucideChevronRight })],
  styleUrls: ['./combo-dialog.component.scss'],
  template: `
    <div class="combo-dialog">
      <!-- Header -->
      <div class="combo-dialog__header">
        <h3 class="combo-dialog__title">{{ productName }}</h3>
        <span class="combo-dialog__subtitle">Selecciona los componentes del combo</span>
      </div>

      <!-- Items -->
      <div class="combo-dialog__body">
        @for (item of sortedItems(); track item.id) {
          <!-- Fixed item -->
          @if (item.type === 'fixed') {
            <div class="combo-dialog__fixed-item">
              <div class="combo-dialog__fixed-item-info">
                <ng-icon name="lucideChevronRight" size="16" />
                <span class="combo-dialog__fixed-item-name">
                  {{ item.variantName }}
                </span>
                <span class="combo-dialog__fixed-item-qty">x{{ item.quantity }}</span>
              </div>
              <span class="combo-dialog__badge combo-dialog__badge--included">Incluido</span>
            </div>
          }

          <!-- Choice group -->
          @if (item.type === 'choice' && item.choiceGroup) {
            <div class="combo-dialog__choice-group">
              <div class="combo-dialog__choice-header">
                <span class="combo-dialog__choice-title">{{ item.choiceGroup.name }}</span>
                @if (item.choiceGroup.required) {
                  <span class="combo-dialog__badge combo-dialog__badge--required">Requerido</span>
                }
              </div>

              <div class="combo-dialog__options">
                @for (option of activeOptions(item.choiceGroup); track option.id) {
                  <button
                    type="button"
                    class="combo-dialog__option"
                    [class.combo-dialog__option--selected]="selections().get(item.id) === option.variantId"
                    (click)="selectOption(item.id, option.variantId)"
                  >
                    <div class="combo-dialog__option-info">
                      <span class="combo-dialog__option-name">{{ option.name }}</span>
                      @if (comboPriceMode === 'CALCULATED' && option.priceAdjustment !== 0) {
                        <span
                          class="combo-dialog__option-adjustment"
                          [class.combo-dialog__option-adjustment--positive]="option.priceAdjustment > 0"
                        >
                          {{ option.priceAdjustment > 0 ? '+' : '' }}{{ option.priceAdjustment | currency }}
                        </span>
                      }
                    </div>
                    <div class="combo-dialog__option-check">
                      @if (selections().get(item.id) === option.variantId) {
                        <ng-icon name="lucideCheck" size="16" />
                      }
                    </div>
                  </button>
                }
              </div>
            </div>
          }
        }
      </div>

      <!-- Footer -->
      <div class="combo-dialog__footer">
        @if (comboPriceMode === 'CALCULATED') {
          <div class="combo-dialog__price-summary">
            <span class="combo-dialog__price-label">Total estimado</span>
            <span class="combo-dialog__price-value">{{ calculatedPrice() | currency }}</span>
          </div>
        } @else {
          <div class="combo-dialog__price-summary">
            <span class="combo-dialog__price-label">Precio</span>
            <span class="combo-dialog__price-value">{{ basePrice | currency }}</span>
          </div>
        }

        <div class="combo-dialog__actions">
          <button type="button" class="btn btn-secondary" (click)="cancel.emit()">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="!allRequiredSelected()"
            (click)="onConfirm()"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ComboDialogComponent implements OnInit {
  @Input() comboItems: ComboItem[] = [];
  @Input() productName = '';
  @Input() comboPriceMode: 'FIXED' | 'CALCULATED' | null = 'FIXED';
  @Input() basePrice = 0;

  @Output() confirm = new EventEmitter<{ comboItemId: string; variantId: string }[]>();
  @Output() cancel = new EventEmitter<void>();

  /** comboItemId -> selected variantId */
  readonly selections = signal(new Map<string, string>());

  readonly sortedItems = computed(() =>
    [...this.comboItems].sort((a, b) => a.sortOrder - b.sortOrder)
  );

  readonly allRequiredSelected = computed(() => {
    const sel = this.selections();
    return this.comboItems
      .filter((item) => item.type === 'choice' && item.choiceGroup?.required)
      .every((item) => sel.has(item.id));
  });

  readonly calculatedPrice = computed(() => {
    let total = this.basePrice;
    const sel = this.selections();

    for (const item of this.comboItems) {
      if (item.type === 'choice' && item.choiceGroup) {
        const selectedVariantId = sel.get(item.id);
        if (selectedVariantId) {
          const option = item.choiceGroup.options.find(
            (o) => o.variantId === selectedVariantId
          );
          if (option) {
            total += option.priceAdjustment;
          }
        }
      }
    }

    return total;
  });

  ngOnInit(): void {
    this.preselectDefaults();
  }

  activeOptions(group: ChoiceGroup): ChoiceOption[] {
    return group.options
      .filter((o) => o.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  selectOption(comboItemId: string, variantId: string): void {
    const current = new Map(this.selections());
    if (current.get(comboItemId) === variantId) {
      // Allow deselection only if not required
      const item = this.comboItems.find((i) => i.id === comboItemId);
      if (!item?.choiceGroup?.required) {
        current.delete(comboItemId);
      }
    } else {
      current.set(comboItemId, variantId);
    }
    this.selections.set(current);
  }

  onConfirm(): void {
    if (!this.allRequiredSelected()) return;

    const result: { comboItemId: string; variantId: string }[] = [];
    const sel = this.selections();

    for (const [comboItemId, variantId] of sel) {
      result.push({ comboItemId, variantId });
    }

    this.confirm.emit(result);
  }

  private preselectDefaults(): void {
    const defaults = new Map<string, string>();

    for (const item of this.comboItems) {
      if (item.type === 'choice' && item.choiceGroup) {
        const defaultOption = item.choiceGroup.options.find(
          (o) => o.isDefault && o.isActive
        );
        if (defaultOption) {
          defaults.set(item.id, defaultOption.variantId);
        }
      }
    }

    if (defaults.size > 0) {
      this.selections.set(defaults);
    }
  }
}
