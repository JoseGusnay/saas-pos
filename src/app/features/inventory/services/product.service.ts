import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateProductPayload, Product, VariantBranchPrice, ProductBranchSetting } from '../models/product.model';

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

    if (filters?.typeFilter) {
      params = params.set('type', filters.typeFilter);
    }

    return this.http.get<any>(this.apiUrl, { params, withCredentials: true })
      .pipe(map(res => res.data));
  }

  findOne(id: string): Observable<Product> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  create(data: FormData | CreateProductPayload): Observable<Product> {
    const body = data instanceof FormData ? data : this.toFormData(data);
    return this.http.post<any>(this.apiUrl, body, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  update(id: string, data: FormData | Partial<CreateProductPayload>): Observable<Product> {
    const body = data instanceof FormData ? data : this.toFormData(data);
    return this.http.patch<any>(`${this.apiUrl}/${id}`, body, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  private toFormData(payload: any): FormData {
    const fd = new FormData();
    fd.append('payload', JSON.stringify(payload));
    return fd;
  }

  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  uploadImage(id: string, file: File): Observable<Product> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<any>(`${this.apiUrl}/${id}/image`, formData, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  bulkImport(data: {
    name: string;
    categoryName: string;
    type: string;
    description?: string;
    isActive: boolean;
    variants: { sku?: string; barcode?: string; variantName?: string; costPrice: number; salePrice: number }[];
  }[]): Observable<{ count: number }> {
    return this.http.post<any>(`${this.apiUrl}/bulk`, data, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  getLogs(id: string): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/${id}/logs`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  getProductBranches(productId: string): Observable<ProductBranchSetting[]> {
    return this.http.get<any>(`${this.apiUrl}/${productId}/branches`, { withCredentials: true })
      .pipe(map(res => res.data ?? res));
  }

  upsertProductBranch(productId: string, branchId: string, payload: { isAvailable: boolean }): Observable<ProductBranchSetting> {
    return this.http.put<any>(`${this.apiUrl}/${productId}/branches/${branchId}`, payload, { withCredentials: true })
      .pipe(map(res => res.data ?? res));
  }

  deleteProductBranch(productId: string, branchId: string): Observable<void> {
    return this.http.delete<any>(`${this.apiUrl}/${productId}/branches/${branchId}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  getVariantPrices(productId: string, variantId: string): Observable<VariantBranchPrice[]> {
    return this.http.get<any>(`${this.apiUrl}/${productId}/variants/${variantId}/prices`, { withCredentials: true })
      .pipe(map(res => res.data ?? res));
  }

  upsertVariantPrice(productId: string, variantId: string, branchId: string, payload: { salePrice: number; isActive?: boolean }): Observable<VariantBranchPrice> {
    return this.http.put<any>(`${this.apiUrl}/${productId}/variants/${variantId}/prices/${branchId}`, payload, { withCredentials: true })
      .pipe(map(res => res.data ?? res));
  }

  deleteVariantPrice(productId: string, variantId: string, branchId: string): Observable<void> {
    return this.http.delete<any>(`${this.apiUrl}/${productId}/variants/${variantId}/prices/${branchId}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  searchVariants(search: string, excludeProductId?: string, types?: string[], stockTrackable?: boolean): Observable<{ variantId: string; variantName: string; productName: string; sku?: string; salePrice: number; imageUrl?: string }[]> {
    let params = new HttpParams().set('search', search).set('limit', '15');
    if (excludeProductId) params = params.set('excludeProductId', excludeProductId);
    if (types?.length) params = params.set('types', types.join(','));
    if (stockTrackable) params = params.set('stockTrackable', 'true');
    return this.http.get<any>(`${this.apiUrl}/variants/search`, { params, withCredentials: true })
      .pipe(map(res => res.data ?? res));
  }

  searchVariantsAdvanced(filters: { search: string; page?: number; limit?: number; isPurchasable?: boolean }): Observable<{ data: any[]; hasMore: boolean }> {
    let params = new HttpParams().set('search', filters.search);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.limit) params = params.set('limit', String(filters.limit));
    if (filters.isPurchasable) params = params.set('isPurchasable', 'true');
    return this.http.get<any>(`${this.apiUrl}/variants/search`, { params, withCredentials: true }).pipe(
      map(res => {
        const payload = res?.data ?? res;
        return { data: payload?.data ?? payload ?? [], hasMore: payload?.hasMore ?? false };
      })
    );
  }
}
