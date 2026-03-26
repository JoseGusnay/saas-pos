export type MovementType =
  | 'INITIAL'
  | 'PURCHASE'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'LOSS'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'RETURN'
  | 'PRODUCTION_IN'
  | 'PRODUCTION_OUT';

export type AlertLevel = 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVER_STOCK';

export interface StockLevel {
  id: string;
  variantId: string;
  warehouseId: string;
  warehouseName: string;
  branchId: string;
  branchName: string;
  locationId?: string;
  locationName?: string;
  quantity: number;
  updatedAt: string;
  variantName: string;
  sku: string;
  imageUrl?: string;
  minimumStock?: number;
  maximumStock?: number;
  stockTrackable: boolean;
  trackLots?: boolean;
  productId: string;
  productName: string;
}

export type MovementReferenceType = 'SALE' | 'TRANSFER' | 'ORDER' | 'PRODUCTION';

export interface StockMovement {
  id: string;
  variantId: string;
  warehouseId: string;
  warehouseName: string;
  branchId: string;
  branchName: string;
  type: MovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  costPrice?: number;
  referenceId?: string;
  referenceType?: MovementReferenceType;
  notes?: string;
  userId?: string;
  userName?: string;
  createdAt: string;
  variantName: string;
  sku: string;
  productName: string;
}

export interface KardexMovement extends StockMovement {
  locationName?: string;
  locationCode?: string;
  lotNumber?: string;
  lotExpiryDate?: string;
  lotCostPrice?: number;
  lotStockAfter?: number;
  productId?: string;
}

export interface KardexTotals {
  totalIn: number;
  totalOut: number;
  totalCostIn: number;
  totalCostOut: number;
}

export interface KardexResponse {
  data: KardexMovement[];
  total: number;
  openingBalance?: number;
  totals?: KardexTotals;
}

export interface StockAlert {
  variantId: string;
  warehouseId: string;
  warehouseName: string;
  branchId: string;
  branchName: string;
  quantity: number;
  variantName: string;
  sku: string;
  minimumStock?: number;
  maximumStock?: number;
  productName: string;
  productId: string;
  alertLevel: AlertLevel;
}

// ── Payloads ─────────────────────────────────────────────────────────────────

export interface AdjustStockPayload {
  variantId: string;
  warehouseId: string;
  locationId?: string;
  lotId?: string;
  newQuantity: number;
  notes?: string;
}

export interface TransferStockPayload {
  variantId: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  sourceLocationId?: string;
  destLocationId?: string;
  quantity: number;
}

// ── Lotes ────────────────────────────────────────────────────────────────────

export interface Lot {
  id: string;
  variantId: string;
  lotNumber: string;
  expiryDate?: string;
  costPrice?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  variantName?: string;
  productName?: string;
  sku?: string;
}

export interface LotQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  variantId?: string;
  expiringSoon?: boolean;
}

export interface CreateLotPayload {
  variantId: string;
  lotNumber: string;
  expiryDate?: string;
  costPrice?: number;
  notes?: string;
}

export interface UpdateLotPayload {
  notes?: string;
}

export interface LotStockEntry {
  lotId: string;
  locationId?: string;
  quantity: number;
  lotNumber: string;
  expiryDate?: string;
  costPrice?: number;
  notes?: string;
}

// ── Query Filters ────────────────────────────────────────────────────────────

export interface StockLevelFilters {
  page?: number;
  limit?: number;
  search?: string;
  warehouseId?: string;
  branchId?: string;
  lowStock?: boolean;
}

export interface StockMovementFilters {
  page?: number;
  limit?: number;
  search?: string;
  warehouseId?: string;
  branchId?: string;
  variantId?: string;
  type?: MovementType;
}
