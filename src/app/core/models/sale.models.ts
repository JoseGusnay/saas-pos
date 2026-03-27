// ── Sale Entity (response from backend) ──────────────────────────────────────

export interface Sale {
  id: string;
  saleNumber: string;
  branchId: string;
  warehouseId: string;
  customerId: string;
  customerName: string;
  customerTipoIdentificacion: string;
  customerIdentificacion: string;
  status: SaleStatus;
  subtotal: number;
  totalDiscount: number;
  subtotalAfterDiscount: number;
  totalTaxes: number;
  taxSummary: SaleTaxSummary[] | null;
  total: number;
  change: number;
  userId: string | null;
  userName: string | null;
  cancelledById: string | null;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  notes: string | null;
  items: SaleItem[];
  payments: SalePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  subtotalBeforeDiscount: number;
  discountAmount: number;
  subtotal: number;
  totalTaxes: number;
  lineTotal: number;
  costPrice: number | null;
  chosenVariants: Record<string, string> | null;
  selectedModifiers: SaleModifierSnapshot[] | null;
  taxes: SaleItemTax[];
}

export interface SaleItemTax {
  id: string;
  saleItemId: string;
  taxId: string;
  taxName: string;
  taxRate: number;
  sriCode: string | null;
  baseAmount: number;
  taxAmount: number;
}

export interface SalePayment {
  id: string;
  saleId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  formaPagoSri: string;
  reference: string | null;
  createdAt: string;
}

export interface SaleTaxSummary {
  taxId: string;
  taxName: string;
  taxRate: number;
  sriCode: string | null;
  baseAmount: number;
  taxAmount: number;
}

export interface SaleModifierSnapshot {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceAdjustment: number;
}

// ── Enums / Constants ────────────────────────────────────────────────────────

export type SaleStatus = 'COMPLETADA' | 'ANULADA';

export type PaymentMethod = 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: 'lucideBanknote' },
  { value: 'TARJETA_DEBITO', label: 'Tarjeta Débito', icon: 'lucideCreditCard' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta Crédito', icon: 'lucideCreditCard' },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: 'lucideRefreshCw' },
];

// ── Create Sale Payload ──────────────────────────────────────────────────────

export interface CreateSalePayload {
  branchId: string;
  warehouseId: string;
  customerId?: string;
  locationId?: string;
  notes?: string;
  items: CreateSaleItemPayload[];
  payments: CreateSalePaymentPayload[];
}

export interface CreateSaleItemPayload {
  variantId: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxIds?: string[];
  chosenVariants?: { comboItemId: string; variantId: string }[];
  selectedModifiers?: SaleModifierSnapshot[];
}

export interface CreateSalePaymentPayload {
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
}

export interface CancelSalePayload {
  reason: string;
}

// ── Query ────────────────────────────────────────────────────────────────────

export interface SaleQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  branchId?: string;
  customerId?: string;
  status?: SaleStatus;
  dateFrom?: string;
  dateTo?: string;
  filterModel?: any;
}

export interface SaleListResponse {
  data: Sale[];
  total: number;
}
