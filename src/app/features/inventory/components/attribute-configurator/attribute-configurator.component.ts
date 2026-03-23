import {
  Component, Input, Output, EventEmitter, OnChanges,
  SimpleChanges, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSliders, lucidePlus, lucideX, lucideCheck,
  lucideChevronDown, lucideSave, lucideSkipForward
} from '@ng-icons/lucide';
import { AttributeTypeService } from '../../../../core/services/attribute-type.service';
import { CategoryService } from '../../../../core/services/category.service';
import { AttributeType, CategoryAttributeType } from '../../models/product.model';

type ConfigState = 'idle' | 'loading' | 'configured' | 'configuring';

@Component({
  selector: 'app-attribute-configurator',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideSliders, lucidePlus, lucideX, lucideCheck, lucideChevronDown, lucideSave, lucideSkipForward })],
  template: `
    @if (state() !== 'idle') {
      <div class="attr-config" [class.is-configured]="state() === 'configured'">

        <!-- CONFIGURED: chips + editar -->
        @if (state() === 'configured') {
          <div class="configured-row">
            <div class="chips-wrap">
              <span class="config-label">
                <ng-icon name="lucideSliders"></ng-icon>
                Atributos de variante:
              </span>
              @for (attr of confirmedAttributes(); track attr.attributeTypeId) {
                <span class="attr-chip active">
                  {{ attr.attributeType.name }}
                  @if (attr.attributeType.unit) {
                    <span class="chip-unit">{{ attr.attributeType.unit }}</span>
                  }
                </span>
              }
            </div>
            <button type="button" class="btn-edit-attrs" (click)="startEditing()">
              <ng-icon name="lucideChevronDown"></ng-icon>
              Editar
            </button>
          </div>
        }

        <!-- CONFIGURING: selector inline -->
        @if (state() === 'configuring') {
          <div class="configurator-panel">
            <div class="panel-header">
              <ng-icon name="lucideSliders"></ng-icon>
              <span>¿Qué característica diferencia las versiones de este producto?</span>
              <span class="optional-hint">Opcional</span>
            </div>

            @if (isLoadingSystem()) {
              <div class="loading-row">
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
              </div>
            } @else {
              <!-- Sugeridos -->
              <div class="suggestions-row">
                @for (attr of systemAttributes(); track attr.id) {
                  <button
                    type="button"
                    class="suggestion-chip"
                    [class.selected]="selectedIds().has(attr.id)"
                    (click)="toggleAttribute(attr)"
                  >
                    @if (selectedIds().has(attr.id)) {
                      <ng-icon name="lucideCheck"></ng-icon>
                    } @else {
                      <ng-icon name="lucidePlus"></ng-icon>
                    }
                    {{ attr.name }}
                    @if (attr.unit) { <span class="chip-unit">{{ attr.unit }}</span> }
                  </button>
                }
              </div>

              <!-- Seleccionados actualmente -->
              @if (selectedIds().size > 0) {
                <div class="selected-preview">
                  @for (attr of selectedAttributeObjects(); track attr.id) {
                    <span class="attr-chip active">
                      {{ attr.name }}
                      <button type="button" (click)="toggleAttribute(attr)">
                        <ng-icon name="lucideX"></ng-icon>
                      </button>
                    </span>
                  }
                </div>
              }

              <!-- Guardar para categoría -->
              <label class="save-toggle" (click)="saveToCategory.set(!saveToCategory())">
                <span class="fake-checkbox" [class.checked]="saveToCategory()">
                  @if (saveToCategory()) { <ng-icon name="lucideCheck"></ng-icon> }
                </span>
                <span>
                  Guardar para esta categoría
                  <small>Los próximos productos aquí ya tendrán estos atributos</small>
                </span>
              </label>

              <!-- Acciones -->
              <div class="panel-actions">
                <button type="button" class="btn-skip" (click)="skip()">
                  <ng-icon name="lucideSkipForward"></ng-icon>
                  Sin atributos
                </button>
                <button
                  type="button"
                  class="btn-confirm"
                  [disabled]="selectedIds().size === 0 || isSaving()"
                  (click)="confirm()"
                >
                  @if (isSaving()) {
                    Guardando...
                  } @else {
                    <ng-icon name="lucideCheck"></ng-icon>
                    Confirmar
                  }
                </button>
              </div>
            }
          </div>
        }

        <!-- LOADING -->
        @if (state() === 'loading') {
          <div class="loading-row">
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
          </div>
        }

      </div>
    }
  `,
  styles: [`
    .attr-config {
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      overflow: hidden;
      transition: all 0.2s ease;
    }

    /* CONFIGURED */
    .configured-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: var(--color-bg-canvas);
    }

    .chips-wrap {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .config-label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    .btn-edit-attrs {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: transparent;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      padding: 0.25rem 0.625rem;
      font-size: 12px;
      color: var(--color-text-muted);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
      &:hover { background: var(--color-bg-hover); color: var(--color-text-main); }
    }

    /* CONFIGURATOR PANEL */
    .configurator-panel {
      padding: 1.25rem;
      background: var(--color-bg-canvas);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-main);
      .optional-hint {
        margin-left: auto;
        font-size: 11px;
        font-weight: 400;
        color: var(--color-text-muted);
      }
    }

    .suggestions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .suggestion-chip {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border-radius: 999px;
      border: 1px solid var(--color-border-light);
      background: var(--color-bg-surface);
      font-size: 12px;
      font-weight: 500;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.15s;
      &:hover { border-color: var(--color-accent-primary); color: var(--color-accent-primary); }
      &.selected {
        background: var(--color-accent-primary);
        border-color: var(--color-accent-primary);
        color: var(--color-bg-canvas);
      }
    }

    .attr-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: color-mix(in srgb, var(--color-accent-primary) 12%, transparent);
      color: var(--color-accent-primary);
      border: 1px solid color-mix(in srgb, var(--color-accent-primary) 25%, transparent);
      button {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: inherit;
        display: flex;
        align-items: center;
        opacity: 0.7;
        &:hover { opacity: 1; }
      }
    }

    .chip-unit {
      font-weight: 400;
      opacity: 0.7;
      font-size: 11px;
    }

    .selected-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--color-bg-surface);
      border-radius: var(--radius-md);
      border: 1px dashed var(--color-border-light);
    }

    .save-toggle {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
      user-select: none;

      .fake-checkbox {
        width: 18px;
        height: 18px;
        min-width: 18px;
        border-radius: 4px;
        border: 2px solid var(--color-border-light);
        background: var(--color-bg-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        margin-top: 2px;
        transition: all 0.15s;
        &.checked {
          background: var(--color-accent-primary);
          border-color: var(--color-accent-primary);
          color: var(--color-bg-canvas);
        }
      }

      span {
        font-size: var(--font-size-sm);
        font-weight: 500;
        color: var(--color-text-main);
        small {
          display: block;
          font-size: 11px;
          font-weight: 400;
          color: var(--color-text-muted);
          margin-top: 2px;
        }
      }
    }

    .panel-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .btn-skip {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      background: transparent;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      padding: 0.5rem 1rem;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.15s;
      &:hover { background: var(--color-bg-hover); }
    }

    .btn-confirm {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      background: var(--color-accent-primary);
      border: none;
      border-radius: var(--radius-md);
      padding: 0.5rem 1.25rem;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-bg-canvas);
      cursor: pointer;
      transition: opacity 0.15s;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
      &:not(:disabled):hover { opacity: 0.85; }
    }

    .loading-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0.75rem 1rem;
    }

    .loading-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-text-muted);
      animation: pulse 1.2s ease-in-out infinite;
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }

    @keyframes pulse {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }
  `]
})
export class AttributeConfiguratorComponent implements OnChanges {
  @Input() categoryId: string | null = null;
  @Input() initialAttributes: CategoryAttributeType[] = [];
  @Output() attributesChange = new EventEmitter<CategoryAttributeType[]>();

  private attrTypeSvc  = inject(AttributeTypeService);
  private categorySvc  = inject(CategoryService);

  state            = signal<ConfigState>('idle');
  systemAttributes = signal<AttributeType[]>([]);
  selectedIds      = signal<Set<string>>(new Set());
  saveToCategory   = signal(false);
  isSaving         = signal(false);
  isLoadingSystem  = signal(false);

  // Confirmed attributes shown as chips in 'configured' state
  confirmedAttributes = signal<CategoryAttributeType[]>([]);

  // Derived: AttributeType objects for currently selected IDs
  selectedAttributeObjects = computed(() =>
    this.systemAttributes().filter(a => this.selectedIds().has(a.id))
  );

  ngOnChanges(changes: SimpleChanges) {
    if (changes['categoryId'] || changes['initialAttributes']) {
      this.onCategoryChange();
    }
  }

  private onCategoryChange() {
    if (!this.categoryId) {
      this.state.set('idle');
      return;
    }

    if (this.initialAttributes.length > 0) {
      // Modo edición: atributos provistos por el padre
      this.confirmedAttributes.set(this.initialAttributes);
      this.selectedIds.set(new Set(this.initialAttributes.map(a => a.attributeTypeId)));
      this.state.set('configured');
    } else {
      // Producto nuevo: verificar si la categoría ya tiene atributos guardados
      this.state.set('loading');
      this.categorySvc.getCategoryAttributes(this.categoryId).subscribe(saved => {
        if (saved.length > 0) {
          this.confirmedAttributes.set(saved);
          this.selectedIds.set(new Set(saved.map(a => a.attributeTypeId)));
          this.state.set('configured');
          this.attributesChange.emit(saved);
        } else {
          this.state.set('configuring');
          this.loadSystemAttributes();
        }
      });
    }
  }

  private loadSystemAttributes() {
    if (this.systemAttributes().length > 0) return; // already loaded
    this.isLoadingSystem.set(true);
    this.attrTypeSvc.findAll().subscribe({
      next: res => {
        this.systemAttributes.set(res.data);
        this.isLoadingSystem.set(false);
      },
      error: () => this.isLoadingSystem.set(false)
    });
  }

  toggleAttribute(attr: AttributeType) {
    const current = new Set(this.selectedIds());
    if (current.has(attr.id)) {
      current.delete(attr.id);
    } else {
      current.add(attr.id);
    }
    this.selectedIds.set(current);
  }

  startEditing() {
    this.loadSystemAttributes();
    this.state.set('configuring');
  }

  skip() {
    this.selectedIds.set(new Set());
    this.confirmedAttributes.set([]);
    this.state.set('configured');
    this.attributesChange.emit([]);
  }

  confirm() {
    const selected = this.buildCategoryAttributeTypes();

    if (this.saveToCategory() && this.categoryId) {
      this.isSaving.set(true);
      const payload = selected.map((a, i) => ({
        attributeTypeId: a.attributeTypeId,
        isRequired: false,
        displayOrder: i,
      }));
      this.categorySvc.assignCategoryAttributes(this.categoryId, payload).subscribe({
        next: saved => {
          this.confirmedAttributes.set(saved);
          this.attributesChange.emit(saved);
          this.state.set('configured');
          this.isSaving.set(false);
        },
        error: () => {
          // Even if save fails, apply locally
          this.applyLocally(selected);
          this.isSaving.set(false);
        }
      });
    } else {
      this.applyLocally(selected);
    }
  }

  private applyLocally(selected: CategoryAttributeType[]) {
    this.confirmedAttributes.set(selected);
    this.attributesChange.emit(selected);
    this.state.set('configured');
  }

  private buildCategoryAttributeTypes(): CategoryAttributeType[] {
    return this.systemAttributes()
      .filter(a => this.selectedIds().has(a.id))
      .map((a, i) => ({
        id: '',
        categoryId: this.categoryId!,
        attributeTypeId: a.id,
        attributeType: a,
        isRequired: false,
        displayOrder: i,
      }));
  }
}
