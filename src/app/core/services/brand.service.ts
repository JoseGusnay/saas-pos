import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { Brand, BrandListResponse, BrandQueryFilters } from '../models/brand.models';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BrandService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl}/business/brands` : '/business/brands';

  /**
   * Obtiene la lista de marcas con soporte para búsqueda, filtros avanzados y paginación.
   */
  findAll(filters: BrandQueryFilters): Observable<BrandListResponse> {
    let params = new HttpParams();

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sortField) params = params.set('sortField', filters.sortField);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    if (filters.search) params = params.set('search', filters.search);

    if (filters.filterModel && Object.keys(filters.filterModel).length > 0) {
      params = params.set('filterModel', JSON.stringify(filters.filterModel));
    }

    return this.http.get<ApiResponse<BrandListResponse>>(this.baseUrl, {
      params,
      withCredentials: true
    }).pipe(map(res => res.data));
  }

  findOne(id: string): Observable<Brand> {
    return this.http.get<ApiResponse<Brand>>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  create(brand: Partial<Brand>): Observable<Brand> {
    return this.http.post<ApiResponse<Brand>>(this.baseUrl, brand, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  update(id: string, brand: Partial<Brand>): Observable<Brand> {
    return this.http.patch<ApiResponse<Brand>>(`${this.baseUrl}/${id}`, brand, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<ApiResponse<{ success: boolean; message: string }>>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  getLogs(id: string): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/${id}/logs`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  bulkImport(brands: Partial<Brand>[]): Observable<{ count: number }> {
    return this.http.post<ApiResponse<{ count: number }>>(`${this.baseUrl}/bulk`, brands, { withCredentials: true })
      .pipe(map(res => res.data));
  }
}
