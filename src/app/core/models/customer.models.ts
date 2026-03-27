export interface Customer {
  id: string;
  name: string;
  tipoIdentificacion: string;
  identificacion: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponse {
  data: Customer[];
  total: number;
}

export interface CustomerQueryFilters {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  filterModel?: any;
}

export const CUSTOMER_ID_TYPES: { value: string; label: string }[] = [
  { value: '04', label: 'RUC' },
  { value: '05', label: 'Cédula' },
  { value: '06', label: 'Pasaporte' },
  { value: '07', label: 'Consumidor Final' },
  { value: '08', label: 'Identificación del Exterior' },
];
