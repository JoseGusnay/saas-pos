export interface TenantValidationResponse {
    id: string;
    exists: boolean;
    isOperational: boolean;
    status: string;
    name: string;
    locale: string;
}

export interface AuthContextResponse {
    isAuthenticated: boolean;
    branchId: string | null;
    tenant: TenantValidationResponse;
    user: UserProfile | null;
}

export interface ApiResponse<T> {
    statusCode: number;
    timestamp: string;
    path: string;
    data: T;
}

export interface BranchInfo {
    id: string;
    name: string;
    isMain: boolean;
}

export interface UserProfile {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
    countryCode: string | null;
    phone: string | null;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface LoginStepOneResponse {
    branches: BranchInfo[];
    user: UserProfile;
}

export interface AuthSuccessResponse {
    user: UserProfile;
    // access_token is handled via cookies
}

export interface MessageResponse {
    success: boolean;
    message: string;
}
