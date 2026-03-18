import { ApiResponse } from './auth.models';
import { AgGridFilterModel } from './query-builder.models';

export interface Branch {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    city: string | null;
    isActive: boolean;
    isMain: boolean;
    createdAt: string;
    updatedAt: string;
    // UI specific fields (mocking for now or extending entity)
    manager?: string;
    revenue?: string;
    status?: string;
}

export interface BranchListResponse {
    data: Branch[];
    total: number;
}

export interface BranchQueryFilters {
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
    filterModel?: AgGridFilterModel;
}
