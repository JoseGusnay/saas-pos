import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
  OnChanges,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucidePlus, lucideMinus } from '@ng-icons/lucide';
import {
  ModifierGroup,
  ModifierOption,
} from '../../../inventory/models/product.model';
import { SaleModifierSnapshot } from '../../../../core/models/sale.models';

@Component({
  selector: 'app-modifier-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, CurrencyPipe],
  providers: [provideIcons({ lucideCheck, lucidePlus, lucideMinus })],
  styleUrls: ['./modifier-dialog.component.scss'],
  template: `
    <div class="modifier-dialog">
      <!-- Header -->
      <div class="modifier-dialog__header">
        <h2 class="modifier-dialog__title">{{ productName }}</h2>
        <p class="modifier-dialog__subtitle">Personaliza tu producto</p>
      </div>

      <!-- Groups -->
      <div class="modifier-dialog__body">
        @for (group of modifierGroups; track group.id) {
          <div
            class="modifier-dialog__group"
            [class.modifier-dialog__group--error]="
              groupErrors().has(group.id)
            "
          >
            <!-- Group header -->
            <div class="modifier-dialog__group-header">
              <div class="modifier-dialog__group-info">
                <span class="modifier-dialog__group-name">{{ group.name }}</span>
                <span
                  class="modifier-dialog__badge"
                  [class.modifier-dialog__badge--required]="group.required"
                  [class.modifier-dialog__badge--optional]="!group.required"
                >
                  {{ group.required ? 'Requerido' : 'Opcional' }}
                </span>
              </div>
              <span
                class="modifier-dialog__group-count"
                [class.modifier-dialog__group-count--full]="isAtLimit(group)"
              >
                @if (isAtLimit(group)) {
                  Máximo alcanzado
                } @else {
                  Selecciona {{ selectionRangeLabel(group) }}
                }
                <span class="modifier-dialog__group-selected">
                  ({{ selectedCountForGroup(group.id) }})
                </span>
              </span>
            </div>

            @if (groupErrors().has(group.id)) {
              <p class="modifier-dialog__group-error">
                {{ groupErrors().get(group.id) }}
              </p>
            }

            <!-- Options -->
            <div class="modifier-dialog__options">
              @for (option of group.options; track option.id) {
                <button
                  type="button"
                  class="modifier-dialog__option"
                  [class.modifier-dialog__option--selected]="
                    isSelected(group.id, option.id)
                  "
                  [class.modifier-dialog__option--at-limit]="
                    isAtLimit(group) && !isSelected(group.id, option.id)
                  "
                  (click)="toggleOption(group, option)"
                >
                  <div class="modifier-dialog__option-left">
                    <span
                      class="modifier-dialog__check"
                      [class.modifier-dialog__check--active]="
                        isSelected(group.id, option.id)
                      "
                      [class.modifier-dialog__check--radio]="
                        group.maxSelections === 1
                      "
                    >
                      @if (isSelected(group.id, option.id)) {
                        <ng-icon name="lucideCheck" size="14" />
                      }
                    </span>
                    <span class="modifier-dialog__option-name">
                      {{ option.name }}
                    </span>
                  </div>
                  <span class="modifier-dialog__price">
                    @if (option.priceAdjustment > 0) {
                      +{{ option.priceAdjustment | currency: 'USD':'symbol':'1.2-2' }}
                    } @else if (option.priceAdjustment < 0) {
                      {{ option.priceAdjustment | currency: 'USD':'symbol':'1.2-2' }}
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

      <!-- Footer -->
      <div class="modifier-dialog__footer">
        <div class="modifier-dialog__total">
          <span class="modifier-dialog__total-label">Ajuste total</span>
          <span class="modifier-dialog__total-amount">
            @if (totalAdjustment() >= 0) { + }
            {{ totalAdjustment() | currency: 'USD':'symbol':'1.2-2' }}
          </span>
        </div>
        <div class="modifier-dialog__actions">
          <button
            type="button"
            class="modifier-dialog__btn modifier-dialog__btn--cancel"
            (click)="onCancel()"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="modifier-dialog__btn modifier-dialog__btn--confirm"
            [disabled]="!isValid()"
            (click)="onConfirm()"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ModifierDialogComponent implements OnInit, OnChanges {
  @Input() modifierGroups: ModifierGroup[] = [];
  @Input() productName = '';
  @Input() preselected: SaleModifierSnapshot[] = [];

  @Output() confirm = new EventEmitter<SaleModifierSnapshot[]>();
  @Output() cancel = new EventEmitter<void>();

  /** groupId -> Set of selected optionIds */
  private readonly selections = signal<Map<string, Set<string>>>(new Map());

  private initialized = false;

  ngOnChanges(): void {
    if (!this.initialized && this.modifierGroups.length > 0) {
      this.initDefaults();
      this.initialized = true;
    }
  }

  ngOnInit(): void {
    if (!this.initialized && this.modifierGroups.length > 0) {
      this.initDefaults();
      this.initialized = true;
    }
  }

  /** Pre-select from preselected input or defaults */
  private initDefaults(): void {
    const map = new Map<string, Set<string>>();

    if (this.preselected.length > 0) {
      // Restore from previous selections
      for (const group of this.modifierGroups) {
        const selected = new Set<string>();
        for (const snap of this.preselected) {
          if (snap.groupId === group.id) {
            selected.add(snap.optionId);
          }
        }
        map.set(group.id, selected);
      }
    } else {
      // Use isDefault from group options
      for (const group of this.modifierGroups) {
        const defaults = new Set<string>();
        for (const opt of group.options) {
          if (opt.isDefault) {
            defaults.add(opt.id);
          }
        }
        map.set(group.id, defaults);
      }
    }

    this.selections.set(map);
  }

  /** Computed: total price adjustment from all selected options */
  readonly totalAdjustment = computed(() => {
    let total = 0;
    const sel = this.selections();
    for (const group of this.modifierGroups) {
      const selectedIds = sel.get(group.id);
      if (!selectedIds) continue;
      for (const opt of group.options) {
        if (selectedIds.has(opt.id)) {
          total += opt.priceAdjustment;
        }
      }
    }
    return total;
  });

  /** Computed: validation errors per group */
  readonly groupErrors = computed(() => {
    const errors = new Map<string, string>();
    const sel = this.selections();
    for (const group of this.modifierGroups) {
      if (!group.required) continue;
      const count = sel.get(group.id)?.size ?? 0;
      if (count < group.minSelections) {
        errors.set(
          group.id,
          `Selecciona al menos ${group.minSelections} opción${group.minSelections > 1 ? 'es' : ''}`
        );
      }
    }
    return errors;
  });

  /** Computed: overall form validity */
  readonly isValid = computed(() => this.groupErrors().size === 0);

  /** Check if an option is currently selected */
  isSelected(groupId: string, optionId: string): boolean {
    return this.selections().get(groupId)?.has(optionId) ?? false;
  }

  /** Check if a group has reached its max selections */
  isAtLimit(group: ModifierGroup): boolean {
    if (group.maxSelections == null) return false;
    return (this.selections().get(group.id)?.size ?? 0) >= group.maxSelections;
  }

  /** Get selected count for a group */
  selectedCountForGroup(groupId: string): number {
    return this.selections().get(groupId)?.size ?? 0;
  }

  /** Build selection range label (e.g., "1", "1-3", "hasta 5") */
  selectionRangeLabel(group: ModifierGroup): string {
    const min = group.minSelections;
    const max = group.maxSelections;
    if (max === 1 && min === 1) return '1';
    if (max == null) return `mín. ${min}`;
    if (min === 0) return `hasta ${max}`;
    if (min === max) return `${min}`;
    return `${min}-${max}`;
  }

  /** Toggle selection for an option within a group */
  toggleOption(group: ModifierGroup, option: ModifierOption): void {
    const current = this.selections();
    const map = new Map(current);
    const groupSet = new Set(map.get(group.id) ?? []);

    if (group.maxSelections === 1) {
      // Radio behavior: clear and set, or deselect if already selected (only if not required)
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
        const max = group.maxSelections;
        if (max != null && groupSet.size >= max) {
          // At limit: remove first selected (FIFO) then add new one
          const first = groupSet.values().next().value;
          if (first != null) groupSet.delete(first);
        }
        groupSet.add(option.id);
      }
    }

    map.set(group.id, groupSet);
    this.selections.set(map);
  }

  /** Emit selected modifiers as snapshots */
  onConfirm(): void {
    if (!this.isValid()) return;

    const snapshots: SaleModifierSnapshot[] = [];
    const sel = this.selections();

    for (const group of this.modifierGroups) {
      const selectedIds = sel.get(group.id);
      if (!selectedIds) continue;

      for (const opt of group.options) {
        if (selectedIds.has(opt.id)) {
          snapshots.push({
            groupId: group.id,
            groupName: group.name,
            optionId: opt.id,
            optionName: opt.name,
            priceAdjustment: opt.priceAdjustment,
          });
        }
      }
    }

    this.confirm.emit(snapshots);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
