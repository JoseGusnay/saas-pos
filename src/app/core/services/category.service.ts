import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { Category, CategoryListResponse, CategoryQueryFilters } from '../models/category.models';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl}/business/categories` : '/business/categories';

    findAll(filters: CategoryQueryFilters): Observable<CategoryListResponse> {
        let params = new HttpParams();

        if (filters.page) params = params.set('page', filters.page.toString());
        if (filters.limit) params = params.set('limit', filters.limit.toString());
        if (filters.sortField) params = params.set('sortField', filters.sortField);
        if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder || 'ASC');
        if (filters.search) params = params.set('search', filters.search);

        if (filters.filterModel && Object.keys(filters.filterModel).length > 0) {
            params = params.set('filterModel', JSON.stringify(filters.filterModel));
        }

        return this.http.get<ApiResponse<CategoryListResponse>>(this.baseUrl, {
            params,
            withCredentials: true
        }).pipe(map(res => res.data));
    }

    findOne(id: string): Observable<Category> {
        return this.http.get<ApiResponse<Category>>(`${this.baseUrl}/${id}`, { withCredentials: true })
            .pipe(map(res => res.data));
    }

    create(category: Partial<Category>): Observable<Category> {
        return this.http.post<ApiResponse<Category>>(this.baseUrl, category, { withCredentials: true })
            .pipe(map(res => res.data));
    }

    update(id: string, category: Partial<Category>): Observable<Category> {
        return this.http.patch<ApiResponse<Category>>(`${this.baseUrl}/${id}`, category, { withCredentials: true })
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

    bulkImport(categories: Partial<Category>[]): Observable<{ count: number }> {
        return this.http.post<ApiResponse<{ count: number }>>(`${this.baseUrl}/bulk`, categories, { withCredentials: true })
            .pipe(map(res => res.data));
    }
}
