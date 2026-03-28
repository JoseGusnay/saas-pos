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
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideSearch, lucideX, lucideLoader, lucidePackage, lucideAlertTriangle, lucideLayoutGrid, lucideTag, lucideScanBarcode, lucidePlus, lucideBan })],
  styleUrls: ['./product-catalog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pos-catalog">
      <!-- ── Search bar ────────────────────────────────────────────── -->
      <div class="pos-catalog__search">
        <button
          class="pos-catalog__search-mode"
          [class.pos-catalog__search-mode--barcode]="searchMode() === 'barcode'"
          type="button"
          title="Cambiar modo de búsqueda (F5)"
          (click)="toggleSearchMode()"
        >
          @if (searchMode() === 'barcode') {
            <ng-icon name="lucideScanBarcode" size="18" />
          } @else {
            <ng-icon name="lucideSearch" size="18" />
          }
        </button>
        <input
          #searchInput
          type="text"
          class="pos-catalog__search-input"
          [placeholder]="searchMode() === 'barcode' ? 'Escanear código de barras...' : 'Buscar producto...'"
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

      <!-- ── Category tabs (horizontal) ────────────────────────────── -->
      @if (categoriesLoading()) {
        <div class="pos-catalog__tabs">
          @for (i of catSkeletons; track $index) {
            <div class="pos-catalog__tab-skeleton"></div>
          }
        </div>
      } @else if (categories().length > 0) {
        <div class="pos-catalog__tabs">
          <button
            class="pos-catalog__tab"
            [class.pos-catalog__tab--active]="selectedCategoryId() === null"
            (click)="selectCategory(null)"
          >Todos</button>
          @for (cat of categories(); track cat.id) {
            <button
              class="pos-catalog__tab"
              [class.pos-catalog__tab--active]="selectedCategoryId() === cat.id"
              (click)="selectCategory(cat.id)"
            >{{ cat.name }}</button>
          }
        </div>
      }

      <!-- ── Loading: skeleton tiles ───────────────────────────────── -->
      @if (loading()) {
        <div class="pos-catalog__grid">
          @for (i of skeletons; track $index) {
            <div class="pos-catalog__skeleton"></div>
          }
        </div>
      }

      <!-- ── Product grid ──────────────────────────────────────────── -->
      @if (!loading() && catalogProducts().length > 0) {
        <div class="pos-catalog__grid">
          @for (product of catalogProducts(); track product.id) {
            <button
              type="button"
              class="pos-catalog__tile"
              [class.pos-catalog__tile--out]="product.outOfStock"
              [disabled]="product.outOfStock"
              (click)="onProductClick(product)"
            >
              <div class="pos-catalog__tile-visual" [style.--tile-accent]="categoryColor(product.categoryId)">
                @if (product.imageUrl) {
                  <img class="pos-catalog__tile-img" [src]="product.imageUrl" [alt]="product.name" />
                } @else {
                  <ng-icon name="lucidePackage" class="pos-catalog__tile-placeholder" />
                }
                @if (product.outOfStock) {
                  <span class="pos-catalog__tile-badge pos-catalog__tile-badge--out">Sin stock</span>
                } @else if (product.lowStock) {
                  <span class="pos-catalog__tile-badge pos-catalog__tile-badge--low">Poco stock</span>
                }
              </div>
              <div class="pos-catalog__tile-info">
                <span class="pos-catalog__tile-name">{{ product.name }}</span>
                <div class="pos-catalog__tile-footer">
                  <span class="pos-catalog__tile-price">
                    {{ '$' + (product.variant.salePrice | number: '1.2-2') }}
                  </span>
                  @if (product.variants.length > 1) {
                    <span class="pos-catalog__tile-variants">{{ product.variants.length }} opc.</span>
                  }
                </div>
              </div>
            </button>
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

  // ── Category color palette ────────────────────────────────────────────────
  private readonly palette = [
    '#4f6d7a', '#6b8f71', '#8b6f47', '#7a5c8a', '#5a7d9a',
    '#8a6d5c', '#5c8a7a', '#7d6b8a', '#6a8a5c', '#8a5c6d',
    '#5c6d8a', '#7a8a5c',
  ];

  private readonly colorCache = new Map<string, string>();

  categoryColor(categoryId: string): string {
    if (!categoryId) return this.palette[0];
    let color = this.colorCache.get(categoryId);
    if (!color) {
      let hash = 0;
      for (let i = 0; i < categoryId.length; i++) {
        hash = ((hash << 5) - hash + categoryId.charCodeAt(i)) | 0;
      }
      color = this.palette[Math.abs(hash) % this.palette.length];
      this.colorCache.set(categoryId, color);
    }
    return color;
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
    const v0 = variants[0];
    const isCombo = p.productType === 'COMBO';
    const trackableVariants = isCombo ? [] : variants.filter((v) => v.stockTrackable);
    const trackable = trackableVariants.length > 0;
    const totalAvailable = trackableVariants.reduce((sum, v) => sum + v.availableStock, 0);

    return {
      id: p.productId,
      name: p.productName,
      type: p.productType,
      comboPriceMode: p.comboPriceMode ?? null,
      imageUrl: p.imageUrl ?? undefined,
      categoryId: p.categoryId,
      categoryName: p.categoryName ?? undefined,
      hasModifiers: !!(p.modifierGroups && p.modifierGroups.length > 0),
      isCombo,
      variant: v0,
      variants,
      comboItems: p.comboItems,
      modifierGroups: p.modifierGroups,
      stockTrackable: trackable,
      outOfStock: trackable && totalAvailable <= 0,
      lowStock: trackable && totalAvailable > 0 && totalAvailable <= 5,
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
