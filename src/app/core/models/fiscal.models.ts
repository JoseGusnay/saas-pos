export type RegimenRimpe = 'NEGOCIO_POPULAR' | 'EMPRENDEDOR';
export type AmbienteSri  = 1 | 2;
export type TipoComprobante = '01' | '04' | '05' | '06' | '07';

export const TIPO_COMPROBANTE_LABELS: Record<TipoComprobante, string> = {
  '01': 'Factura',
  '04': 'Nota de Crédito',
  '05': 'Nota de Débito',
  '06': 'Guía de Remisión',
  '07': 'Retención',
};

export interface EmpresaFiscal {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  dirMatriz: string;
  obligadoContabilidad: boolean;
  contribuyenteEspecial: string | null;
  regimenRimpe: RegimenRimpe | null;
  agenteRetencion: string | null;
  ambiente: AmbienteSri;
  tipoEmision: number;
  certificadoP12: string | null;
  claveP12: string | null;
  isActive: boolean;
  facturacionElectronica: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Secuencial {
  id: string;
  puntoEmisionId: string;
  tipoComprobante: TipoComprobante;
  ultimoNumero: number;
}

export interface PuntoEmision {
  id: string;
  branchId: string;
  codigoPuntoEmision: string;
  descripcion: string | null;
  isActive: boolean;
  secuenciales?: Secuencial[];
  createdAt: string;
}

export interface CreateEmpresaFiscalPayload {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  dirMatriz: string;
  obligadoContabilidad?: boolean;
  contribuyenteEspecial?: string;
  regimenRimpe?: RegimenRimpe;
  agenteRetencion?: string;
  ambiente?: AmbienteSri;
}

export interface UpdateEmpresaFiscalPayload extends Partial<CreateEmpresaFiscalPayload> {
  isActive?: boolean;
  facturacionElectronica?: boolean;
}

export interface CreatePuntoEmisionPayload {
  branchId: string;
  codigoPuntoEmision: string;
  descripcion?: string;
}

// ── Comprobantes Electrónicos ─────────────────────────────────────────────────

export type EdocEstado = 'GENERADO' | 'FIRMADO' | 'ENVIADO' | 'AUTORIZADO' | 'RECHAZADO';

export interface ElectronicDocument {
  id: string;
  saleId: string;
  tipoComprobante: TipoComprobante;
  claveAcceso: string;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  estado: EdocEstado;
  sriEstado: string | null;
  sriMensajes: { identificador: string; mensaje: string; tipo: string; informacionAdicional: string | null }[] | null;
  fechaAutorizacion: string | null;
  intentos: number;
  createdAt: string;
}
