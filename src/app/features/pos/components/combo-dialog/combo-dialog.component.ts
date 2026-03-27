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
  ModifierGroup,
  ModifierOption,
} from '../../../inventory/models/product.model';
import { SaleModifierSnapshot } from '../../../../core/models/sale.models';

export interface ComboDialogResult {
  chosenVariants: { comboItemId: string; variantId: string }[];
  selectedModifiers: SaleModifierSnapshot[];
}

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
            <div class="combo-dialog__item-block">
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

              <!-- Modifiers for fixed item -->
              @if (item.modifierGroups?.length) {
                <ng-container
                  *ngTemplateOutlet="modifiersTpl; context: { $implicit: item }"
                />
              }
            </div>
          }

          <!-- Choice group -->
          @if (item.type === 'choice' && item.choiceGroup) {
            <div class="combo-dialog__item-block">
              <div class="combo-dialog__choice-group">
                <div class="combo-dialog__choice-header">
                  <div class="combo-dialog__choice-header-left">
                    <span class="combo-dialog__choice-title">{{ item.choiceGroup.name }}</span>
                    @if (item.choiceGroup.required) {
                      <span class="combo-dialog__badge combo-dialog__badge--required">Requerido</span>
                    }
                  </div>
                  <span
                    class="combo-dialog__choice-count"
                    [class.combo-dialog__choice-count--full]="isChoiceAtLimit(item.id, item.choiceGroup)"
                  >
                    @if (isChoiceAtLimit(item.id, item.choiceGroup)) {
                      Listo
                    } @else {
                      {{ choiceSelectionLabel(item.choiceGroup) }}
                    }
                    <span class="combo-dialog__choice-selected">
                      ({{ choiceSelectedCount(item.id) }})
                    </span>
                  </span>
                </div>

                <div class="combo-dialog__options">
                  @for (option of activeOptions(item.choiceGroup); track option.id) {
                    <button
                      type="button"
                      class="combo-dialog__option"
                      [class.combo-dialog__option--selected]="isChoiceSelected(item.id, option.variantId)"
                      [class.combo-dialog__option--at-limit]="
                        isChoiceAtLimit(item.id, item.choiceGroup) && !isChoiceSelected(item.id, option.variantId)
                      "
                      (click)="toggleChoiceOption(item.id, item.choiceGroup, option)"
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
                        @if (isChoiceSelected(item.id, option.variantId)) {
                          <ng-icon name="lucideCheck" size="16" />
                        }
                      </div>
                    </button>
                  }
                </div>
              </div>

              <!-- Modifiers for choice item -->
              @if (item.modifierGroups?.length) {
                <ng-container
                  *ngTemplateOutlet="modifiersTpl; context: { $implicit: item }"
                />
              }
            </div>
          }
        }
      </div>

      <!-- Footer -->
      <div class="combo-dialog__footer">
        <div class="combo-dialog__price-summary">
          <span class="combo-dialog__price-label">
            {{ comboPriceMode === 'CALCULATED' ? 'Total estimado' : 'Precio' }}
          </span>
          <span class="combo-dialog__price-value">{{ totalPrice() | currency }}</span>
        </div>

        <div class="combo-dialog__actions">
          <button type="button" class="btn btn-secondary" (click)="cancel.emit()">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="!isFormValid()"
            (click)="onConfirm()"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>

    <!-- ── Modifier groups template (reused for fixed & choice items) ──── -->
    <ng-template #modifiersTpl let-item>
      <div class="combo-dialog__modifiers">
        @for (group of item.modifierGroups; track group.id) {
          <div
            class="combo-dialog__mod-group"
            [class.combo-dialog__mod-group--error]="hasModGroupError(item.id, group)"
          >
            <div class="combo-dialog__mod-group-header">
              <div class="combo-dialog__mod-group-info">
                <span class="combo-dialog__mod-group-name">{{ group.name }}</span>
                <span
                  class="combo-dialog__badge"
                  [class.combo-dialog__badge--required]="group.required"
                  [class.combo-dialog__badge--optional]="!group.required"
                >
                  {{ group.required ? 'Requerido' : 'Opcional' }}
                </span>
              </div>
              <span
                class="combo-dialog__mod-group-count"
                [class.combo-dialog__mod-group-count--full]="isModAtLimit(item.id, group)"
              >
                @if (isModAtLimit(item.id, group)) {
                  Listo
                } @else {
                  {{ modSelectionLabel(group) }}
                }
                <span class="combo-dialog__mod-group-selected">
                  ({{ modSelectedCount(item.id, group.id) }})
                </span>
              </span>
            </div>

            <div class="combo-dialog__mod-options">
              @for (opt of group.options; track opt.id) {
                <button
                  type="button"
                  class="combo-dialog__mod-option"
                  [class.combo-dialog__mod-option--selected]="isModSelected(item.id, group.id, opt.id)"
                  [class.combo-dialog__mod-option--at-limit]="
                    isModAtLimit(item.id, group) && !isModSelected(item.id, group.id, opt.id)
                  "
                  (click)="toggleModOption(item.id, group, opt)"
                >
                  <div class="combo-dialog__mod-option-left">
                    <span
                      class="combo-dialog__mod-check"
                      [class.combo-dialog__mod-check--active]="isModSelected(item.id, group.id, opt.id)"
                      [class.combo-dialog__mod-check--radio]="group.maxSelections === 1"
                    >
                      @if (isModSelected(item.id, group.id, opt.id)) {
                        <ng-icon name="lucideCheck" size="12" />
                      }
                    </span>
                    <span class="combo-dialog__mod-option-name">{{ opt.name }}</span>
                  </div>
                  <span class="combo-dialog__mod-option-price">
                    @if (opt.priceAdjustment > 0) {
                      +{{ opt.priceAdjustment | currency: 'USD':'symbol':'1.2-2' }}
                    } @else if (opt.priceAdjustment < 0) {
                      {{ opt.priceAdjustment | currency: 'USD':'symbol':'1.2-2' }}
                    } @else {
                      Incluido
                    }
                  </span>
                </button>
              }
            </div>
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class ComboDialogComponent implements OnInit {
  @Input() comboItems: ComboItem[] = [];
  @Input() productName = '';
  @Input() comboPriceMode: 'FIXED' | 'CALCULATED' | null = 'FIXED';
  @Input() basePrice = 0;
  @Input() preselectedChoices: { comboItemId: string; variantId: string }[] = [];
  @Input() preselectedModifiers: SaleModifierSnapshot[] = [];

  @Output() confirm = new EventEmitter<ComboDialogResult>();
  @Output() cancel = new EventEmitter<void>();

  /** comboItemId -> Set of selected variantIds (for choice groups) */
  readonly selections = signal(new Map<string, Set<string>>());

  /** comboItemId -> groupId -> Set<optionId> (for modifiers) */
  readonly modifierSelections = signal(new Map<string, Map<string, Set<string>>>());

  readonly sortedItems = computed(() =>
    [...this.comboItems].sort((a, b) => a.sortOrder - b.sortOrder)
  );

  /** All choice groups with required met + all required modifier groups met */
  readonly isFormValid = computed(() => {
    const sel = this.selections();
    const modSel = this.modifierSelections();

    // Check required choice groups meet minSelections
    for (const item of this.comboItems) {
      if (item.type !== 'choice' || !item.choiceGroup?.required) continue;
      const count = sel.get(item.id)?.size ?? 0;
      if (count < item.choiceGroup.minSelections) return false;
    }

    // Check required modifier groups across all combo items
    for (const item of this.comboItems) {
      if (!item.modifierGroups?.length) continue;
      for (const group of item.modifierGroups) {
        if (!group.required) continue;
        const count = modSel.get(item.id)?.get(group.id)?.size ?? 0;
        if (count < group.minSelections) return false;
      }
    }

    return true;
  });

  /** Total price including choice adjustments + modifier adjustments */
  readonly totalPrice = computed(() => {
    let total = this.basePrice;
    const sel = this.selections();
    const modSel = this.modifierSelections();

    // Choice group adjustments (only for CALCULATED mode)
    if (this.comboPriceMode === 'CALCULATED') {
      for (const item of this.comboItems) {
        if (item.type === 'choice' && item.choiceGroup) {
          const selectedVariantIds = sel.get(item.id);
          if (!selectedVariantIds?.size) continue;
          for (const opt of item.choiceGroup.options) {
            if (selectedVariantIds.has(opt.variantId)) {
              total += opt.priceAdjustment;
            }
          }
        }
      }
    }

    // Modifier adjustments (always apply)
    for (const item of this.comboItems) {
      if (!item.modifierGroups?.length) continue;
      const itemMods = modSel.get(item.id);
      if (!itemMods) continue;

      for (const group of item.modifierGroups) {
        const selectedIds = itemMods.get(group.id);
        if (!selectedIds) continue;
        for (const opt of group.options) {
          if (selectedIds.has(opt.id)) {
            total += opt.priceAdjustment;
          }
        }
      }
    }

    return Math.round(total * 100) / 100;
  });

  ngOnInit(): void {
    this.preselectDefaults();
  }

  // ── Choice group methods ─────────────────────────────────────────────────

  activeOptions(group: ChoiceGroup): ChoiceOption[] {
    return group.options
      .filter((o) => o.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  isChoiceSelected(comboItemId: string, variantId: string): boolean {
    return this.selections().get(comboItemId)?.has(variantId) ?? false;
  }

  choiceSelectedCount(comboItemId: string): number {
    return this.selections().get(comboItemId)?.size ?? 0;
  }

  isChoiceAtLimit(comboItemId: string, group: ChoiceGroup): boolean {
    return this.choiceSelectedCount(comboItemId) >= group.maxSelections;
  }

  choiceSelectionLabel(group: ChoiceGroup): string {
    const min = group.minSelections;
    const max = group.maxSelections;
    if (max === 1 && min === 1) return 'Elige 1';
    if (min === 0) return `Hasta ${max}`;
    if (min === max) return `Elige ${min}`;
    return `${min}-${max}`;
  }

  toggleChoiceOption(comboItemId: string, group: ChoiceGroup, option: ChoiceOption): void {
    const current = new Map(this.selections());
    const selected = new Set(current.get(comboItemId) ?? []);

    if (group.maxSelections === 1) {
      // Radio behavior
      if (selected.has(option.variantId)) {
        if (!group.required || group.minSelections === 0) {
          selected.delete(option.variantId);
        }
      } else {
        selected.clear();
        selected.add(option.variantId);
      }
    } else {
      // Checkbox behavior
      if (selected.has(option.variantId)) {
        selected.delete(option.variantId);
      } else {
        if (selected.size >= group.maxSelections) {
          // At limit: remove first selected (FIFO) then add new one
          const first = selected.values().next().value;
          if (first != null) selected.delete(first);
        }
        selected.add(option.variantId);
      }
    }

    current.set(comboItemId, selected);
    this.selections.set(current);
  }

  // ── Modifier methods ─────────────────────────────────────────────────────

  isModSelected(comboItemId: string, groupId: string, optionId: string): boolean {
    return this.modifierSelections().get(comboItemId)?.get(groupId)?.has(optionId) ?? false;
  }

  modSelectedCount(comboItemId: string, groupId: string): number {
    return this.modifierSelections().get(comboItemId)?.get(groupId)?.size ?? 0;
  }

  isModAtLimit(comboItemId: string, group: ModifierGroup): boolean {
    if (group.maxSelections == null) return false;
    return this.modSelectedCount(comboItemId, group.id) >= group.maxSelections;
  }

  hasModGroupError(comboItemId: string, group: ModifierGroup): boolean {
    if (!group.required) return false;
    return this.modSelectedCount(comboItemId, group.id) < group.minSelections;
  }

  modSelectionLabel(group: ModifierGroup): string {
    const min = group.minSelections;
    const max = group.maxSelections;
    if (max === 1 && min === 1) return 'Elige 1';
    if (max == null) return `Mín. ${min}`;
    if (min === 0) return `Hasta ${max}`;
    if (min === max) return `Elige ${min}`;
    return `${min}-${max}`;
  }

  toggleModOption(comboItemId: string, group: ModifierGroup, option: ModifierOption): void {
    const root = new Map(this.modifierSelections());
    const itemMap = new Map(root.get(comboItemId) ?? []);
    const groupSet = new Set(itemMap.get(group.id) ?? []);

    if (group.maxSelections === 1) {
      // Radio behavior
      if (groupSet.has(option.id)) {
        if (!group.required || group.minSelections === 0) {
          groupSet.delete(option.id);
        }
      } else {
        groupSet.clear();
        groupSet.add(option.id);
      }
    } else {
      // Checkbox behavior
      if (groupSet.has(option.id)) {
        groupSet.delete(option.id);
      } else {
        if (group.maxSelections != null && groupSet.size >= group.maxSelections) {
          // At limit: remove first selected (FIFO) then add new one
          const first = groupSet.values().next().value;
          if (first != null) groupSet.delete(first);
        }
        groupSet.add(option.id);
      }
    }

    itemMap.set(group.id, groupSet);
    root.set(comboItemId, itemMap);
    this.modifierSelections.set(root);
  }

  // ── Confirm ──────────────────────────────────────────────────────────────

  onConfirm(): void {
    if (!this.isFormValid()) return;

    // Build chosenVariants (multiple entries per comboItemId if multi-select)
    const chosenVariants: { comboItemId: string; variantId: string }[] = [];
    for (const [comboItemId, variantIds] of this.selections()) {
      for (const variantId of variantIds) {
        chosenVariants.push({ comboItemId, variantId });
      }
    }

    // Build selectedModifiers from all combo items
    const selectedModifiers: SaleModifierSnapshot[] = [];
    const modSel = this.modifierSelections();

    for (const item of this.comboItems) {
      if (!item.modifierGroups?.length) continue;
      const itemMods = modSel.get(item.id);
      if (!itemMods) continue;

      for (const group of item.modifierGroups) {
        const selectedIds = itemMods.get(group.id);
        if (!selectedIds?.size) continue;

        for (const opt of group.options) {
          if (selectedIds.has(opt.id)) {
            selectedModifiers.push({
              groupId: group.id,
              groupName: group.name,
              optionId: opt.id,
              optionName: opt.name,
              priceAdjustment: opt.priceAdjustment,
            });
          }
        }
      }
    }

    this.confirm.emit({ chosenVariants, selectedModifiers });
  }

  // ── Preselect defaults ───────────────────────────────────────────────────

  private preselectDefaults(): void {
    // ── Choice group selections ────────────────────────────────────────
    if (this.preselectedChoices.length > 0) {
      // Restore from previous selections
      const restored = new Map<string, Set<string>>();
      for (const choice of this.preselectedChoices) {
        const set = restored.get(choice.comboItemId) ?? new Set<string>();
        set.add(choice.variantId);
        restored.set(choice.comboItemId, set);
      }
      this.selections.set(restored);
    } else {
      // Use isDefault from choice options
      const choiceDefaults = new Map<string, Set<string>>();
      for (const item of this.comboItems) {
        if (item.type === 'choice' && item.choiceGroup) {
          const defaults = new Set<string>();
          for (const opt of item.choiceGroup.options) {
            if (opt.isDefault && opt.isActive && defaults.size < item.choiceGroup.maxSelections) {
              defaults.add(opt.variantId);
            }
          }
          if (defaults.size > 0) {
            choiceDefaults.set(item.id, defaults);
          }
        }
      }
      if (choiceDefaults.size > 0) {
        this.selections.set(choiceDefaults);
      }
    }

    // ── Modifier selections ────────────────────────────────────────────
    if (this.preselectedModifiers.length > 0) {
      // Restore from previous selections
      const restored = new Map<string, Map<string, Set<string>>>();
      for (const item of this.comboItems) {
        if (!item.modifierGroups?.length) continue;
        const itemMap = new Map<string, Set<string>>();
        for (const group of item.modifierGroups) {
          const selected = new Set<string>();
          for (const snap of this.preselectedModifiers) {
            if (snap.groupId === group.id) {
              selected.add(snap.optionId);
            }
          }
          itemMap.set(group.id, selected);
        }
        restored.set(item.id, itemMap);
      }
      this.modifierSelections.set(restored);
    } else {
      // Use isDefault from modifier options
      const modDefaults = new Map<string, Map<string, Set<string>>>();
      for (const item of this.comboItems) {
        if (!item.modifierGroups?.length) continue;
        const itemMap = new Map<string, Set<string>>();
        for (const group of item.modifierGroups) {
          const defaults = new Set<string>();
          for (const opt of group.options) {
            if (opt.isDefault) defaults.add(opt.id);
          }
          itemMap.set(group.id, defaults);
        }
        modDefaults.set(item.id, itemMap);
      }
      if (modDefaults.size > 0) {
        this.modifierSelections.set(modDefaults);
      }
    }
  }
}
