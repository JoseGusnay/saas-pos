import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnDestroy,
  HostListener,
  ViewChild,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideReceipt,
  lucideCheck,
  lucideArrowLeft,
  lucideMaximize,
  lucideTrash2,
  lucideLayoutGrid,
  lucideShoppingCart,
  lucideUserPlus,
} from '@ng-icons/lucide';
import { Subject, debounceTime, distinctUntilChanged, filter, finalize, switchMap, takeUntil } from 'rxjs';

import { ProductCatalogComponent } from '../../components/product-catalog/product-catalog.component';
import { CartPanelComponent } from '../../components/cart-panel/cart-panel.component';
import { PaymentDialogComponent } from '../../components/payment-dialog/payment-dialog.component';
import { ModifierDialogComponent } from '../../components/modifier-dialog/modifier-dialog.component';
import { ComboDialogComponent } from '../../components/combo-dialog/combo-dialog.component';
import { SaleCompleteDialogComponent } from '../../components/sale-complete-dialog/sale-complete-dialog.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal';

import { PosCartService } from '../../services/pos-cart.service';
import { SaleService } from '../../../../core/services/sale.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CustomerService } from '../../../../core/services/customer.service';
import { ToastService } from '../../../../core/services/toast.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';

import { PosCatalogProduct, PosCatalogVariant } from '../../models/pos.models';
import {
  CreateSalePayload,
  CreateSalePaymentPayload,
  Sale,
  SaleModifierSnapshot,
} from '../../../../core/models/sale.models';
import { ModifierGroup, ComboItem } from '../../../inventory/models/product.model';
import { ComboDialogResult } from '../../components/combo-dialog/combo-dialog.component';
import { Customer, CUSTOMER_ID_TYPES } from '../../../../core/models/customer.models';
import { Warehouse } from '../../../../core/models/warehouse.models';

@Component({
  selector: 'app-pos-terminal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    NgIconComponent,
    CurrencyPipe,
    ProductCatalogComponent,
    CartPanelComponent,
    PaymentDialogComponent,
    ModifierDialogComponent,
    ComboDialogComponent,
    SaleCompleteDialogComponent,
    ModalComponent,
  ],
  providers: [provideIcons({ lucideReceipt, lucideCheck, lucideArrowLeft, lucideMaximize, lucideTrash2, lucideLayoutGrid, lucideShoppingCart, lucideUserPlus })],
  styleUrl: './pos-terminal.component.scss',
  template: `
    <!-- ── Top Bar ────────────────────────────────────────────────────── -->
    <header class="pos-header">
      <div class="pos-header__left">
        <button class="pos-header__back" (click)="goToDashboard()">
          <ng-icon name="lucideArrowLeft" size="18" />
        </button>
        <h1 class="pos-header__title">Punto de Venta</h1>
      </div>

      <div class="pos-header__center">
        @if (activeBranchName()) {
          <span class="pos-header__branch">{{ activeBranchName() }}</span>
        }
      </div>

      <div class="pos-header__right">
        <button class="pos-header__action" (click)="toggleFullscreen()" title="Pantalla completa">
          <ng-icon name="lucideMaximize" size="16" />
        </button>
      </div>
    </header>

    <!-- ── Main POS ───────────────────────────────────────────────────── -->
    <div class="pos-terminal">
      <section class="pos-terminal__catalog" [class.pos-terminal__panel--hidden]="mobileView() === 'cart'">

        <!-- Catalog (hidden when customizing, never destroyed) -->
        <app-product-catalog
          [branchId]="activeBranchId()"
          [warehouseId]="defaultWarehouseId()"
          (productSelected)="onProductSelected($event)"
          [hidden]="isCustomizing()"
        />

        <!-- Inline customization panel -->
        @if (isCustomizing()) {
          <div class="pos-customize">
            <header class="pos-customize__header">
              <button class="pos-customize__back" type="button" (click)="cancelEdit()">
                <ng-icon name="lucideArrowLeft" size="16" />
                <span>Catálogo</span>
              </button>
              <span class="pos-customize__title">{{ pendingProductName() }}</span>
            </header>

            <div class="pos-customize__body">
              <!-- Variant selector -->
              @if (showVariantDialog()) {
                <div class="pos-customize__section">
                  <p class="pos-customize__label">Selecciona una variante</p>
                  <div class="variant-selector">
                    @for (v of pendingVariantOptions(); track v.id) {
                      <button
                        class="variant-selector__option"
                        [class.variant-selector__option--out]="v.stockTrackable && v.availableStock <= 0"
                        [disabled]="v.stockTrackable && v.availableStock <= 0"
                        (click)="onVariantChosen(v)"
                      >
                        @if (v.imageUrl) {
                          <img class="variant-selector__image" [src]="v.imageUrl" [alt]="v.name" />
                        }
                        <div class="variant-selector__info">
                          <span class="variant-selector__name">{{ v.name }}</span>
                          @if (v.sku) {
                            <span class="variant-selector__sku">{{ v.sku }}</span>
                          }
                          @if (v.stockTrackable) {
                            <span
                              class="variant-selector__stock"
                              [class.variant-selector__stock--low]="v.availableStock > 0 && v.availableStock <= 5"
                              [class.variant-selector__stock--out]="v.availableStock <= 0"
                            >
                              @if (v.availableStock <= 0) { Sin stock } @else { {{ v.availableStock }} en stock }
                            </span>
                          }
                        </div>
                        <span class="variant-selector__price">
                          {{ v.salePrice | currency: 'USD':'symbol':'1.2-2' }}
                        </span>
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- Combo dialog -->
              @if (showComboDialog()) {
                <app-combo-dialog
                  [comboItems]="pendingComboItems()"
                  [productName]="pendingProductName()"
                  [comboPriceMode]="pendingComboPriceMode()"
                  [basePrice]="pendingComboBasePrice()"
                  [preselectedChoices]="pendingPreselectedChoices()"
                  [preselectedModifiers]="pendingPreselectedComboModifiers()"
                  (confirm)="onComboConfirmed($event)"
                  (cancel)="cancelEdit()"
                />
              }

              <!-- Modifier dialog -->
              @if (showModifierDialog()) {
                <app-modifier-dialog
                  [modifierGroups]="pendingModifierGroups()"
                  [productName]="pendingProductName()"
                  [preselected]="pendingPreselectedModifiers()"
                  (confirm)="onModifiersConfirmed($event)"
                  (cancel)="cancelEdit()"
                />
              }
            </div>
          </div>
        }

      </section>
      <section class="pos-terminal__cart" [class.pos-terminal__panel--hidden]="mobileView() === 'catalog'">
        <app-cart-panel
          (pay)="openPaymentDialog()"
          (selectCustomer)="openCustomerSearch()"
          (editItem)="onEditItem($event)"
        />
      </section>
    </div>

    <!-- ── Mobile Bottom Nav ─────────────────────────────────────────── -->
    <nav class="pos-bottom-nav">
      <button
        class="pos-bottom-nav__tab"
        [class.pos-bottom-nav__tab--active]="mobileView() === 'catalog'"
        (click)="mobileView.set('catalog')"
      >
        <ng-icon name="lucideLayoutGrid" size="20" />
        <span>Catálogo</span>
      </button>
      <button
        class="pos-bottom-nav__tab"
        [class.pos-bottom-nav__tab--active]="mobileView() === 'cart'"
        (click)="mobileView.set('cart')"
      >
        <ng-icon name="lucideShoppingCart" size="20" />
        @if (cart.totals().itemCount > 0) {
          <span class="pos-bottom-nav__total">{{ cart.totals().total | currency: 'USD':'symbol':'1.2-2' }}</span>
          <span class="pos-bottom-nav__badge">{{ cart.totals().itemCount }}</span>
        } @else {
          <span>Carrito</span>
        }
      </button>
    </nav>

    <!-- ── Payment Dialog ───────────────────────────────────────────────── -->
    <app-modal
      [isOpen]="showPaymentDialog()"
      title="Procesar pago"
      size="xl"
      [allowClose]="!isProcessingSale()"
      (close)="showPaymentDialog.set(false)"
    >
      <div modalBody>
      @if (showPaymentDialog()) {
        <app-payment-dialog
          [isProcessing]="isProcessingSale()"
          (confirm)="onPaymentConfirmed($event)"
          (cancel)="showPaymentDialog.set(false)"
        />
      }
      </div>
    </app-modal>

    <!-- ── Sale Complete Dialog ──────────────────────────────────────────── -->
    <app-modal
      [isOpen]="showSaleCompleteDialog()"
      title="Venta completada"
      size="md"
      (close)="onNewSale()"
    >
      <div modalBody>
      @if (showSaleCompleteDialog()) {
        <app-sale-complete-dialog
          [sale]="completedSale()"
          (newSale)="onNewSale()"
          (printReceipt)="onPrintReceipt()"
        />
      }
      </div>
    </app-modal>

    <!-- ── Customer Search Dialog ────────────────────────────────────────── -->
    <app-modal
      [isOpen]="showCustomerDialog()"
      title="Buscar cliente"
      size="sm"
      (close)="showCustomerDialog.set(false)"
    >
      <div modalBody>
      @if (showCustomerDialog()) {
        <div class="customer-search">
          <input
            class="customer-search__input"
            type="text"
            placeholder="Nombre, cédula o RUC..."
            [value]="customerSearchQuery()"
            (input)="onCustomerSearch($event)"
            autofocus
          />
          @if (customerSearchLoading()) {
            <div class="customer-search__loading">Buscando...</div>
          }
          <div class="customer-search__results">
            @for (c of customerSearchResults(); track c.id) {
              <button class="customer-search__item" (click)="selectCustomer(c)">
                <span class="customer-search__name">{{ c.name }}</span>
                <span class="customer-search__id">{{ c.identificacion }}</span>
              </button>
            }
            @if (!customerSearchLoading() && customerSearchQuery().length >= 2 && customerSearchResults().length === 0) {
              <div class="customer-search__empty">Sin resultados</div>
            }
          </div>

          <!-- Quick create toggle -->
          @if (!showCreateCustomer()) {
            <button class="customer-search__create-toggle" (click)="showCreateCustomer.set(true)">
              <ng-icon name="lucideUserPlus" size="14" />
              Crear cliente nuevo
            </button>
          } @else {
            <div class="customer-search__create-form">
              <span class="customer-search__create-title">Nuevo cliente</span>
              <input
                class="customer-search__input"
                type="text"
                placeholder="Nombre completo"
                [ngModel]="newCustomerName()"
                (ngModelChange)="newCustomerName.set($event)"
              />
              <div class="customer-search__create-row">
                <select
                  class="customer-search__select"
                  [ngModel]="newCustomerIdType()"
                  (ngModelChange)="newCustomerIdType.set($event)"
                >
                  @for (type of customerIdTypes; track type.value) {
                    <option [value]="type.value">{{ type.label }}</option>
                  }
                </select>
                <input
                  class="customer-search__input"
                  type="text"
                  placeholder="Número de identificación"
                  [ngModel]="newCustomerIdNumber()"
                  (ngModelChange)="newCustomerIdNumber.set($event)"
                />
              </div>
              <div class="customer-search__create-actions">
                <button
                  class="customer-search__create-cancel"
                  (click)="showCreateCustomer.set(false)"
                >
                  Cancelar
                </button>
                <button
                  class="customer-search__create-save"
                  [disabled]="!newCustomerName() || !newCustomerIdNumber() || creatingCustomer()"
                  (click)="createAndSelectCustomer()"
                >
                  @if (creatingCustomer()) {
                    Creando...
                  } @else {
                    Crear y seleccionar
                  }
                </button>
              </div>
            </div>
          }

          @if (cart.customer()) {
            <button class="customer-search__clear" (click)="clearCustomer()">
              Usar Consumidor Final
            </button>
          }
        </div>
      }
      </div>
    </app-modal>
  `,
})
export class PosTerminalComponent implements OnDestroy {
  @ViewChild(ProductCatalogComponent) catalogRef!: ProductCatalogComponent;

  readonly cart = inject(PosCartService);
  private readonly saleService = inject(SaleService);
  private readonly authService = inject(AuthService);
  private readonly customerService = inject(CustomerService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // ── Mobile view toggle ───────────────────────────────────────────────────
  readonly mobileView = signal<'catalog' | 'cart'>('catalog');

  /** True when any customization dialog is active (renders inline instead of catalog) */
  readonly isCustomizing = computed(() =>
    this.showVariantDialog() || this.showModifierDialog() || this.showComboDialog()
  );

  // ── Header info ──────────────────────────────────────────────────────────
  readonly activeBranchName = signal('');
  readonly activeBranchId = signal<string | null>(null);
  readonly defaultWarehouseId = signal<string | null>(null);

  // ── Dialog visibility ──────────────────────────────────────────────────

  readonly showVariantDialog = signal(false);
  readonly showModifierDialog = signal(false);
  readonly showComboDialog = signal(false);
  readonly showPaymentDialog = signal(false);
  readonly showSaleCompleteDialog = signal(false);
  readonly showCustomerDialog = signal(false);

  // ── Pending product state (shared across dialogs) ──────────────────────

  readonly pendingProductName = signal('');
  readonly pendingModifierGroups = signal<ModifierGroup[]>([]);
  readonly pendingComboItems = signal<ComboItem[]>([]);
  readonly pendingComboPriceMode = signal<'FIXED' | 'CALCULATED' | null>('FIXED');
  readonly pendingComboBasePrice = signal(0);
  readonly pendingVariantOptions = signal<PosCatalogVariant[]>([]);
  readonly pendingPreselectedModifiers = signal<SaleModifierSnapshot[]>([]);
  readonly pendingPreselectedChoices = signal<{ comboItemId: string; variantId: string }[]>([]);
  readonly pendingPreselectedComboModifiers = signal<SaleModifierSnapshot[]>([]);

  private pendingProduct: PosCatalogProduct | null = null;
  /** Accumulated chosen variants from combo dialog (kept for combo+modifier flow) */
  private pendingChosenVariants: { comboItemId: string; variantId: string }[] = [];
  /** Accumulated modifiers from combo item-level selections */
  private pendingComboModifiers: SaleModifierSnapshot[] = [];
  /** For CALCULATED combos, the computed price from the combo dialog */
  private pendingComboComputedPrice: number | null = null;
  /** UID of cart item being edited (null = adding new) */
  private editingItemUid: string | null = null;

  // ── Sale processing ────────────────────────────────────────────────────

  readonly isProcessingSale = signal(false);
  readonly completedSale = signal<Sale | null>(null);

  // ── Customer search ────────────────────────────────────────────────────

  readonly customerSearchQuery = signal('');
  readonly customerSearchResults = signal<Customer[]>([]);
  readonly customerSearchLoading = signal(false);
  private readonly customerSearch$ = new Subject<string>();

  // ── Quick customer create ────────────────────────────────────────────
  readonly showCreateCustomer = signal(false);
  readonly newCustomerName = signal('');
  readonly newCustomerIdType = signal('05'); // Cédula by default
  readonly newCustomerIdNumber = signal('');
  readonly creatingCustomer = signal(false);
  readonly customerIdTypes = CUSTOMER_ID_TYPES.filter(t => t.value !== '07'); // Exclude "Consumidor Final"

  // ── Warehouse ──────────────────────────────────────────────────────────

  private defaultWarehouse: Warehouse | null = null;

  constructor() {
    this.loadDefaultWarehouse();
    this.loadBranchInfo();
    this.setupCustomerSearch();
  }

  private setupCustomerSearch(): void {
    this.customerSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter(q => q.length >= 2),
        switchMap(q => {
          this.customerSearchLoading.set(true);
          return this.customerService.search(q, 10);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (results) => {
          this.customerSearchResults.set(results);
          this.customerSearchLoading.set(false);
        },
        error: () => this.customerSearchLoading.set(false),
      });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRODUCT SELECTED — entry point for all product types
  // ═══════════════════════════════════════════════════════════════════════

  onProductSelected(product: PosCatalogProduct): void {
    this.pendingProduct = product;
    this.pendingChosenVariants = [];
    this.pendingComboModifiers = [];
    this.pendingComboComputedPrice = null;

    this.routeProductFlow(product);
  }

  /**
   * Central routing: decides which dialog to show based on product type.
   * Flow order:
   *   1. COMBO → combo dialog
   *   2. Multi-variant (non-combo) → variant selector
   *   3. Modifiers → modifier dialog
   *   4. Simple / SERVICE → add directly
   */
  private routeProductFlow(product: PosCatalogProduct): void {
    // Step 1: COMBO products → combo dialog first
    if (product.type === 'COMBO' && product.comboItems?.length) {
      this.pendingProductName.set(product.name);
      this.pendingComboItems.set(product.comboItems);
      this.pendingComboPriceMode.set(product.comboPriceMode ?? 'FIXED');
      this.pendingComboBasePrice.set(product.variant.salePrice);
      this.showComboDialog.set(true);
      return;
    }

    // Step 2: Multi-variant (non-combo) → variant selector
    if (product.variants.length > 1) {
      this.pendingProductName.set(product.name);
      this.pendingVariantOptions.set(product.variants);
      this.showVariantDialog.set(true);
      return;
    }

    // Step 3: Has modifiers → modifier dialog
    if (product.hasModifiers && product.modifierGroups?.length) {
      this.pendingProductName.set(product.name);
      this.pendingModifierGroups.set(product.modifierGroups);
      this.showModifierDialog.set(true);
      return;
    }

    // Step 4: Simple product → add directly
    this.addToCart(product, product.variant, [], []);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VARIANT SELECTOR — for multi-variant non-combo products
  // ═══════════════════════════════════════════════════════════════════════

  onVariantChosen(variant: PosCatalogVariant): void {
    this.showVariantDialog.set(false);
    const product = this.pendingProduct;
    if (!product) return;

    product.variant = variant;

    // After choosing variant, check if product has modifiers
    if (product.hasModifiers && product.modifierGroups?.length) {
      this.pendingProductName.set(product.name);
      this.pendingModifierGroups.set(product.modifierGroups);
      this.showModifierDialog.set(true);
      return;
    }

    this.addToCart(product, variant, [], []);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COMBO DIALOG — for COMBO products
  // ═══════════════════════════════════════════════════════════════════════

  onComboConfirmed(result: ComboDialogResult): void {
    this.showComboDialog.set(false);
    const product = this.pendingProduct;
    if (!product) return;

    this.pendingChosenVariants = result.chosenVariants;

    // Calculate the actual price for CALCULATED combos
    if (product.comboPriceMode === 'CALCULATED') {
      this.pendingComboComputedPrice = this.calculateComboPrice(
        product.variant.salePrice,
        result.chosenVariants,
        this.pendingComboItems(),
      );
    }

    // Compute modifier total from combo item modifiers
    const comboModifierTotal = result.selectedModifiers.reduce(
      (sum, m) => sum + m.priceAdjustment, 0
    );

    // After combo, check if product has top-level modifiers
    if (product.hasModifiers && product.modifierGroups?.length) {
      this.pendingProductName.set(product.name);
      this.pendingModifierGroups.set(product.modifierGroups);
      this.pendingComboModifiers = result.selectedModifiers;
      this.showModifierDialog.set(true);
      return;
    }

    // No top-level modifiers → add directly with combo modifiers
    const price = this.pendingComboComputedPrice ?? product.variant.salePrice;
    this.addToCart(
      product,
      { ...product.variant, salePrice: price + comboModifierTotal },
      result.selectedModifiers,
      result.chosenVariants,
    );
  }

  private calculateComboPrice(
    basePrice: number,
    chosenVariants: { comboItemId: string; variantId: string }[],
    comboItems: ComboItem[],
  ): number {
    let total = basePrice;
    for (const chosen of chosenVariants) {
      const item = comboItems.find(ci => ci.id === chosen.comboItemId);
      if (item?.choiceGroup) {
        const option = item.choiceGroup.options.find(o => o.variantId === chosen.variantId);
        if (option) {
          total += option.priceAdjustment;
        }
      }
    }
    return Math.round(total * 100) / 100;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MODIFIER DIALOG — for products with modifiers
  // ═══════════════════════════════════════════════════════════════════════

  onModifiersConfirmed(modifiers: SaleModifierSnapshot[]): void {
    this.showModifierDialog.set(false);
    const product = this.pendingProduct;
    if (!product) return;

    // Merge combo item-level modifiers with product-level modifiers
    const allModifiers = [...this.pendingComboModifiers, ...modifiers];

    const comboModifierTotal = this.pendingComboModifiers.reduce(
      (sum, m) => sum + m.priceAdjustment, 0
    );
    const basePrice = (this.pendingComboComputedPrice ?? product.variant.salePrice) + comboModifierTotal;
    const variant = { ...product.variant, salePrice: basePrice };

    this.addToCart(product, variant, allModifiers, this.pendingChosenVariants);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ADD TO CART — final step for all product types
  // ═══════════════════════════════════════════════════════════════════════

  private addToCart(
    product: PosCatalogProduct,
    variant: PosCatalogVariant,
    modifiers: SaleModifierSnapshot[],
    chosenVariants: { comboItemId: string; variantId: string }[],
  ): void {
    const modifierTotal = modifiers.reduce((sum, m) => sum + m.priceAdjustment, 0);
    const unitPrice = Math.round((variant.salePrice + modifierTotal) * 100) / 100;

    // Edit mode: update existing cart item
    if (this.editingItemUid) {
      this.cart.updateItemOptions(this.editingItemUid, {
        selectedModifiers: modifiers,
        chosenVariants,
        basePrice: variant.salePrice,
        modifierTotal,
        unitPrice,
      });
      this.clearPending();
      return;
    }

    // New item mode
    this.cart.addItem({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku,
      imageUrl: product.imageUrl,
      productType: product.type as any,
      quantity: 1,
      basePrice: variant.salePrice,
      modifierTotal,
      unitPrice,
      discountPercent: 0,
      taxes: variant.taxes,
      selectedModifiers: modifiers,
      chosenVariants,
      stockTrackable: variant.stockTrackable,
      modifierGroups: product.modifierGroups,
      comboItems: product.comboItems,
      comboPriceMode: product.comboPriceMode,
    });

    this.clearPending();
  }

  private clearPending(): void {
    this.pendingProduct = null;
    this.pendingChosenVariants = [];
    this.pendingComboModifiers = [];
    this.pendingComboComputedPrice = null;
    this.editingItemUid = null;
    this.pendingPreselectedModifiers.set([]);
    this.pendingPreselectedChoices.set([]);
    this.pendingPreselectedComboModifiers.set([]);
  }

  cancelEdit(): void {
    this.showModifierDialog.set(false);
    this.showComboDialog.set(false);
    this.clearPending();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EDIT ITEM — re-open dialogs with existing selections
  // ═══════════════════════════════════════════════════════════════════════

  onEditItem(uid: string): void {
    const item = this.cart.items().find(i => i.uid === uid);
    if (!item) return;

    this.editingItemUid = uid;
    this.pendingProductName.set(item.productName);

    // Build a lightweight product proxy for the edit flow
    this.pendingProduct = {
      id: item.productId,
      name: item.productName,
      type: item.productType,
      comboPriceMode: item.comboPriceMode,
      hasModifiers: !!item.modifierGroups?.length,
      isCombo: item.productType === 'COMBO',
      variant: {
        id: item.variantId,
        name: item.variantName,
        sku: item.sku,
        salePrice: item.basePrice,
        stock: 0,
        availableStock: 0,
        stockTrackable: item.stockTrackable,
        trackLots: false,
        taxes: item.taxes,
      },
      variants: [],
      comboItems: item.comboItems,
      modifierGroups: item.modifierGroups,
      categoryId: '',
      stockTrackable: item.stockTrackable,
      outOfStock: false,
      lowStock: false,
    } as PosCatalogProduct;

    // COMBO with choices → open combo dialog
    if (item.productType === 'COMBO' && item.comboItems?.length) {
      this.pendingComboItems.set(item.comboItems);
      this.pendingComboPriceMode.set(item.comboPriceMode ?? 'FIXED');
      this.pendingComboBasePrice.set(item.basePrice);
      this.pendingPreselectedChoices.set(item.chosenVariants);
      this.pendingPreselectedComboModifiers.set(item.selectedModifiers);
      this.showComboDialog.set(true);
      return;
    }

    // Product with modifiers → open modifier dialog
    if (item.modifierGroups?.length) {
      this.pendingModifierGroups.set(item.modifierGroups);
      this.pendingPreselectedModifiers.set(item.selectedModifiers);
      this.showModifierDialog.set(true);
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAYMENT FLOW
  // ═══════════════════════════════════════════════════════════════════════

  openPaymentDialog(): void {
    if (this.cart.isEmpty()) return;
    this.showPaymentDialog.set(true);
  }

  onPaymentConfirmed(payments: CreateSalePaymentPayload[]): void {
    const branchId = this.activeBranchId();
    if (!branchId) {
      this.toast.error('No hay sucursal activa');
      return;
    }

    const warehouseId = this.defaultWarehouse?.id;
    if (!warehouseId) {
      this.toast.error('No hay bodega configurada para esta sucursal');
      return;
    }

    const items = this.cart.items();
    const payload: CreateSalePayload = {
      branchId,
      warehouseId,
      customerId: this.cart.customer()?.id,
      notes: this.cart.notes() || undefined,
      items: items.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || undefined,
        taxIds: item.taxes.map(t => t.taxId),
        chosenVariants: item.chosenVariants.length ? item.chosenVariants : undefined,
        selectedModifiers: item.selectedModifiers.length ? item.selectedModifiers : undefined,
      })),
      payments,
    };

    this.isProcessingSale.set(true);

    this.saleService
      .create(payload)
      .pipe(finalize(() => this.isProcessingSale.set(false)))
      .subscribe({
        next: (sale) => {
          this.completedSale.set(sale);
          this.showPaymentDialog.set(false);
          this.showSaleCompleteDialog.set(true);
          this.cart.clear();
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'Error al procesar la venta';
          this.toast.error(msg);
        },
      });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SALE COMPLETE
  // ═══════════════════════════════════════════════════════════════════════

  onNewSale(): void {
    this.showSaleCompleteDialog.set(false);
    this.completedSale.set(null);
    this.catalogRef?.resetSearch();
  }

  onPrintReceipt(): void {
    this.toast.info('Función de impresión próximamente');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CUSTOMER SEARCH
  // ═══════════════════════════════════════════════════════════════════════

  openCustomerSearch(): void {
    this.customerSearchQuery.set('');
    this.customerSearchResults.set([]);
    this.showCreateCustomer.set(false);
    this.newCustomerName.set('');
    this.newCustomerIdType.set('05');
    this.newCustomerIdNumber.set('');
    this.showCustomerDialog.set(true);
  }

  onCustomerSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.customerSearchQuery.set(query);

    if (query.length < 2) {
      this.customerSearchResults.set([]);
      this.customerSearchLoading.set(false);
      return;
    }

    this.customerSearch$.next(query);
  }

  selectCustomer(customer: Customer): void {
    this.cart.setCustomer(customer);
    this.showCustomerDialog.set(false);
    this.toast.success(`Cliente: ${customer.name}`);
  }

  clearCustomer(): void {
    this.cart.setCustomer(null);
    this.showCustomerDialog.set(false);
  }

  createAndSelectCustomer(): void {
    const name = this.newCustomerName().trim();
    const identificacion = this.newCustomerIdNumber().trim();
    if (!name || !identificacion) return;

    this.creatingCustomer.set(true);

    this.customerService
      .create({
        name,
        tipoIdentificacion: this.newCustomerIdType(),
        identificacion,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.creatingCustomer.set(false)),
      )
      .subscribe({
        next: (customer) => {
          this.selectCustomer(customer);
        },
        error: (err) => {
          const msg = err?.error?.message || 'Error al crear el cliente';
          this.toast.error(msg);
        },
      });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HEADER ACTIONS
  // ═══════════════════════════════════════════════════════════════════════

  onVoidAll(): void {
    if (this.cart.isEmpty()) return;
    const snapshot = this.cart.items();
    const customer = this.cart.customer();
    const notes = this.cart.notes();
    this.cart.clear();

    this.toast.showWithUndo('Venta anulada', () => {
      for (const item of snapshot) {
        this.cart.addItem(item);
      }
      if (customer) this.cart.setCustomer(customer);
      if (notes) this.cart.setNotes(notes);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  private loadBranchInfo(): void {
    const branchId = this.authService.activeBranchId();
    this.activeBranchId.set(branchId);
    if (!branchId) return;

    this.authService.getMyBranches().pipe(takeUntil(this.destroy$)).subscribe({
      next: (branches) => {
        const branch = branches.find(b => b.id === branchId);
        if (branch) this.activeBranchName.set(branch.name);
      },
    });
  }

  private loadDefaultWarehouse(): void {
    const branchId = this.authService.activeBranchId();
    if (!branchId) return;

    this.warehouseService.findAll({ branchId, isActive: true, limit: 50 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.defaultWarehouse = res.data.find(w => w.isDefault) ?? res.data[0] ?? null;
          this.defaultWarehouseId.set(this.defaultWarehouse?.id ?? null);
        },
      });
  }

  // #12 — Global keyboard shortcuts for POS
  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(e: KeyboardEvent): void {
    // Don't capture when typing in input/textarea
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;

    switch (e.key) {
      case 'F2':
        e.preventDefault();
        this.openPaymentDialog();
        break;
      case 'F3':
        e.preventDefault();
        this.openCustomerSearch();
        break;
      case 'Escape':
        if (this.showPaymentDialog() && !this.isProcessingSale()) this.showPaymentDialog.set(false);
        else if (this.isCustomizing()) this.cancelEdit();
        else if (this.showCustomerDialog()) this.showCustomerDialog.set(false);
        break;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
