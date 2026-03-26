import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PurchaseOrder,
  CreatePurchaseOrderPayload,
  UpdatePurchaseOrderPayload,
  RegisterReceiptPayload,
  RegisterRetentionPayload,
  RegisterPaymentPayload,
} from '../models/purchase-order.models';

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private http   = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/business/purchase-orders`;

  findAll(filters?: any): Observable<{ data: PurchaseOrder[]; total: number }> {
    let params = new HttpParams();
    if (filters?.page)       params = params.set('page',       filters.page);
    if (filters?.limit)      params = params.set('limit',      filters.limit);
    if (filters?.search)     params = params.set('search',     filters.search);
    if (filters?.status)     params = params.set('status',     filters.status);
    if (filters?.supplierId) params = params.set('supplierId', filters.supplierId);
    if (filters?.branchId)   params = params.set('branchId',   filters.branchId);
    if (filters?.sortField)  params = params.set('sortField',  filters.sortField);
    if (filters?.sortOrder)  params = params.set('sortOrder',  filters.sortOrder);
    if (filters?.filterModel && Object.keys(filters.filterModel).length > 0) {
      params = params.set('filterModel', JSON.stringify(filters.filterModel));
    }
    return this.http.get<any>(this.apiUrl, { params }).pipe(map(r => r?.data ?? r));
  }

  findOne(id: string): Observable<PurchaseOrder> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(map(r => r?.data ?? r));
  }

  create(payload: CreatePurchaseOrderPayload): Observable<PurchaseOrder> {
    return this.http.post<any>(this.apiUrl, payload).pipe(map(r => r?.data ?? r));
  }

  update(id: string, payload: UpdatePurchaseOrderPayload): Observable<PurchaseOrder> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, payload).pipe(map(r => r?.data ?? r));
  }

  approve(id: string): Observable<PurchaseOrder> {
    return this.http.post<any>(`${this.apiUrl}/${id}/approve`, {}).pipe(map(r => r?.data ?? r));
  }

  registerReceipt(id: string, payload: RegisterReceiptPayload): Observable<PurchaseOrder> {
    return this.http.post<any>(`${this.apiUrl}/${id}/receipt`, payload).pipe(map(r => r?.data ?? r));
  }

  registerRetention(id: string, payload: RegisterRetentionPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/retention`, payload).pipe(map(r => r?.data ?? r));
  }

  registerPayment(id: string, payload: RegisterPaymentPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/payment`, payload).pipe(map(r => r?.data ?? r));
  }

  duplicate(id: string): Observable<PurchaseOrder> {
    return this.http.post<any>(`${this.apiUrl}/${id}/duplicate`, {}).pipe(map(r => r?.data ?? r));
  }

  cancel(id: string): Observable<PurchaseOrder> {
    return this.http.post<any>(`${this.apiUrl}/${id}/cancel`, {}).pipe(map(r => r?.data ?? r));
  }

  generateRetentionXml(orderId: string, retentionId: string): Observable<{ claveAcceso: string; xml: string }> {
    return this.http.get<any>(`${this.apiUrl}/${orderId}/retention/${retentionId}/xml`).pipe(map(r => r?.data ?? r));
  }

  removePayment(orderId: string, paymentId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${orderId}/payment/${paymentId}`).pipe(map(r => r?.data ?? r));
  }

  removeRetention(orderId: string, retentionId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${orderId}/retention/${retentionId}`).pipe(map(r => r?.data ?? r));
  }

  remove(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(map(r => r?.data ?? r));
  }

  downloadPdf(id: string): void {
    this.http.get(`${this.apiUrl}/${id}/pdf`, {
      responseType: 'blob', withCredentials: true,
    }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orden-compra.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  sendWhatsApp(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${this.apiUrl}/${id}/send-whatsapp`, {}, { withCredentials: true }).pipe(
      map(res => res?.data ?? res)
    );
  }
}
