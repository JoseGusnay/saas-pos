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

  cancel(id: string): Observable<PurchaseOrder> {
    return this.http.post<any>(`${this.apiUrl}/${id}/cancel`, {}).pipe(map(r => r?.data ?? r));
  }

  remove(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(map(r => r?.data ?? r));
  }
}
