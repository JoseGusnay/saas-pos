export interface Brand {
  id: string;
  name: string;
  country?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  deletedAt?: string;
}

export interface BrandListResponse {
  data: Brand[];
  total: number;
}

export interface BrandQueryFilters {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  filterModel?: any;
}
