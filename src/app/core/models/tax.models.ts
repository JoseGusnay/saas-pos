export interface Tax {
  id: string;
  code: string;
  sriCode?: string;
  name: string;
  percentage?: number;
  fixedAmount: number;
  type: 'PERCENTAGE' | 'FIXED';
  isActive: boolean;
}

export interface CreateTaxPayload {
  code: string;
  sriCode?: string;
  name: string;
  percentage?: number;
  fixedAmount?: number;
  type: 'PERCENTAGE' | 'FIXED';
}
