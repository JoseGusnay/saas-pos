import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { Branch, BranchListResponse, BranchQueryFilters, CreateBranchPayload } from '../models/branch.models';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class BranchService {
    private http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl}/business/branches` : '/business/branches';

    /**
     * Obtiene la lista de sucursales con soporte para búsqueda, filtros avanzados y paginación.
     */
    findAll(filters: BranchQueryFilters): Observable<BranchListResponse> {
        let params = new HttpParams();

        if (filters.page) params = params.set('page', filters.page.toString());
        if (filters.limit) params = params.set('limit', filters.limit.toString());
        if (filters.sortField) params = params.set('sortField', filters.sortField);
        if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
        if (filters.search) params = params.set('search', filters.search);

        // El filterModel se envía como JSON string para que el backend lo parsee
        if (filters.filterModel && Object.keys(filters.filterModel).length > 0) {
            params = params.set('filterModel', JSON.stringify(filters.filterModel));
        }

        return this.http.get<ApiResponse<BranchListResponse>>(this.baseUrl, {
            params,
            withCredentials: true
        })
            .pipe(map(res => res.data));
    }

    findOne(id: string): Observable<Branch> {
        return this.http.get<ApiResponse<Branch>>(`${this.baseUrl}/${id}`, { withCredentials: true })
            .pipe(map(res => res.data));
    }

    create(branch: CreateBranchPayload): Observable<Branch> {
        return this.http.post<ApiResponse<Branch>>(this.baseUrl, branch, { withCredentials: true })
            .pipe(map(res => res.data));
    }

    update(id: string, branch: CreateBranchPayload): Observable<Branch> {
        return this.http.patch<ApiResponse<Branch>>(`${this.baseUrl}/${id}`, branch, { withCredentials: true })
            .pipe(map(res => res.data));
    }

    remove(id: string): Observable<{ success: boolean; message: string }> {
        return this.http.delete<ApiResponse<{ success: boolean; message: string }>>(`${this.baseUrl}/${id}`, { withCredentials: true })
            .pipe(map(res => res.data));
    }

    bulkImport(branches: any[]): Observable<{ count: number }> {
        return this.http.post<ApiResponse<{ count: number }>>(`${this.baseUrl}/bulk-import`, { branches }, { withCredentials: true })
            .pipe(map(res => res.data));
    }

    getLogs(id: string): Observable<any[]> {
        return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/${id}/logs`, { withCredentials: true })
            .pipe(map(res => res.data));
    }
}
