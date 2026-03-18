import { AgGridFilterModel } from './query-builder.models';

export interface Category {
    id: string;
    name: string;
    description: string | null;
    parentId: string | null;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
    parent?: Category;
    children?: Category[];
}

export interface CategoryListResponse {
    data: Category[];
    total: number;
}

export interface CategoryQueryFilters {
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
    filterModel?: AgGridFilterModel;
}
