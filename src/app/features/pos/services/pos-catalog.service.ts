import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/auth.models';
import { PosCatalogResponse, PosCatalogCategory } from '../models/pos.models';

export interface PosCatalogQuery {
  branchId: string;
  warehouseId: string;
  categoryId?: string;
  search?: string;
  barcode?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class PosCatalogService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/business/pos`;

  categories(branchId: string, warehouseId: string): Observable<PosCatalogCategory[]> {
    const params = new HttpParams()
      .set('branchId', branchId)
      .set('warehouseId', warehouseId);

    return this.http
      .get<ApiResponse<PosCatalogCategory[]>>(`${this.baseUrl}/categories`, {
        params,
        withCredentials: true,
      })
      .pipe(map((res) => res.data));
  }

  catalog(query: PosCatalogQuery): Observable<PosCatalogResponse> {
    let params = new HttpParams()
      .set('branchId', query.branchId)
      .set('warehouseId', query.warehouseId);

    if (query.categoryId) params = params.set('categoryId', query.categoryId);
    if (query.search) params = params.set('search', query.search);
    if (query.barcode) params = params.set('barcode', query.barcode);
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());

    return this.http
      .get<ApiResponse<PosCatalogResponse>>(`${this.baseUrl}/catalog`, {
        params,
        withCredentials: true,
      })
      .pipe(map((res) => res.data));
  }
}
