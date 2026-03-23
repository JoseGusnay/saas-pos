export type TipoIdentificacion = 'RUC' | 'CEDULA' | 'PASAPORTE';
export type TipoContribuyente = 'PERSONA_NATURAL' | 'SOCIEDAD' | 'CONTRIBUYENTE_ESPECIAL' | 'ENTIDAD_PUBLICA';
export type RegimenRimpe = 'POPULAR' | 'EMPRENDEDOR' | null;

export interface Supplier {
  id: string;
  name: string;
  tipoIdentificacion: TipoIdentificacion;
  ruc?: string | null;
  tipoContribuyente: TipoContribuyente;
  obligadoContabilidad: boolean;
  regimenRimpe: RegimenRimpe;
  parteRelacionada: boolean;
  tipoSujetoRetenido: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  name: string;
  tipoIdentificacion?: TipoIdentificacion;
  ruc?: string;
  tipoContribuyente?: TipoContribuyente;
  obligadoContabilidad?: boolean;
  regimenRimpe?: RegimenRimpe;
  parteRelacionada?: boolean;
  tipoSujetoRetenido?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  isActive?: boolean;
}
