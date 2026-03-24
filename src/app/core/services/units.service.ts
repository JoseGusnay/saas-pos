import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Unit, UnitListResponse, UnitQueryFilters } from '../models/unit.models';

@Injectable({ providedIn: 'root' })
export class UnitsService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/business/units`;

  findAll(filters: UnitQueryFilters = {}): Observable<UnitListResponse> {
    let params = new HttpParams();
    if (filters.page)      params = params.set('page', filters.page.toString());
    if (filters.limit)     params = params.set('limit', filters.limit.toString());
    if (filters.sortField) params = params.set('sortField', filters.sortField);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    if (filters.search)    params = params.set('search', filters.search);
    if (filters.type)      params = params.set('type', filters.type);
    if (filters.onlyActive !== undefined) params = params.set('onlyActive', String(filters.onlyActive));
    if (filters.filterModel && Object.keys(filters.filterModel).length > 0) {
      params = params.set('filterModel', JSON.stringify(filters.filterModel));
    }
    return this.http.get<any>(this.baseUrl, { params, withCredentials: true })
      .pipe(map(res => res.data));
  }

  findOne(id: string): Observable<Unit> {
    return this.http.get<any>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  create(dto: Partial<Unit>): Observable<Unit> {
    return this.http.post<any>(this.baseUrl, dto, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  update(id: string, dto: Partial<Unit>): Observable<Unit> {
    return this.http.patch<any>(`${this.baseUrl}/${id}`, dto, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  getLogs(id: string): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/${id}/logs`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  bulkImport(units: Partial<Unit>[]): Observable<{ count: number }> {
    return this.http.post<any>(`${this.baseUrl}/bulk`, units, { withCredentials: true })
      .pipe(map(res => res.data));
  }
}
