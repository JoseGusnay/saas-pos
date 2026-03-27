import { SaleModifierSnapshot } from '../../../core/models/sale.models';
import { ComboItem, ModifierGroup } from '../../inventory/models/product.model';

// ── Cart Item ────────────────────────────────────────────────────────────────

export interface PosCartItem {
  /** Client-side unique ID */
  uid: string;
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl?: string;
  productType: 'PHYSICAL' | 'SERVICE' | 'COMBO' | 'RAW_MATERIAL';

  quantity: number;
  /** Base unit price (variant salePrice or branch override) */
  basePrice: number;
  /** Sum of modifier priceAdjustments */
  modifierTotal: number;
  /** Final unit price = basePrice + modifierTotal */
  unitPrice: number;
  discountPercent: number;

  taxes: PosCartItemTax[];
  selectedModifiers: SaleModifierSnapshot[];
  chosenVariants: { comboItemId: string; variantId: string }[];

  stockTrackable: boolean;
}

export interface PosCartItemTax {
  taxId: string;
  taxName: string;
  taxRate: number;
  sriCode?: string;
}

// ── Cart Totals (computed) ───────────────────────────────────────────────────

export interface PosCartTotals {
  subtotal: number;
  totalDiscount: number;
  subtotalAfterDiscount: number;
  totalTaxes: number;
  total: number;
  itemCount: number;
}

// ── POS Catalog Variant ─────────────────────────────────────────────────────

export interface PosCatalogVariant {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  salePrice: number;
  stock: number;
  availableStock: number;
  stockTrackable: boolean;
  trackLots: boolean;
  durationMinutes?: number;
  imageUrl?: string;
  taxes: PosCartItemTax[];
}

// ── Product for POS catalog display ──────────────────────────────────────────

export interface PosCatalogProduct {
  id: string;
  name: string;
  type: string;
  comboPriceMode?: 'FIXED' | 'CALCULATED' | null;
  imageUrl?: string;
  categoryId: string;
  categoryName?: string;
  /** true if product has modifierGroups */
  hasModifiers: boolean;
  /** true if product is COMBO type */
  isCombo: boolean;
  /** First/default variant info for quick add */
  variant: PosCatalogVariant;
  /** Multiple variants (if > 1) */
  variants: PosCatalogVariant[];
  comboItems?: ComboItem[];
  modifierGroups?: ModifierGroup[];
}

// ── POS Catalog Category ────────────────────────────────────────────────────

export interface PosCatalogCategory {
  id: string;
  name: string;
  parentId: string | null;
}

// ── POS Catalog API Response ────────────────────────────────────────────────

export interface PosCatalogResponse {
  data: PosCatalogApiProduct[];
  total: number;
}

export interface PosCatalogApiProduct {
  productId: string;
  productName: string;
  productType: string;
  categoryId: string;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  imageUrl: string | null;
  comboPriceMode?: 'FIXED' | 'CALCULATED';
  variants: PosCatalogApiVariant[];
  comboItems?: ComboItem[];
  modifierGroups?: ModifierGroup[];
}

export interface PosCatalogApiVariant {
  variantId: string;
  variantName: string;
  sku: string | null;
  barcode: string | null;
  salePrice: number;
  costPrice: number;
  stock: number;
  availableStock: number;
  stockTrackable: boolean;
  trackLots: boolean;
  durationMinutes: number | null;
  imageUrl: string | null;
  taxes: PosCartItemTax[];
}

// ── Payment entry in the payment dialog ──────────────────────────────────────

export interface PosPaymentEntry {
  method: 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA';
  amount: number;
  reference?: string;
}
