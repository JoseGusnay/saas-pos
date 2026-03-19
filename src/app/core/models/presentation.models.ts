export interface Presentation {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PresentationListResponse {
  data: Presentation[];
  total: number;
}

export interface PresentationQueryFilters {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterModel?: any;
}
