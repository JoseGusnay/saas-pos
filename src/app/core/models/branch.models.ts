import { ApiResponse } from './auth.models';
import { AgGridFilterModel } from './query-builder.models';
import { PuntoEmision } from './fiscal.models';

export interface CreateSecuencialInline {
  tipoComprobante: string;
  ultimoNumero: number;
}

export interface CreatePuntoEmisionInline {
  codigoPuntoEmision: string;
  descripcion?: string;
  secuenciales?: CreateSecuencialInline[];
}

export interface CreateBranchPayload {
  name: string;
  address?: string;
  phone?: string;
  city?: string;
  manager?: string;
  isActive?: boolean;
  isMain?: boolean;
  codigoEstablecimiento?: string;
  dirEstablecimiento?: string;
  nombreComercialSucursal?: string;
  puntosEmision?: CreatePuntoEmisionInline[];
}

export interface Branch {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    city: string | null;
    isActive: boolean;
    isMain: boolean;
    manager?: string;
    revenue?: string;
    status?: string;
    // Campos SRI Ecuador
    codigoEstablecimiento: string | null;
    dirEstablecimiento: string | null;
    nombreComercialSucursal: string | null;
    puntosEmision?: PuntoEmision[];
    createdAt: string;
    updatedAt: string;
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
