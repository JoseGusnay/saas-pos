import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateProductPayload, Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/business/products`;

  findAll(filters?: any): Observable<{ data: Product[], total: number }> {
    let params = new HttpParams();

    if (filters?.page) params = params.set('page', filters.page.toString());
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    if (filters?.sortField) params = params.set('sortField', filters.sortField);
    if (filters?.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    if (filters?.search) params = params.set('search', filters.search);

    if (filters?.filterModel && Object.keys(filters.filterModel).length > 0) {
        params = params.set('filterModel', JSON.stringify(filters.filterModel));
    }

    if (filters?.tab && filters.tab !== 'Todos') {
       const isActive = filters.tab === 'Activos';
       const currentFilters = filters.filterModel ? { ...filters.filterModel } : {};
       currentFilters.isActive = { filterType: 'boolean', type: 'equals', filter: isActive };
       params = params.set('filterModel', JSON.stringify(currentFilters));
    }

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => res.data)
    );
  }

  findOne(id: string): Observable<Product> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(map(res => res.data));
  }

  create(payload: CreateProductPayload): Observable<Product> {
    return this.http.post<any>(this.apiUrl, payload).pipe(map(res => res.data));
  }

  update(id: string, payload: Partial<CreateProductPayload>): Observable<Product> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, payload).pipe(map(res => res.data));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadImage(id: string, file: File): Observable<Product> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<Product>(`${this.apiUrl}/${id}/image`, formData);
  }

  bulkImport(data: any[]): Observable<{ count: number }> {
    return this.http.post<{ count: number }>(`${this.apiUrl}/bulk`, data);
  }

  getLogs(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/logs`);
  }
}
