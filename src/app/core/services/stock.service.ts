import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StockLevel, StockMovement, StockAlert, InitializeStockPayload, AdjustStockPayload } from '../models/stock.models';

@Injectable({ providedIn: 'root' })
export class StockService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/business/stock`;

  getLevels(filters?: any): Observable<{ data: StockLevel[]; total: number }> {
    let params = new HttpParams();
    if (filters?.page)     params = params.set('page', filters.page);
    if (filters?.limit)    params = params.set('limit', filters.limit);
    if (filters?.search)   params = params.set('search', filters.search);
    if (filters?.branchId) params = params.set('branchId', filters.branchId);
    if (filters?.lowStock) params = params.set('lowStock', 'true');
    return this.http.get<any>(`${this.apiUrl}/levels`, { params }).pipe(
      map(res => res?.data ?? res)
    );
  }

  getMovements(filters?: any): Observable<{ data: StockMovement[]; total: number }> {
    let params = new HttpParams();
    if (filters?.page)      params = params.set('page', filters.page);
    if (filters?.limit)     params = params.set('limit', filters.limit);
    if (filters?.search)    params = params.set('search', filters.search);
    if (filters?.branchId)  params = params.set('branchId', filters.branchId);
    if (filters?.variantId) params = params.set('variantId', filters.variantId);
    if (filters?.type)      params = params.set('type', filters.type);
    return this.http.get<any>(`${this.apiUrl}/movements`, { params }).pipe(
      map(res => res?.data ?? res)
    );
  }

  getKardex(variantId: string, branchId: string, page = 1, limit = 50): Observable<{ data: StockMovement[]; total: number }> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<any>(`${this.apiUrl}/kardex/${variantId}/${branchId}`, { params }).pipe(
      map(res => res?.data ?? res)
    );
  }

  getAlerts(branchId?: string): Observable<StockAlert[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId);
    return this.http.get<any>(`${this.apiUrl}/alerts`, { params }).pipe(
      map(res => res?.data ?? res)
    );
  }

  initialize(payload: InitializeStockPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/initialize`, payload).pipe(
      map(res => res?.data ?? res)
    );
  }

  adjust(payload: AdjustStockPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/adjust`, payload).pipe(
      map(res => res?.data ?? res)
    );
  }
}
