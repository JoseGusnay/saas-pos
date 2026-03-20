import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Supplier, CreateSupplierPayload } from '../models/supplier.models';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/business/suppliers`;

  findAll(filters?: any): Observable<{ data: Supplier[]; total: number }> {
    let params = new HttpParams();
    if (filters?.page)       params = params.set('page', filters.page);
    if (filters?.limit)      params = params.set('limit', filters.limit);
    if (filters?.search)     params = params.set('search', filters.search);
    if (filters?.sortField)  params = params.set('sortField', filters.sortField);
    if (filters?.sortOrder)  params = params.set('sortOrder', filters.sortOrder);
    if (filters?.filterModel && Object.keys(filters.filterModel).length > 0) {
      params = params.set('filterModel', JSON.stringify(filters.filterModel));
    }
    return this.http.get<any>(this.apiUrl, { params }).pipe(map(res => res?.data ?? res));
  }

  findAllSimple(): Observable<Supplier[]> {
    return this.http.get<any>(`${this.apiUrl}/simple`).pipe(
      map(res => {
        const payload = res?.data ?? res;
        return Array.isArray(payload) ? payload : (payload?.data ?? []);
      })
    );
  }

  findOne(id: string): Observable<Supplier> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(map(res => res?.data ?? res));
  }

  create(payload: CreateSupplierPayload): Observable<Supplier> {
    return this.http.post<any>(this.apiUrl, payload).pipe(map(res => res?.data ?? res));
  }

  update(id: string, payload: Partial<CreateSupplierPayload>): Observable<Supplier> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, payload).pipe(map(res => res?.data ?? res));
  }

  remove(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(map(res => res?.data ?? res));
  }

  getLogs(id: string): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/${id}/logs`).pipe(map(res => res?.data ?? res));
  }
}
