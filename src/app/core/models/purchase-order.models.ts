export type PurchaseOrderStatus = 'DRAFT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  /** Joined fields */
  variantName?: string;
  sku?: string;
  productName?: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  branchId: string;
  status: PurchaseOrderStatus;
  notes?: string | null;
  totalAmount: number;
  userId?: string | null;
  userName?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Joined fields */
  supplierName?: string;
  branchName?: string;
  itemCount?: number;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItemPayload {
  variantId: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  branchId: string;
  notes?: string;
  items: PurchaseOrderItemPayload[];
}

export interface UpdatePurchaseOrderPayload {
  notes?: string;
  items?: PurchaseOrderItemPayload[];
}
