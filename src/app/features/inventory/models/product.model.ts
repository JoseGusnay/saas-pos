export interface AttributeType {
  id: string;
  name: string;
  dataType: 'TEXT' | 'NUMBER' | 'COLOR' | 'BOOLEAN';
  unit?: string;
  isSystem: boolean;
  isActive: boolean;
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
  attributeType?: AttributeType;
  valueText?: string | null;
  valueNumber?: number | null;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  type: string;
  categoryId: string;
  brandId?: string;
  imageUrl?: string;
  isActive: boolean;
  variants: ProductVariant[];
  category?: { id: string; name: string };
  brand?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  presentationId?: string;
  presentation?: { id: string; name: string };
  sku?: string;
  barcode?: string;
  name?: string;
  unitsPerPack: number;
  costPrice: number;
  salePrice: number;
  stockTrackable: boolean;
  durationMinutes?: number | null;
  isActive: boolean;
  variantTaxes?: VariantTax[];
  attributeValues?: VariantAttributeValue[];
}

export interface VariantTax {
  variantId: string;
  taxId: string;
  tax?: any;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  type?: string;
  categoryId: string;
  brandId?: string;
  isActive?: boolean;
  variants: CreateVariantPayload[];
}

export interface CreateVariantPayload {
  id?: string;
  presentationId?: string;
  sku?: string;
  barcode?: string;
  name?: string;
  unitsPerPack?: number;
  costPrice: number;
  salePrice: number;
  stockTrackable?: boolean;
  durationMinutes?: number;
  taxIds?: string[];
  attributeValues?: { attributeTypeId: string; valueText?: string | null; valueNumber?: number | null }[];
  isActive?: boolean;
}
