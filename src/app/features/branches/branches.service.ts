import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Branch, BranchesResponse, BranchForm } from './branch.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BranchesService {
    private readonly http = inject(HttpClient);
    // Base URL — adjust to env variable when available
    private readonly base = `${environment.apiUrl}/api/business/branches`;

    findAll(params: {
        page?: number;
        limit?: number;
        search?: string;
        sortField?: string;
        sortOrder?: string;
    }): Observable<BranchesResponse> {
        let httpParams = new HttpParams()
            .set('page', params.page ?? 1)
            .set('limit', params.limit ?? 10);

        if (params.search) httpParams = httpParams.set('search', params.search);
        if (params.sortField) httpParams = httpParams.set('sortField', params.sortField);
        if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

        return this.http.get<{ data: BranchesResponse }>(this.base, { params: httpParams }).pipe(
            map(res => res.data),
        );
    }

    findOne(id: string): Observable<Branch> {
        return this.http.get<{ data: Branch }>(`${this.base}/${id}`).pipe(
            map(res => res.data),
        );
    }

    create(body: BranchForm): Observable<Branch> {
        return this.http.post<{ data: Branch }>(this.base, body).pipe(
            map(res => res.data),
        );
    }

    update(id: string, body: Partial<BranchForm>): Observable<Branch> {
        return this.http.patch<{ data: Branch }>(`${this.base}/${id}`, body).pipe(
            map(res => res.data),
        );
    }

    patch(id: string, body: Partial<Branch>): Observable<Branch> {
        return this.http.patch<{ data: Branch }>(`${this.base}/${id}`, body).pipe(
            map(res => res.data),
        );
    }

    remove(id: string): Observable<{ success: boolean; message: string }> {
        return this.http.delete<{ success: boolean; message: string }>(`${this.base}/${id}`);
    }
}
