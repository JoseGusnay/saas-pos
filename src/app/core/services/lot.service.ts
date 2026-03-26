import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Lot, LotQueryFilters, CreateLotPayload, UpdateLotPayload } from '../models/stock.models';

@Injectable({ providedIn: 'root' })
export class LotService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/business/lots`;

  findAll(filters: any = {}): Observable<{ data: Lot[]; total: number }> {
    let params = new HttpParams();
    if (filters.page)         params = params.set('page', filters.page.toString());
    if (filters.limit)        params = params.set('limit', filters.limit.toString());
    if (filters.search)       params = params.set('search', filters.search);
    if (filters.variantId)    params = params.set('variantId', filters.variantId);
    if (filters.expiringSoon) params = params.set('expiringSoon', 'true');
    if (filters.sortField)    params = params.set('sortField', filters.sortField);
    if (filters.sortOrder)    params = params.set('sortOrder', filters.sortOrder);
    if (filters.filterModel && Object.keys(filters.filterModel).length > 0) {
      params = params.set('filterModel', JSON.stringify(filters.filterModel));
    }
    return this.http.get<any>(this.baseUrl, { params, withCredentials: true }).pipe(
      map(res => res.data)
    );
  }

  findOne(id: string): Observable<Lot> {
    return this.http.get<any>(`${this.baseUrl}/${id}`, { withCredentials: true }).pipe(
      map(res => res.data)
    );
  }

  create(payload: CreateLotPayload): Observable<Lot> {
    return this.http.post<any>(this.baseUrl, payload, { withCredentials: true }).pipe(
      map(res => res.data)
    );
  }

  update(id: string, payload: UpdateLotPayload): Observable<Lot> {
    return this.http.patch<any>(`${this.baseUrl}/${id}`, payload, { withCredentials: true }).pipe(
      map(res => res.data)
    );
  }
}
