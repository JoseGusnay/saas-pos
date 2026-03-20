export type PurchaseOrderStatus =
  | 'BORRADOR'
  | 'APROBADA'
  | 'RECIBIDA_PARCIAL'
  | 'RECIBIDA'
  | 'CERRADA'
  | 'ANULADA';

export type PaymentCondition =
  | 'CONTADO'
  | 'CREDITO_15'
  | 'CREDITO_30'
  | 'CREDITO_60'
  | 'CREDITO_90';

export type PaymentStatus =
  | 'PENDIENTE'
  | 'PAGADO_PARCIAL'
  | 'PAGADO'
  | 'VENCIDO';

export type PaymentMethod =
  | 'EFECTIVO'
  | 'TRANSFERENCIA'
  | 'CHEQUE'
  | 'TARJETA';

// ── Ítem de orden ─────────────────────────────────────────────────────────────

export interface PurchaseOrderItem {
  id: string;
  orderId: string;
  variantId: string;
  variantName: string | null;
  sku: string | null;
  productName: string | null;
  unitOfMeasure: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  discountPercent: number;
  taxRate: number;
  subtotalBeforeDiscount: number;
  discountAmount: number;
  subtotal: number;
  ivaAmount: number;
  lineTotal: number;
}

// ── Recepción ─────────────────────────────────────────────────────────────────

export interface PurchaseOrderReceiptItem {
  id: string;
  receiptId: string;
  orderItemId: string;
  quantityReceived: number;
}

export interface PurchaseOrderReceipt {
  id: string;
  orderId: string;
  supplierInvoiceNumber: string;
  supplierInvoiceDate: string;
  sriAuthorizationNumber: string | null;
  isPartial: boolean;
  notes: string | null;
  receivedByName: string | null;
  receiptItems: PurchaseOrderReceiptItem[];
  createdAt: string;
}

// ── Retención ─────────────────────────────────────────────────────────────────

export interface PurchaseOrderRetention {
  id: string;
  orderId: string;
  retentionNumber: string;
  retentionDate: string;
  ivaRetentionPercent: number;
  ivaRetentionAmount: number;
  rentaRetentionPercent: number;
  rentaRetentionAmount: number;
  totalRetained: number;
  notes: string | null;
  emittedByName: string | null;
  createdAt: string;
}

// ── Pago ──────────────────────────────────────────────────────────────────────

export interface PurchaseOrderPayment {
  id: string;
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  paidByName: string | null;
  createdAt: string;
}

// ── Orden ─────────────────────────────────────────────────────────────────────

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  branchId: string;
  status: PurchaseOrderStatus;
  paymentCondition: PaymentCondition;
  paymentStatus: PaymentStatus;
  expectedDeliveryDate: string | null;
  dueDate: string | null;
  deliveryAddress: string | null;
  internalNotes: string | null;
  subtotal: number;
  totalDiscount: number;
  baseIva0: number;
  baseIva5: number;
  baseIva15: number;
  totalIva: number;
  total: number;
  totalPaid: number;
  userName: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Joined */
  supplierName?: string;
  supplierRuc?: string;
  branchName?: string;
  itemCount?: number;
  items?: PurchaseOrderItem[];
  receipts?: PurchaseOrderReceipt[];
  retentions?: PurchaseOrderRetention[];
  payments?: PurchaseOrderPayment[];
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface PurchaseOrderItemPayload {
  variantId: string;
  variantName?: string;
  sku?: string;
  productName?: string;
  unitOfMeasure?: string;
  quantityOrdered: number;
  unitCost: number;
  discountPercent?: number;
  taxRate?: number;
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  branchId: string;
  paymentCondition?: PaymentCondition;
  expectedDeliveryDate?: string;
  deliveryAddress?: string;
  internalNotes?: string;
  items: PurchaseOrderItemPayload[];
}

export interface UpdatePurchaseOrderPayload {
  supplierId?: string;
  branchId?: string;
  paymentCondition?: PaymentCondition;
  expectedDeliveryDate?: string;
  deliveryAddress?: string;
  internalNotes?: string;
  items?: PurchaseOrderItemPayload[];
}

export interface ReceiptItemPayload {
  orderItemId: string;
  quantityReceived: number;
}

export interface RegisterReceiptPayload {
  supplierInvoiceNumber: string;
  supplierInvoiceDate: string;
  sriAuthorizationNumber?: string;
  notes?: string;
  items: ReceiptItemPayload[];
}

export interface RegisterRetentionPayload {
  retentionNumber: string;
  retentionDate: string;
  ivaRetentionPercent?: number;
  ivaRetentionBase?: number;
  rentaRetentionPercent?: number;
  rentaRetentionBase?: number;
  notes?: string;
}

export interface RegisterPaymentPayload {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference?: string;
  notes?: string;
}

// ── Labels helpers ────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  BORRADOR:        'Borrador',
  APROBADA:        'Aprobada',
  RECIBIDA_PARCIAL:'Rec. Parcial',
  RECIBIDA:        'Recibida',
  CERRADA:         'Cerrada',
  ANULADA:         'Anulada',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDIENTE:     'Pendiente',
  PAGADO_PARCIAL:'Pago Parcial',
  PAGADO:        'Pagado',
  VENCIDO:       'Vencido',
};

export const PAYMENT_CONDITION_LABELS: Record<PaymentCondition, string> = {
  CONTADO:    'Contado',
  CREDITO_15: 'Crédito 15 días',
  CREDITO_30: 'Crédito 30 días',
  CREDITO_60: 'Crédito 60 días',
  CREDITO_90: 'Crédito 90 días',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO:     'Efectivo',
  TRANSFERENCIA:'Transferencia',
  CHEQUE:       'Cheque',
  TARJETA:      'Tarjeta',
};
