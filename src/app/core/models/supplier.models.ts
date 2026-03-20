export interface Supplier {
  id: string;
  name: string;
  ruc?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  name: string;
  ruc?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  isActive?: boolean;
}
