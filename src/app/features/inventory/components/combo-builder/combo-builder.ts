import {
  Component, Input, OnInit, inject, signal, computed,
  ChangeDetectionStrategy, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSearch, lucideX, lucidePlus, lucideTrash2,
  lucideMinus, lucideGift, lucideChevronDown, lucideChevronUp, lucideSliders,
  lucideList, lucideDollarSign
} from '@ng-icons/lucide';
import { debounceTime, distinctUntilChanged, Subject, takeUntil, switchMap, of } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { ModifierBuilderComponent } from '../modifier-builder/modifier-builder.component';

interface VariantResult {
  variantId: string;
  variantName: string;
  productName: string;
  sku?: string;
  salePrice: number;
  imageUrl?: string;
}

@Component({
  selector: 'app-combo-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent, ModifierBuilderComponent],
  providers: [
    provideIcons({ lucideSearch, lucideX, lucidePlus, lucideTrash2, lucideMinus, lucideGift, lucideChevronDown, lucideChevronUp, lucideSliders, lucideList, lucideDollarSign })
  ],
  template: `
    <div class="cb">

      <!-- Top action bar: search + add choice group button -->
      <div class="cb__actions">
        <div class="cb__search-wrap">
          <div class="cb__search-box">
            <ng-icon name="lucideSearch" class="cb__search-ic"></ng-icon>
            <input
              class="cb__search-input"
              type="text"
              placeholder="Buscar producto para agregar…"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              (blur)="onSearchBlur()"
              autocomplete="off"
            >
            @if (searchQuery()) {
              <button type="button" class="cb__search-clear" (click)="clearSearch()">
                <ng-icon name="lucideX"></ng-icon>
              </button>
            }
          </div>

          @if (results().length > 0) {
            <div class="cb__dropdown">
              @for (r of results(); track r.variantId) {
                <button type="button" class="cb__dropdown-item"
                  [class.cb__dropdown-item--added]="isAdded(r.variantId)"
                  (mousedown)="addItem(r)">
                  <div class="cb__di-avatar">
                    @if (r.imageUrl) { <img [src]="r.imageUrl" alt=""> }
                    @else { {{ r.productName[0].toUpperCase() }} }
                  </div>
                  <div class="cb__di-info">
                    <span class="cb__di-product">{{ r.productName }}</span>
                    <span class="cb__di-variant">
                      {{ r.variantName !== r.productName ? r.variantName : '' }}
                      @if (r.sku) { <code>{{ r.sku }}</code> }
                    </span>
                  </div>
                  <div class="cb__di-price">\${{ r.salePrice | number:'1.2-2' }}</div>
                  @if (isAdded(r.variantId)) {
                    <span class="cb__di-added-tag">Agregado</span>
                  } @else {
                    <ng-icon name="lucidePlus" class="cb__di-add-ic"></ng-icon>
                  }
                </button>
              }
            </div>
          }
          @if (isSearching()) { <div class="cb__searching">Buscando…</div> }
          @if (noResults()) { <div class="cb__no-results">Sin resultados para "{{ searchQuery() }}"</div> }
        </div>

        <button type="button" class="cb__add-choice-btn" (click)="addChoiceGroup()">
          <ng-icon name="lucideList"></ng-icon>
          Grupo de elección
        </button>
      </div>

      <!-- Items list -->
      @if (formArray.length > 0) {
        <div class="cb__items">
          @for (ctrl of formArray.controls; track $index; let i = $index) {
            <div class="cb__item-wrapper">
              @if (isChoiceItem(ctrl)) {
                <!-- ══ CHOICE GROUP ══ -->
                <div class="cb__choice-group">
                  <div class="cb__choice-header">
                    <ng-icon name="lucideList" class="cb__choice-ic"></ng-icon>
                    <input type="text" class="cb__choice-name-input"
                      [value]="getChoiceGroup(ctrl).get('name')?.value"
                      (input)="onChoiceNameInput(ctrl, $event)"
                      placeholder="Nombre del grupo (ej: Elige tu bebida)">
                    <div class="cb__item-qty">
                      <button type="button" class="cb__qty-btn" (click)="adjustQty(i, -1)"
                        [disabled]="ctrl.get('quantity')?.value <= 1">
                        <ng-icon name="lucideMinus"></ng-icon>
                      </button>
                      <input type="number" class="cb__qty-input" [formControl]="$any(ctrl.get('quantity'))" min="1" step="1">
                      <button type="button" class="cb__qty-btn" (click)="adjustQty(i, 1)">
                        <ng-icon name="lucidePlus"></ng-icon>
                      </button>
                    </div>
                    <button type="button" class="cb__item-remove" (click)="removeItem(i)" title="Eliminar grupo">
                      <ng-icon name="lucideTrash2"></ng-icon>
                    </button>
                  </div>

                  <div class="cb__choice-options">
                    @if (getChoiceOptions(ctrl).length < 2) {
                      <div class="cb__choice-hint">Agrega al menos 2 opciones para este grupo</div>
                    }
                    @for (opt of getChoiceOptions(ctrl).controls; track $index; let j = $index) {
                      <div class="cb__choice-option" [formGroup]="asFormGroup(opt)">
                        <div class="cb__co-avatar">{{ opt.get('name')?.value?.[0]?.toUpperCase() ?? '?' }}</div>
                        <span class="cb__co-name">{{ opt.get('name')?.value }}</span>
                        <div class="cb__co-adjustment" title="Cargo extra sobre el precio del combo">
                          <span class="cb__co-adj-prefix">+$</span>
                          <input type="number" formControlName="priceAdjustment" step="0.01" placeholder="0.00" class="cb__co-adj-input">
                        </div>
                        <button type="button" class="cb__co-remove" (click)="removeChoiceOption(ctrl, j)" title="Quitar opción">
                          <ng-icon name="lucideX"></ng-icon>
                        </button>
                      </div>
                    }

                    <!-- Inline search for this choice group -->
                    <div class="cb__inline-search">
                      <div class="cb__inline-search-box">
                        <ng-icon name="lucidePlus" class="cb__inline-search-ic"></ng-icon>
                        <input type="text" class="cb__inline-search-input"
                          placeholder="Buscar producto para agregar al grupo…"
                          [value]="choiceSearchQuery(i)"
                          (input)="onChoiceSearchInput(i, $event)"
                          (blur)="onChoiceSearchBlur(i)"
                          autocomplete="off">
                      </div>
                      @if (choiceResults(i).length > 0) {
                        <div class="cb__inline-dropdown">
                          @for (r of choiceResults(i); track r.variantId) {
                            <button type="button" class="cb__dropdown-item"
                              [class.cb__dropdown-item--added]="isOptionAdded(ctrl, r.variantId)"
                              (mousedown)="addChoiceOption(i, r)">
                              <div class="cb__di-avatar">
                                @if (r.imageUrl) { <img [src]="r.imageUrl" alt=""> }
                                @else { {{ r.productName[0].toUpperCase() }} }
                              </div>
                              <div class="cb__di-info">
                                <span class="cb__di-product">{{ r.productName }}</span>
                                <span class="cb__di-variant">
                                  {{ r.variantName !== r.productName ? r.variantName : '' }}
                                  @if (r.sku) { <code>{{ r.sku }}</code> }
                                </span>
                              </div>
                              <div class="cb__di-price">\${{ r.salePrice | number:'1.2-2' }}</div>
                              @if (isOptionAdded(ctrl, r.variantId)) {
                                <span class="cb__di-added-tag">Agregado</span>
                              } @else {
                                <ng-icon name="lucidePlus" class="cb__di-add-ic"></ng-icon>
                              }
                            </button>
                          }
                        </div>
                      }
                      @if (isChoiceSearching(i)) { <div class="cb__inline-status">Buscando…</div> }
                    </div>
                  </div>
                </div>
              } @else {
                <!-- ══ FIXED ITEM ══ -->
                <div class="cb__item" [formGroup]="asFormGroup(ctrl)">
                  <div class="cb__item-avatar">
                    {{ ctrl.get('productName')?.value?.[0]?.toUpperCase() ?? '?' }}
                  </div>
                  <div class="cb__item-info">
                    <span class="cb__item-product">{{ ctrl.get('productName')?.value }}</span>
                    <span class="cb__item-variant">
                      {{ ctrl.get('variantName')?.value !== ctrl.get('productName')?.value
                          ? ctrl.get('variantName')?.value : '' }}
                      @if (ctrl.get('sku')?.value) { <code>{{ ctrl.get('sku')?.value }}</code> }
                    </span>
                  </div>
                  <div class="cb__item-qty">
                    <button type="button" class="cb__qty-btn" (click)="adjustQty(i, -1)"
                      [disabled]="ctrl.get('quantity')?.value <= 1">
                      <ng-icon name="lucideMinus"></ng-icon>
                    </button>
                    <input type="number" class="cb__qty-input" formControlName="quantity" min="1" step="1">
                    <button type="button" class="cb__qty-btn" (click)="adjustQty(i, 1)">
                      <ng-icon name="lucidePlus"></ng-icon>
                    </button>
                  </div>
                  <div class="cb__item-subtotal">\${{ subtotal(ctrl) | number:'1.2-2' }}</div>
                  <button type="button" class="cb__expand-btn" (click)="toggleExpand(i)" title="Modificadores del ítem">
                    <ng-icon name="lucideSliders"></ng-icon>
                    @if (getModifiers(ctrl).length > 0) {
                      <span class="cb__mod-badge">{{ getModifiers(ctrl).length }}</span>
                    }
                    <ng-icon [name]="isExpanded(i) ? 'lucideChevronUp' : 'lucideChevronDown'"></ng-icon>
                  </button>
                  <button type="button" class="cb__item-remove" (click)="removeItem(i)" title="Quitar">
                    <ng-icon name="lucideTrash2"></ng-icon>
                  </button>
                </div>
                @if (isExpanded(i)) {
                  <div class="cb__item-modifiers">
                    <app-modifier-builder [formArray]="getModifiers(ctrl)"></app-modifier-builder>
                  </div>
                }
              }
            </div>
          }
        </div>

        <div class="cb__total-row">
          <span class="cb__total-label">Total calculado</span>
          <span class="cb__total-value">\${{ total() | number:'1.2-2' }}</span>
        </div>
      } @else {
        <div class="cb__empty">
          <ng-icon name="lucideGift"></ng-icon>
          <p>Agrega productos o grupos de elección para componer el combo.</p>
        </div>
      }
    </div>
  `,
  styleUrl: './combo-builder.scss'
})
export class ComboBuilderComponent implements OnInit, OnDestroy {
  @Input({ required: true }) formArray!: FormArray;
  @Input() excludeProductId?: string;

  private fb = inject(FormBuilder);
  private productSvc = inject(ProductService);
  private destroy$ = new Subject<void>();

  // ── Main search (fixed items) ──────────────────────────────────────────────
  searchQuery = signal('');
  results = signal<VariantResult[]>([]);
  isSearching = signal(false);
  noResults = signal(false);
  private search$ = new Subject<string>();

  // ── Per-choice-group inline search ─────────────────────────────────────────
  private choiceSearchQueries = signal<Map<number, string>>(new Map());
  private choiceSearchResults = signal<Map<number, VariantResult[]>>(new Map());
  private choiceSearchingFlags = signal<Set<number>>(new Set());
  private choiceSearch$ = new Subject<{ index: number; query: string }>();

  choiceSearchQuery(i: number): string { return this.choiceSearchQueries().get(i) ?? ''; }
  choiceResults(i: number): VariantResult[] { return this.choiceSearchResults().get(i) ?? []; }
  isChoiceSearching(i: number): boolean { return this.choiceSearchingFlags().has(i); }

  // ── Expand / collapse ──────────────────────────────────────────────────────
  private expandedItems = signal<Set<number>>(new Set());
  isExpanded(i: number): boolean { return this.expandedItems().has(i); }
  toggleExpand(i: number) {
    const s = new Set(this.expandedItems());
    if (s.has(i)) s.delete(i); else s.add(i);
    this.expandedItems.set(s);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getModifiers(ctrl: AbstractControl): FormArray { return ctrl.get('modifierGroups') as FormArray; }
  isChoiceItem(ctrl: AbstractControl): boolean { return ctrl.get('choiceGroup') !== null; }
  getChoiceGroup(ctrl: AbstractControl): FormGroup { return ctrl.get('choiceGroup') as FormGroup; }
  getChoiceOptions(ctrl: AbstractControl): FormArray { return (ctrl.get('choiceGroup') as FormGroup).get('options') as FormArray; }
  asFormGroup(ctrl: AbstractControl): FormGroup { return ctrl as FormGroup; }

  subtotal(ctrl: AbstractControl): number {
    return (Number(ctrl.get('salePrice')?.value) || 0) * (Number(ctrl.get('quantity')?.value) || 1);
  }

  private arrayValues = signal<any[]>([]);
  total = computed(() =>
    this.arrayValues().reduce((sum, item) => {
      if (item.choiceGroup) {
        const opts = item.choiceGroup.options ?? [];
        const defaultOpt = opts.find((o: any) => o.isDefault) ?? opts[0];
        return sum + Number(defaultOpt?.salePrice ?? 0) * (Number(item.quantity) || 1);
      }
      return sum + (Number(item.salePrice) || 0) * (Number(item.quantity) || 1);
    }, 0)
  );

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit() {
    this.arrayValues.set(this.formArray.value);
    this.formArray.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => this.arrayValues.set(v));

    // Main search pipe
    this.search$.pipe(
      debounceTime(300), distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 2) { this.results.set([]); this.noResults.set(false); this.isSearching.set(false); return of([]); }
        this.isSearching.set(true); this.noResults.set(false);
        return this.productSvc.searchVariants(query, this.excludeProductId);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data: any[]) => { this.isSearching.set(false); this.results.set(data); this.noResults.set(data.length === 0 && this.searchQuery().length >= 2); },
      error: () => { this.isSearching.set(false); this.results.set([]); }
    });

    // Choice group inline search pipe
    this.choiceSearch$.pipe(
      debounceTime(300),
      switchMap(({ index, query }) => {
        if (query.length < 2) {
          this.updateChoiceResults(index, []);
          this.updateChoiceSearching(index, false);
          return of(null);
        }
        this.updateChoiceSearching(index, true);
        return this.productSvc.searchVariants(query, this.excludeProductId).pipe(
          switchMap(data => of({ index, data }))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        if (!res) return;
        this.updateChoiceResults(res.index, res.data);
        this.updateChoiceSearching(res.index, false);
      },
      error: () => {}
    });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  // ── Main search handlers ───────────────────────────────────────────────────

  onSearchInput(event: Event) {
    const q = (event.target as HTMLInputElement).value;
    this.searchQuery.set(q);
    this.search$.next(q);
  }

  onSearchBlur() {
    setTimeout(() => { this.results.set([]); this.noResults.set(false); }, 150);
  }

  clearSearch() {
    this.searchQuery.set(''); this.results.set([]); this.noResults.set(false); this.search$.next('');
  }

  isAdded(variantId: string): boolean {
    return this.formArray.controls.some(c => {
      if (c.get('productVariantId')?.value === variantId) return true;
      const cg = c.get('choiceGroup');
      if (cg) {
        const opts = (cg.get('options') as FormArray)?.controls ?? [];
        return opts.some(o => o.get('variantId')?.value === variantId);
      }
      return false;
    });
  }

  addItem(r: VariantResult) {
    if (this.isAdded(r.variantId)) return;
    this.formArray.push(this.fb.group({
      productVariantId: [r.variantId, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      variantName: [r.variantName],
      productName: [r.productName],
      sku: [r.sku ?? ''],
      salePrice: [r.salePrice],
      modifierGroups: this.fb.array([]),
    }));
    this.clearSearch();
  }

  // ── Choice group handlers ──────────────────────────────────────────────────

  addChoiceGroup() {
    this.formArray.push(this.fb.group({
      quantity: [1, [Validators.required, Validators.min(1)]],
      choiceGroup: this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(100)]],
        minSelections: [1],
        maxSelections: [1],
        required: [true],
        sortOrder: [0],
        options: this.fb.array([]),
      }),
    }));
  }

  onChoiceNameInput(ctrl: AbstractControl, event: Event) {
    this.getChoiceGroup(ctrl).get('name')?.setValue((event.target as HTMLInputElement).value);
  }

  onChoiceSearchInput(index: number, event: Event) {
    const q = (event.target as HTMLInputElement).value;
    this.updateChoiceQuery(index, q);
    this.choiceSearch$.next({ index, query: q });
  }

  onChoiceSearchBlur(index: number) {
    setTimeout(() => { this.updateChoiceResults(index, []); this.updateChoiceQuery(index, ''); }, 150);
  }

  isOptionAdded(ctrl: AbstractControl, variantId: string): boolean {
    return this.getChoiceOptions(ctrl).controls.some(o => o.get('variantId')?.value === variantId);
  }

  addChoiceOption(comboItemIndex: number, r: VariantResult) {
    const ctrl = this.formArray.at(comboItemIndex);
    const options = this.getChoiceOptions(ctrl);
    if (this.isOptionAdded(ctrl, r.variantId)) return;

    options.push(this.fb.group({
      variantId: [r.variantId, Validators.required],
      name: [r.variantName !== r.productName ? `${r.productName} — ${r.variantName}` : r.productName],
      priceAdjustment: [0],
      isDefault: [options.length === 0],
      sortOrder: [options.length],
      salePrice: [r.salePrice],
    }));

    this.updateChoiceResults(comboItemIndex, []);
    this.updateChoiceQuery(comboItemIndex, '');
  }

  removeChoiceOption(ctrl: AbstractControl, optionIndex: number) {
    this.getChoiceOptions(ctrl).removeAt(optionIndex);
  }

  // ── Common ─────────────────────────────────────────────────────────────────

  removeItem(index: number) {
    this.formArray.removeAt(index);
    this.expandedItems.set(new Set());
  }

  adjustQty(index: number, delta: number) {
    const ctrl = this.formArray.at(index).get('quantity');
    if (!ctrl) return;
    ctrl.setValue(Math.max(1, (ctrl.value || 1) + delta));
  }

  // ── Private signal updaters ────────────────────────────────────────────────

  private updateChoiceQuery(index: number, query: string) {
    const m = new Map(this.choiceSearchQueries());
    if (query) m.set(index, query); else m.delete(index);
    this.choiceSearchQueries.set(m);
  }

  private updateChoiceResults(index: number, results: VariantResult[]) {
    const m = new Map(this.choiceSearchResults());
    if (results.length) m.set(index, results); else m.delete(index);
    this.choiceSearchResults.set(m);
  }

  private updateChoiceSearching(index: number, searching: boolean) {
    const s = new Set(this.choiceSearchingFlags());
    if (searching) s.add(index); else s.delete(index);
    this.choiceSearchingFlags.set(s);
  }
}
