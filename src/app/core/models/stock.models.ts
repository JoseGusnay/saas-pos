export type MovementType =
  | 'INITIAL'
  | 'PURCHASE'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'LOSS'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'RETURN';

export type AlertLevel = 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface StockLevel {
  id: string;
  variantId: string;
  branchId: string;
  quantity: number;
  updatedAt: string;
  variantName: string;
  sku: string;
  imageUrl?: string;
  minimumStock?: number;
  maximumStock?: number;
  stockTrackable: boolean;
  productId: string;
  productName: string;
  branchName: string;
}

export interface StockMovement {
  id: string;
  variantId: string;
  branchId: string;
  type: MovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  userId?: string;
  userName?: string;
  createdAt: string;
  variantName: string;
  sku: string;
  productName: string;
  branchName: string;
}

export interface StockAlert {
  variantId: string;
  branchId: string;
  quantity: number;
  variantName: string;
  sku: string;
  minimumStock?: number;
  maximumStock?: number;
  productName: string;
  productId: string;
  branchName: string;
  alertLevel: AlertLevel;
}

export interface InitializeStockPayload {
  variantId: string;
  branchId: string;
  quantity: number;
  notes?: string;
}

export interface AdjustStockPayload {
  variantId: string;
  branchId: string;
  newQuantity: number;
  notes?: string;
}
