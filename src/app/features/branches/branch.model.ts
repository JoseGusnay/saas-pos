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
}

export interface BranchesResponse {
    data: Branch[];
    total: number;
}

export interface BranchForm {
    name: string;
    address: string;
    phone: string;
    city: string;
    isMain: boolean;
}

export const BRANCH_EMPTY_FORM: BranchForm = {
    name: '',
    address: '',
    phone: '',
    city: '',
    isMain: false,
};
