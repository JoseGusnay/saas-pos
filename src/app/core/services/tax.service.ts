import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tax } from '../models/tax.models';

@Injectable({
  providedIn: 'root'
})
export class TaxService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/business/taxes`;

  findAll(filters?: any): Observable<{ data: Tax[], total: number }> {
    let params = new HttpParams();
    if (filters?.page)       params = params.set('page', filters.page);
    if (filters?.limit)      params = params.set('limit', filters.limit);
    if (filters?.search)     params = params.set('search', filters.search);
    if (filters?.sortField)  params = params.set('sortField', filters.sortField);
    if (filters?.sortOrder)  params = params.set('sortOrder', filters.sortOrder);
    if (filters?.filterModel && Object.keys(filters.filterModel).length > 0) {
      params = params.set('filterModel', JSON.stringify(filters.filterModel));
    }
    return this.http.get<any>(this.apiUrl, { params, withCredentials: true })
      .pipe(map(res => res.data));
  }

  findAllSimple(): Observable<Tax[]> {
    return this.http.get<any>(this.apiUrl, { withCredentials: true }).pipe(
      map(res => {
        const payload = res?.data ?? res;
        return Array.isArray(payload) ? payload : (payload?.data ?? []);
      })
    );
  }

  findOne(id: string): Observable<Tax> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  create(payload: any): Observable<Tax> {
    return this.http.post<any>(this.apiUrl, payload, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  update(id: string, payload: any): Observable<Tax> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, payload, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  getLogs(id: string): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/${id}/logs`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  bulkImport(taxes: Partial<Tax>[]): Observable<{ count: number }> {
    return this.http.post<any>(`${this.apiUrl}/bulk`, taxes, { withCredentials: true })
      .pipe(map(res => res.data));
  }
}
