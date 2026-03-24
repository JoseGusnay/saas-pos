import { AgGridFilterModel } from './query-builder.models';

export interface Warehouse {
  id: string;
  branchId: string;
  name: string;
  isDefault: boolean;
  hasLocations: boolean;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  warehouseId: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseListResponse {
  data: Warehouse[];
  total: number;
}

export interface LocationListResponse {
  data: Location[];
  total: number;
}

export interface WarehouseQueryFilters {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  branchId?: string;
  isActive?: boolean;
  filterModel?: AgGridFilterModel;
}

export interface LocationQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  warehouseId?: string;
  isActive?: boolean;
}

export interface CreateWarehousePayload {
  branchId: string;
  name: string;
  hasLocations?: boolean;
  description?: string;
}

export interface UpdateWarehousePayload {
  name?: string;
  hasLocations?: boolean;
  isActive?: boolean;
  description?: string;
}

export interface CreateLocationPayload {
  warehouseId: string;
  name: string;
  code?: string;
}

export interface UpdateLocationPayload {
  name?: string;
  code?: string;
  isActive?: boolean;
}
