import {
  Component, Input, OnInit, inject, signal, computed,
  ChangeDetectionStrategy, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSearch, lucideX, lucidePlus, lucideTrash2,
  lucideMinus, lucideGift, lucideChevronDown, lucideChevronUp, lucideSliders
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
    provideIcons({ lucideSearch, lucideX, lucidePlus, lucideTrash2, lucideMinus, lucideGift, lucideChevronDown, lucideChevronUp, lucideSliders })
  ],
  template: `
    <div class="cb">

      <!-- Search box -->
      <div class="cb__search-wrap">
        <div class="cb__search-box">
          <ng-icon name="lucideSearch" class="cb__search-ic"></ng-icon>
          <input
            class="cb__search-input"
            type="text"
            placeholder="Buscar producto o variante para agregar…"
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

        <!-- Dropdown results -->
        @if (results().length > 0) {
          <div class="cb__dropdown">
            @for (r of results(); track r.variantId) {
              <button
                type="button"
                class="cb__dropdown-item"
                [class.cb__dropdown-item--added]="isAdded(r.variantId)"
                (mousedown)="addItem(r)"
              >
                <div class="cb__di-avatar">
                  @if (r.imageUrl) {
                    <img [src]="r.imageUrl" alt="">
                  } @else {
                    {{ r.productName[0].toUpperCase() }}
                  }
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

        @if (isSearching()) {
          <div class="cb__searching">Buscando…</div>
        }

        @if (noResults()) {
          <div class="cb__no-results">Sin resultados para "{{ searchQuery() }}"</div>
        }
      </div>

      <!-- Items list -->
      @if (formArray.length > 0) {
        <div class="cb__items">
          @for (ctrl of formArray.controls; track $index; let i = $index) {
            <div class="cb__item-wrapper">
              <div class="cb__item" [formGroup]="asFormGroup(ctrl)">
                <div class="cb__item-avatar">
                  {{ ctrl.get('productName')?.value?.[0]?.toUpperCase() ?? '?' }}
                </div>

                <div class="cb__item-info">
                  <span class="cb__item-product">{{ ctrl.get('productName')?.value }}</span>
                  <span class="cb__item-variant">
                    {{ ctrl.get('variantName')?.value !== ctrl.get('productName')?.value
                        ? ctrl.get('variantName')?.value : '' }}
                    @if (ctrl.get('sku')?.value) {
                      <code>{{ ctrl.get('sku')?.value }}</code>
                    }
                  </span>
                </div>

                <!-- Quantity control -->
                <div class="cb__item-qty">
                  <button type="button" class="cb__qty-btn"
                    (click)="adjustQty(i, -1)"
                    [disabled]="ctrl.get('quantity')?.value <= 1">
                    <ng-icon name="lucideMinus"></ng-icon>
                  </button>
                  <input
                    type="number"
                    class="cb__qty-input"
                    formControlName="quantity"
                    min="1"
                    step="1"
                  >
                  <button type="button" class="cb__qty-btn" (click)="adjustQty(i, 1)">
                    <ng-icon name="lucidePlus"></ng-icon>
                  </button>
                </div>

                <div class="cb__item-subtotal">
                  \${{ subtotal(ctrl) | number:'1.2-2' }}
                </div>

                <button type="button" class="cb__expand-btn" (click)="toggleExpand(i)"
                  title="Modificadores del ítem">
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
            </div>
          }
        </div>

        <!-- Total -->
        <div class="cb__total-row">
          <span class="cb__total-label">Total calculado</span>
          <span class="cb__total-value">\${{ total() | number:'1.2-2' }}</span>
        </div>
      } @else {
        <div class="cb__empty">
          <ng-icon name="lucideGift"></ng-icon>
          <p>Agrega productos para componer el combo.</p>
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

  searchQuery = signal('');
  results = signal<VariantResult[]>([]);
  isSearching = signal(false);
  noResults = signal(false);

  private expandedItems = signal<Set<number>>(new Set());

  isExpanded(i: number): boolean { return this.expandedItems().has(i); }

  toggleExpand(i: number) {
    const s = new Set(this.expandedItems());
    if (s.has(i)) s.delete(i); else s.add(i);
    this.expandedItems.set(s);
  }

  getModifiers(ctrl: AbstractControl): FormArray {
    return ctrl.get('modifierGroups') as FormArray;
  }

  // Signal that mirrors formArray.value — updated on every valueChanges
  private arrayValues = signal<any[]>([]);

  total = computed(() =>
    this.arrayValues().reduce(
      (sum, item) => sum + (Number(item.salePrice) || 0) * (Number(item.quantity) || 1),
      0
    )
  );

  private search$ = new Subject<string>();

  ngOnInit() {
    // Keep arrayValues in sync so computed() reacts to form changes
    this.arrayValues.set(this.formArray.value);
    this.formArray.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => this.arrayValues.set(v));

    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 2) {
          this.results.set([]);
          this.noResults.set(false);
          this.isSearching.set(false);
          return of([] as VariantResult[]);
        }
        this.isSearching.set(true);
        this.noResults.set(false);
        return this.productSvc.searchVariants(query, this.excludeProductId);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data: any[]) => {
        this.isSearching.set(false);
        this.results.set(data);
        this.noResults.set(data.length === 0 && this.searchQuery().length >= 2);
      },
      error: () => {
        this.isSearching.set(false);
        this.results.set([]);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  asFormGroup(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  subtotal(ctrl: AbstractControl): number {
    const price = Number(ctrl.get('salePrice')?.value) || 0;
    const qty = Number(ctrl.get('quantity')?.value) || 1;
    return price * qty;
  }

  onSearchInput(event: Event) {
    const q = (event.target as HTMLInputElement).value;
    this.searchQuery.set(q);
    this.search$.next(q);
  }

  onSearchBlur() {
    setTimeout(() => {
      this.results.set([]);
      this.noResults.set(false);
    }, 150);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.results.set([]);
    this.noResults.set(false);
    this.search$.next('');
  }

  isAdded(variantId: string): boolean {
    return this.formArray.controls.some(c => c.get('productVariantId')?.value === variantId);
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

  removeItem(index: number) {
    this.formArray.removeAt(index);
  }

  adjustQty(index: number, delta: number) {
    const ctrl = this.formArray.at(index).get('quantity');
    if (!ctrl) return;
    ctrl.setValue(Math.max(1, (ctrl.value || 1) + delta));
  }
}
