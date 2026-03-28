import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import {
  Sale,
  SaleListResponse,
  SaleQueryFilters,
  CreateSalePayload,
  CancelSalePayload,
} from '../models/sale.models';

@Injectable({ providedIn: 'root' })
export class SaleService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/business/sales`;

  findAll(filters: SaleQueryFilters): Observable<SaleListResponse> {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.sortField) params = params.set('sortField', filters.sortField);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    if (filters.branchId) params = params.set('branchId', filters.branchId);
    if (filters.customerId) params = params.set('customerId', filters.customerId);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.paymentMethod) params = params.set('paymentMethod', filters.paymentMethod);
    if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
    if (filters.filterModel && Object.keys(filters.filterModel).length > 0) {
      params = params.set('filterModel', JSON.stringify(filters.filterModel));
    }

    return this.http
      .get<ApiResponse<SaleListResponse>>(this.baseUrl, { params, withCredentials: true })
      .pipe(map(res => res.data));
  }

  findOne(id: string): Observable<Sale> {
    return this.http
      .get<ApiResponse<Sale>>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  create(payload: CreateSalePayload): Observable<Sale> {
    return this.http
      .post<ApiResponse<Sale>>(this.baseUrl, payload, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  cancel(id: string, payload: CancelSalePayload): Observable<Sale> {
    return this.http
      .post<ApiResponse<Sale>>(`${this.baseUrl}/${id}/cancel`, payload, { withCredentials: true })
      .pipe(map(res => res.data));
  }
}
