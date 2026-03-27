import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  Output,
  EventEmitter,
  OnDestroy,
  effect,
  input,
  untracked,
  ViewChild,
  ElementRef,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSearch,
  lucideX,
  lucideLoader,
  lucidePackage,
  lucideAlertTriangle,
  lucideLayoutGrid,
  lucideTag,
  lucideScanBarcode,
  lucidePlus,
  lucideBan,
  lucideInfo,
} from '@ng-icons/lucide';
import { Subject, debounceTime, takeUntil, finalize } from 'rxjs';

import { PosCatalogService } from '../../services/pos-catalog.service';
import {
  PosCatalogProduct,
  PosCatalogCategory,
  PosCatalogApiProduct,
  PosCatalogApiVariant,
  PosCatalogVariant,
} from '../../models/pos.models';

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, CurrencyPipe],
  providers: [provideIcons({ lucideSearch, lucideX, lucideLoader, lucidePackage, lucideAlertTriangle, lucideLayoutGrid, lucideTag, lucideScanBarcode, lucidePlus, lucideBan, lucideInfo })],
  styleUrls: ['./product-catalog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pos-catalog" [class.pos-catalog--no-sidebar]="categories().length === 0 && !categoriesLoading()">
      <!-- ── Category sidebar ──────────────────────────────────────── -->
      @if (categoriesLoading()) {
        <aside class="pos-catalog__sidebar">
          @for (i of catSkeletons; track $index) {
            <div class="pos-catalog__cat-skeleton">
              <div class="pos-catalog__cat-skeleton-icon"></div>
              <div class="pos-catalog__cat-skeleton-label"></div>
            </div>
          }
        </aside>
      } @else if (categories().length > 0) {
        <aside class="pos-catalog__sidebar">
          <button
            class="pos-catalog__cat-btn"
            [class.pos-catalog__cat-btn--active]="selectedCategoryId() === null"
            (click)="selectCategory(null)"
          >
            <ng-icon name="lucideLayoutGrid" class="pos-catalog__cat-icon" />
            <span class="pos-catalog__cat-label">Todos</span>
          </button>
          @for (cat of categories(); track cat.id) {
            <button
              class="pos-catalog__cat-btn"
              [class.pos-catalog__cat-btn--active]="selectedCategoryId() === cat.id"
              (click)="selectCategory(cat.id)"
            >
              <ng-icon name="lucideTag" class="pos-catalog__cat-icon" />
              <span class="pos-catalog__cat-label">{{ cat.name }}</span>
            </button>
          }
        </aside>
      }

      <!-- ── Main content ────────────────────────────────────────────── -->
      <div class="pos-catalog__main">
        <!-- Search bar -->
        <div class="pos-catalog__search">
          <button
            class="pos-catalog__search-mode"
            [class.pos-catalog__search-mode--barcode]="searchMode() === 'barcode'"
            type="button"
            title="Cambiar modo de búsqueda (F5)"
            (click)="toggleSearchMode()"
          >
            @if (searchMode() === 'barcode') {
              <ng-icon name="lucideScanBarcode" size="20" />
            } @else {
              <ng-icon name="lucideSearch" size="20" />
            }
          </button>
          <input
            #searchInput
            type="text"
            class="pos-catalog__search-input"
            [placeholder]="searchMode() === 'barcode' ? 'Escanear código de barras...' : 'Buscar por nombre...'"
            [ngModel]="searchTerm()"
            (ngModelChange)="onSearchChange($event)"
            (keydown.enter)="onSearchEnter()"
          />
          <div class="pos-catalog__search-hints">
            @if (searchTerm()) {
              <button class="pos-catalog__search-clear" (click)="clearSearch()">
                <ng-icon name="lucideX" size="16" />
              </button>
            } @else {
              <kbd class="pos-catalog__kbd">F4</kbd>
              <kbd class="pos-catalog__kbd">F5: {{ searchMode() === 'barcode' ? 'MANUAL' : 'ESCÁNER' }}</kbd>
            }
          </div>
        </div>

        <!-- ── Loading: skeleton cards ─────────────────────────────────── -->
        @if (loading()) {
          <div class="pos-catalog__grid">
            @for (i of skeletons; track $index) {
              <div class="pos-catalog__skeleton">
                <div class="pos-catalog__skeleton-image">
                  <ng-icon name="lucidePackage" size="36" />
                </div>
                <div class="pos-catalog__skeleton-body">
                  <div class="pos-catalog__skeleton-line pos-catalog__skeleton-line--sm"></div>
                  <div class="pos-catalog__skeleton-line pos-catalog__skeleton-line--full"></div>
                  <div class="pos-catalog__skeleton-bottom">
                    <div class="pos-catalog__skeleton-line pos-catalog__skeleton-line--price"></div>
                    <div class="pos-catalog__skeleton-btn"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- ── Product grid ────────────────────────────────────────────── -->
        @if (!loading() && catalogProducts().length > 0) {
          <div class="pos-catalog__grid">
            @for (product of catalogProducts(); track product.id) {
              <div
                class="pos-catalog__card"
                [class.pos-catalog__card--out-of-stock]="isOutOfStock(product)"
                (click)="onProductClick(product)"
              >
                <!-- Image zone -->
                <div class="pos-catalog__card-image">
                  @if (product.imageUrl) {
                    <img [src]="product.imageUrl" [alt]="product.name" />
                  } @else {
                    <ng-icon name="lucidePackage" class="pos-catalog__card-placeholder" />
                  }

                  <!-- Stock badge OR out-of-stock overlay -->
                  @if (isOutOfStock(product)) {
                    <div class="pos-catalog__card-overlay">
                      <span class="pos-catalog__card-overlay-label">SIN STOCK</span>
                    </div>
                  } @else if (isStockTrackable(product)) {
                    <div class="pos-catalog__card-stock">
                      <span
                        class="pos-catalog__card-stock-badge"
                        [class.pos-catalog__card-stock-badge--low]="isLowStock(product)"
                      >
                        <ng-icon [name]="isLowStock(product) ? 'lucideAlertTriangle' : 'lucidePackage'" size="12" />
                        {{ product.variant.availableStock }} EN STOCK
                      </span>
                    </div>
                  }
                </div>

                <!-- Body -->
                <div class="pos-catalog__card-body">
                  <div>
                    <div class="pos-catalog__card-top">
                      <span class="pos-catalog__card-sku">
                        SKU: {{ product.variant.sku || '—' }}
                      </span>
                      @if (!isOutOfStock(product)) {
                        <ng-icon name="lucideInfo" class="pos-catalog__card-info" size="18" />
                      }
                    </div>
                    <h3 class="pos-catalog__card-name">{{ product.name }}</h3>
                  </div>

                  <!-- Price + action row -->
                  <div class="pos-catalog__card-bottom">
                    <div class="pos-catalog__card-price-block">
                      @if (!isOutOfStock(product)) {
                        <span class="pos-catalog__card-price-label">Precio Total</span>
                      }
                      <div class="pos-catalog__card-price">
                        <span class="pos-catalog__card-currency">$</span>
                        <span
                          class="pos-catalog__card-amount"
                          [class.pos-catalog__card-amount--muted]="isOutOfStock(product)"
                        >
                          {{ product.variant.salePrice | number: '1.2-2' }}
                        </span>
                      </div>
                    </div>

                    @if (isOutOfStock(product)) {
                      <button class="pos-catalog__card-add pos-catalog__card-add--disabled" type="button" disabled>
                        <ng-icon name="lucideBan" size="20" />
                      </button>
                    } @else {
                      <button
                        class="pos-catalog__card-add"
                        [class.pos-catalog__card-add--primary]="!isLowStock(product)"
                        type="button"
                      >
                        <ng-icon name="lucidePlus" size="20" />
                      </button>
                    }
                  </div>

                  @if (product.variants.length > 1) {
                    <span class="pos-catalog__card-variants">
                      {{ product.variants.length }} variantes
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Empty state -->
        @if (!loading() && catalogProducts().length === 0) {
          <div class="pos-catalog__empty">
            <ng-icon name="lucideSearch" class="pos-catalog__empty-icon" />
            <p class="pos-catalog__empty-text">
              @if (searchTerm()) {
                No se encontraron productos para "{{ searchTerm() }}"
              } @else {
                No hay productos disponibles
              }
            </p>
          </div>
        }

        <!-- Error state -->
        @if (errorMessage()) {
          <div class="pos-catalog__error">
            <ng-icon name="lucideAlertTriangle" />
            <span>{{ errorMessage() }}</span>
            <button class="pos-catalog__error-retry" (click)="loadCatalog()">Reintentar</button>
          </div>
        }
      </div>
    </div>
  `,
})
export class ProductCatalogComponent implements OnDestroy, AfterViewInit {
  readonly branchId = input<string | null>(null);
  readonly warehouseId = input<string | null>(null);

  @Output() productSelected = new EventEmitter<PosCatalogProduct>();

  private readonly catalogService = inject(PosCatalogService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  // ── State ──────────────────────────────────────────────────────────────────
  readonly searchTerm = signal('');
  readonly searchMode = signal<'barcode' | 'manual'>('barcode');
  readonly selectedCategoryId = signal<string | null>(null);
  readonly categories = signal<PosCatalogCategory[]>([]);
  readonly catalogProducts = signal<PosCatalogProduct[]>([]);
  readonly loading = signal(true);
  readonly categoriesLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly skeletons = Array(8).fill(0);
  readonly catSkeletons = Array(6).fill(0);
  private categoriesLoaded = false;

  constructor() {
    // Debounce search input
    this.searchSubject$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.loadCatalog();
      });

    // React to input signal changes (branchId / warehouseId)
    effect(() => {
      const b = this.branchId();
      const w = this.warehouseId();
      if (b && w) {
        untracked(() => {
          if (!this.categoriesLoaded) {
            this.loadCategories();
          }
          this.loadCatalog();
        });
      }
    });
  }

  ngAfterViewInit(): void {
    this.focusSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  resetSearch(): void {
    this.searchTerm.set('');
    this.selectedCategoryId.set(null);
    this.focusSearch();
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  onSearchChange(term: string): void {
    if (this.searchMode() === 'barcode') {
      // In barcode mode, just accumulate — search fires on Enter
      this.searchTerm.set(term);
    } else {
      this.searchSubject$.next(term);
    }
  }

  onSearchEnter(): void {
    const term = this.searchTerm()?.trim();
    if (!term) return;

    if (this.searchMode() === 'barcode') {
      this.loadCatalogByBarcode(term);
    } else {
      this.loadCatalog();
    }
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchSubject$.next('');
    this.loadCatalog();
  }

  toggleSearchMode(): void {
    this.searchMode.set(this.searchMode() === 'barcode' ? 'manual' : 'barcode');
    this.focusSearch();
  }

  focusSearch(): void {
    setTimeout(() => {
      this.searchInputRef?.nativeElement?.focus();
      this.searchInputRef?.nativeElement?.select();
    });
  }

  @HostListener('document:keydown', ['$event'])
  onCatalogKeydown(e: KeyboardEvent): void {
    if (e.key === 'F4') {
      e.preventDefault();
      this.focusSearch();
    } else if (e.key === 'F5') {
      e.preventDefault();
      this.toggleSearchMode();
    }
  }

  selectCategory(categoryId: string | null): void {
    this.selectedCategoryId.set(categoryId);
    this.loadCatalog();
  }

  onProductClick(product: PosCatalogProduct): void {
    if (this.isOutOfStock(product)) return;
    this.productSelected.emit(product);
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  private loadCategories(): void {
    const branchId = this.branchId();
    const warehouseId = this.warehouseId();
    if (!branchId || !warehouseId) return;

    this.categoriesLoading.set(true);
    this.catalogService
      .categories(branchId, warehouseId)
      .pipe(
        finalize(() => this.categoriesLoading.set(false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (cats) => {
          this.categories.set(cats);
          this.categoriesLoaded = true;
        },
      });
  }

  private loadCatalogByBarcode(barcode: string): void {
    const branchId = this.branchId();
    const warehouseId = this.warehouseId();
    if (!branchId || !warehouseId) return;

    this.searchTerm.set('');
    this.focusSearch();

    this.catalogService
      .catalog({ branchId, warehouseId, barcode, limit: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const products = res.data.map((p) => this.mapApiProduct(p));
          if (products.length === 1) {
            this.productSelected.emit(products[0]);
          }
        },
      });
  }

  loadCatalog(): void {
    const branchId = this.branchId();
    const warehouseId = this.warehouseId();
    if (!branchId || !warehouseId) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.catalogService
      .catalog({
        branchId,
        warehouseId,
        categoryId: this.selectedCategoryId() ?? undefined,
        search: this.searchTerm() || undefined,
        page: 1,
        limit: 12,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          const products = res.data.map((p) => this.mapApiProduct(p));
          this.catalogProducts.set(products);
          this.checkBarcodeMatch(products);
        },
        error: () => {
          this.errorMessage.set('Error al cargar los productos. Intente de nuevo.');
        },
      });
  }

  // ── Stock helpers ──────────────────────────────────────────────────────────
  isStockTrackable(product: PosCatalogProduct): boolean {
    return product.variant.stockTrackable && product.type !== 'COMBO';
  }

  isOutOfStock(product: PosCatalogProduct): boolean {
    return this.isStockTrackable(product) && product.variant.availableStock <= 0;
  }

  isLowStock(product: PosCatalogProduct): boolean {
    return this.isStockTrackable(product) && product.variant.availableStock > 0 && product.variant.availableStock <= 5;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  productTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      PHYSICAL: 'Fisico',
      SERVICE: 'Servicio',
      COMBO: 'Combo',
      RAW_MATERIAL: 'Materia prima',
    };
    return labels[type] || type;
  }

  private checkBarcodeMatch(products: PosCatalogProduct[]): void {
    const term = this.searchTerm()?.trim();
    if (!term) return;

    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.barcode && variant.barcode === term) {
          const matched = { ...product, variant };
          this.productSelected.emit(matched);
          this.searchTerm.set('');
          return;
        }
      }
    }
  }

  private mapApiProduct(p: PosCatalogApiProduct): PosCatalogProduct {
    const variants: PosCatalogVariant[] = p.variants.map((v) => this.mapApiVariant(v));

    return {
      id: p.productId,
      name: p.productName,
      type: p.productType,
      comboPriceMode: p.comboPriceMode ?? null,
      imageUrl: p.imageUrl ?? undefined,
      categoryId: p.categoryId,
      categoryName: p.categoryName ?? undefined,
      hasModifiers: !!(p.modifierGroups && p.modifierGroups.length > 0),
      isCombo: p.productType === 'COMBO',
      variant: variants[0],
      variants,
      comboItems: p.comboItems,
      modifierGroups: p.modifierGroups,
    };
  }

  private mapApiVariant(v: PosCatalogApiVariant): PosCatalogVariant {
    return {
      id: v.variantId,
      name: v.variantName,
      sku: v.sku ?? '',
      barcode: v.barcode ?? undefined,
      salePrice: v.salePrice,
      stock: v.stock,
      availableStock: v.availableStock,
      stockTrackable: v.stockTrackable,
      trackLots: v.trackLots,
      durationMinutes: v.durationMinutes ?? undefined,
      imageUrl: v.imageUrl ?? undefined,
      taxes: v.taxes,
    };
  }
}
