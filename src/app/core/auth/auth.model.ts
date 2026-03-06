export interface AuthUser {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    tenantId: string;
    branchId: string | null;
    permissions: string[];
    isGlobalAdmin: boolean;
}

export interface BranchOption {
    id: string;
    name: string;
    isMain: boolean;
}

export interface LoginResponse {
    access_token: string;
    branches: BranchOption[];
    user: Omit<AuthUser, 'tenantId' | 'branchId' | 'permissions' | 'isGlobalAdmin'>;
}

export interface AuthState {
    user: AuthUser | null;
    token: string | null;
    branches: BranchOption[];     // Available after step-1 login
    isAuthenticated: boolean;
}

/** Key used for localStorage token storage */
export const AUTH_TOKEN_KEY = 'b2b_access_token';
