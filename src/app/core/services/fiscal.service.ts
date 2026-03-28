import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EmpresaFiscal, PuntoEmision, ElectronicDocument,
  CreateEmpresaFiscalPayload, UpdateEmpresaFiscalPayload,
  CreatePuntoEmisionPayload,
} from '../models/fiscal.models';

@Injectable({ providedIn: 'root' })
export class FiscalService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/business/fiscal`;

  // ── Empresa Fiscal ──────────────────────────────────────────────────────────

  getEmpresa(): Observable<EmpresaFiscal> {
    return this.http.get<any>(`${this.base}/empresa`, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  createEmpresa(payload: CreateEmpresaFiscalPayload): Observable<EmpresaFiscal> {
    return this.http.post<any>(`${this.base}/empresa`, payload, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  updateEmpresa(payload: UpdateEmpresaFiscalPayload): Observable<EmpresaFiscal> {
    return this.http.patch<any>(`${this.base}/empresa`, payload, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  // ── Puntos de Emisión ───────────────────────────────────────────────────────

  getPuntosEmision(branchId?: string): Observable<PuntoEmision[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId);
    return this.http.get<any>(`${this.base}/puntos-emision`, { params, withCredentials: true })
      .pipe(map(r => r.data));
  }

  createPuntoEmision(payload: CreatePuntoEmisionPayload): Observable<PuntoEmision> {
    return this.http.post<any>(`${this.base}/puntos-emision`, payload, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  updatePuntoEmision(id: string, payload: Partial<CreatePuntoEmisionPayload> & { isActive?: boolean }): Observable<PuntoEmision> {
    return this.http.patch<any>(`${this.base}/puntos-emision/${id}`, payload, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  // ── Comprobantes Electrónicos ─────────────────────────────────────────────

  getComprobantesBySale(saleId: string): Observable<ElectronicDocument[]> {
    return this.http.get<any>(`${this.base}/comprobantes/sale/${saleId}`, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  downloadRide(edocId: string): Observable<Blob> {
    return this.http.get(`${this.base}/comprobantes/${edocId}/ride`, {
      withCredentials: true,
      responseType: 'blob',
    });
  }

  reenviarComprobante(edocId: string): Observable<ElectronicDocument> {
    return this.http.post<any>(`${this.base}/comprobantes/${edocId}/enviar`, {}, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  consultarAutorizacion(edocId: string): Observable<ElectronicDocument> {
    return this.http.post<any>(`${this.base}/comprobantes/${edocId}/consultar`, {}, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  reintentarRechazado(edocId: string): Observable<ElectronicDocument> {
    return this.http.post<any>(`${this.base}/comprobantes/${edocId}/reintentar`, {}, { withCredentials: true })
      .pipe(map(r => r.data));
  }
}
