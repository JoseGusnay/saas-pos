export type UnitType = 'WEIGHT' | 'VOLUME' | 'UNIT' | 'OTHER';

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  WEIGHT: 'Peso',
  VOLUME: 'Volumen',
  UNIT: 'Unidad',
  OTHER: 'Otro',
};

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  type: UnitType;
  isActive: boolean;
  createdAt?: string;
}

export interface UnitListResponse {
  data: Unit[];
  total: number;
}

export interface UnitQueryFilters {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  type?: UnitType;
  onlyActive?: boolean;
  filterModel?: Record<string, any>;
}
