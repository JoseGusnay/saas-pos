export type AttributeDataType = 'TEXT' | 'NUMBER' | 'COLOR' | 'BOOLEAN';

export const DATA_TYPE_LABELS: Record<AttributeDataType, string> = {
  TEXT: 'Texto',
  NUMBER: 'Numérico',
  COLOR: 'Color',
  BOOLEAN: 'Sí/No',
};

export interface AttributeType {
  id: string;
  name: string;
  dataType: AttributeDataType;
  unit?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt?: string;
}

export interface CategoryAttributeType {
  id: string;
  categoryId: string;
  attributeTypeId: string;
  attributeType: AttributeType;
  isRequired: boolean;
  displayOrder: number;
}

export interface VariantAttributeValue {
  id?: string;
  variantId?: string;
  attributeTypeId: string;
  attributeTypeName?: string;        // campo flat que devuelve el backend
  attributeType?: AttributeType;     // solo disponible en contexto local
  valueText?: string | null;
  valueNumber?: number | null;
}

export interface ChoiceOption {
  id: string;
  variantId: string;
  variantName: string;
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface ChoiceGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  required: boolean;
  sortOrder: number;
  options: ChoiceOption[];
}

export interface ComboItem {
  id: string;
  type: 'fixed' | 'choice';
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  sortOrder: number;
  choiceGroup: ChoiceGroup | null;
  modifierGroups?: ModifierGroup[];
}

export interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
  sortOrder?: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections?: number | null;
  required: boolean;
  sortOrder?: number;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  type: string;
  comboPriceMode?: 'FIXED' | 'CALCULATED' | null;
  categoryId: string;
  brandId?: string;
  imageUrl?: string;
  imagePublicId?: string;
  isActive: boolean;
  isSellable?: boolean;
  isPurchasable?: boolean;
  // Campos resumen presentes en el listado
  variantCount?: number;
  minSalePrice?: number;
  maxSalePrice?: number;
  mainSku?: string | null;
  // Campos detalle
  variants: ProductVariant[];
  comboItems?: ComboItem[];
  modifierGroups?: ModifierGroup[];
  branchSettings?: { id: string; branchId: string; isAvailable: boolean }[];
  category?: { id: string; name: string };
  brand?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  presentationId?: string | null;
  presentationName?: string | null;
  baseUnitId?: string | null;
  baseUnitAbbreviation?: string | null;
  conversionFactor?: number;
  sku?: string | null;
  barcode?: string | null;
  name?: string;
  costPrice: number;
  lastPurchasePrice?: number | null;
  salePrice: number;
  stockTrackable: boolean;
  trackLots: boolean;
  trackExpiry: boolean;
  durationMinutes?: number | null;
  minimumStock?: number | null;
  maximumStock?: number | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  isActive: boolean;
  variantTaxes?: VariantTax[];
  attributeValues?: VariantAttributeValue[];
  prices?: { id: string; branchId: string; salePrice: number; isActive: boolean }[];
  recipe?: {
    id: string;
    yield: number;
    yieldUnitId: string;
    yieldUnitAbbreviation: string;
    notes: string | null;
    isActive: boolean;
    ingredients: {
      id: string;
      variantId: string;
      variantName: string;
      quantity: number;
      unitId: string;
      unitAbbreviation: string;
      notes: string | null;
    }[];
  } | null;
}

export interface VariantTax {
  variantId: string;
  taxId: string;
  tax?: any;
}

export interface ProductBranchSetting {
  id: string;
  productId: string;
  branchId: string;
  branchName?: string;
  isAvailable: boolean;
}

export interface VariantBranchPrice {
  id: string;
  variantId: string;
  branchId: string;
  branchName?: string;
  salePrice: number;
  isActive: boolean;
}

export interface CreateModifierOptionPayload {
  name: string;
  priceAdjustment?: number;
  variantId?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface CreateModifierGroupPayload {
  name: string;
  minSelections?: number;
  maxSelections?: number;
  required?: boolean;
  sortOrder?: number;
  options: CreateModifierOptionPayload[];
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  type?: string;
  comboPriceMode?: 'FIXED' | 'CALCULATED';
  categoryId: string;
  brandId?: string;
  isActive?: boolean;
  isSellable?: boolean;
  isPurchasable?: boolean;
  imageUrl?: string;
  imagePublicId?: string;
  variants: CreateVariantPayload[];
  comboItems?: {
    variantId?: string;
    quantity: number;
    modifierGroups?: CreateModifierGroupPayload[];
    choiceGroup?: {
      name: string;
      minSelections?: number;
      maxSelections?: number;
      required?: boolean;
      sortOrder?: number;
      options: { variantId: string; name: string; priceAdjustment?: number; isDefault?: boolean; sortOrder?: number }[];
    };
  }[];
  modifierGroups?: CreateModifierGroupPayload[];
}

export interface CreateVariantPayload {
  id?: string;
  name: string;
  sku?: string;
  barcode?: string;
  presentationId?: string;
  baseUnitId?: string;
  conversionFactor?: number;
  costPrice: number;
  salePrice: number;
  stockTrackable?: boolean;
  trackLots?: boolean;
  trackExpiry?: boolean;
  durationMinutes?: number;
  minimumStock?: number | null;
  maximumStock?: number | null;
  imageUrl?: string;
  imagePublicId?: string;
  taxIds?: string[];
  attributeValues?: { attributeTypeId: string; valueText?: string | null; valueNumber?: number | null }[];
  isActive?: boolean;
  recipe?: {
    yield: number;
    yieldUnitId: string;
    notes?: string;
    ingredients: { variantId: string; quantity: number; unitId: string; notes?: string }[];
  } | null;
}
