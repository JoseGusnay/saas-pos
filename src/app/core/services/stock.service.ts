import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  StockLevel, StockMovement, StockAlert, LotStockEntry,
  AdjustStockPayload, TransferStockPayload,
  StockLevelFilters, StockMovementFilters, KardexResponse,
} from '../models/stock.models';

@Injectable({ providedIn: 'root' })
export class StockService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/business/stock`;

  getLevels(filters?: StockLevelFilters): Observable<{ data: StockLevel[]; total: number }> {
    let params = new HttpParams();
    if (filters?.page)        params = params.set('page', filters.page);
    if (filters?.limit)       params = params.set('limit', filters.limit);
    if (filters?.search)      params = params.set('search', filters.search);
    if (filters?.warehouseId) params = params.set('warehouseId', filters.warehouseId);
    if (filters?.branchId)    params = params.set('branchId', filters.branchId);
    if (filters?.lowStock)    params = params.set('lowStock', 'true');
    return this.http.get<any>(`${this.apiUrl}/levels`, { params }).pipe(
      map(res => res?.data ?? res)
    );
  }

  getMovements(filters?: StockMovementFilters): Observable<{ data: StockMovement[]; total: number }> {
    let params = new HttpParams();
    if (filters?.page)        params = params.set('page', filters.page);
    if (filters?.limit)       params = params.set('limit', filters.limit);
    if (filters?.search)      params = params.set('search', filters.search);
    if (filters?.warehouseId) params = params.set('warehouseId', filters.warehouseId);
    if (filters?.branchId)    params = params.set('branchId', filters.branchId);
    if (filters?.variantId)   params = params.set('variantId', filters.variantId);
    if (filters?.type)        params = params.set('type', filters.type);
    return this.http.get<any>(`${this.apiUrl}/movements`, { params }).pipe(
      map(res => res?.data ?? res)
    );
  }

  getKardex(
    variantId: string, warehouseId: string,
    page = 1, limit = 50,
    filters?: { type?: string; dateFrom?: string; dateTo?: string },
  ): Observable<KardexResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters?.type)     params = params.set('type', filters.type);
    if (filters?.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo)   params = params.set('dateTo', filters.dateTo);
    return this.http.get<any>(`${this.apiUrl}/kardex/${variantId}/${warehouseId}`, { params }).pipe(
      map(res => res?.data ?? res)
    );
  }

  exportKardex(
    variantId: string, warehouseId: string,
    format: 'xlsx' | 'pdf' = 'xlsx',
    filters?: { type?: string; dateFrom?: string; dateTo?: string },
  ): void {
    let params = new HttpParams().set('format', format);
    if (filters?.type)     params = params.set('type', filters.type);
    if (filters?.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo)   params = params.set('dateTo', filters.dateTo);
    this.http.get(`${this.apiUrl}/kardex/${variantId}/${warehouseId}/export`, {
      params, responseType: 'blob', withCredentials: true,
    }).subscribe(blob => {
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kardex_${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  getAlerts(warehouseId?: string, branchId?: string): Observable<StockAlert[]> {
    let params = new HttpParams();
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    if (branchId) params = params.set('branchId', branchId);
    return this.http.get<any>(`${this.apiUrl}/alerts`, { params }).pipe(
      map(res => res?.data ?? res)
    );
  }

  getAvailable(variantId: string, warehouseId: string, locationId?: string): Observable<{ physical: number; reserved: number; available: number }> {
    let params = new HttpParams();
    if (locationId) params = params.set('locationId', locationId);
    return this.http.get<any>(`${this.apiUrl}/available/${variantId}/${warehouseId}`, { params }).pipe(
      map(res => res?.data ?? res)
    );
  }

  getLotStock(variantId: string, warehouseId: string): Observable<LotStockEntry[]> {
    return this.http.get<any>(`${this.apiUrl}/lots/${variantId}/${warehouseId}`).pipe(
      map(res => res?.data ?? res)
    );
  }

  getLevel(variantId: string, warehouseId: string, locationId?: string, lotId?: string): Observable<StockLevel | null> {
    let params = new HttpParams();
    if (locationId) params = params.set('locationId', locationId);
    if (lotId) params = params.set('lotId', lotId);
    return this.http.get<any>(`${this.apiUrl}/levels/${variantId}/${warehouseId}`, { params }).pipe(
      map(res => res?.data ?? res)
    );
  }

  adjust(payload: AdjustStockPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/adjust`, payload).pipe(
      map(res => res?.data ?? res)
    );
  }

  transfer(payload: TransferStockPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/transfer`, payload).pipe(
      map(res => res?.data ?? res)
    );
  }
}
