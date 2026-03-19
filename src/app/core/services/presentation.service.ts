import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { Presentation, PresentationListResponse, PresentationQueryFilters } from '../models/presentation.models';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PresentationService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl}/business/presentations` : '/business/presentations';

  findAll(filters: PresentationQueryFilters): Observable<PresentationListResponse> {
    let params = new HttpParams();

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sortField) params = params.set('sortField', filters.sortField);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    if (filters.search) params = params.set('search', filters.search);

    if (filters.filterModel && Object.keys(filters.filterModel).length > 0) {
      params = params.set('filterModel', JSON.stringify(filters.filterModel));
    }

    return this.http.get<ApiResponse<PresentationListResponse>>(this.baseUrl, {
      params,
      withCredentials: true
    }).pipe(map(res => res.data));
  }

  findOne(id: string): Observable<Presentation> {
    return this.http.get<ApiResponse<Presentation>>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  create(presentation: Partial<Presentation>): Observable<Presentation> {
    return this.http.post<ApiResponse<Presentation>>(this.baseUrl, presentation, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  update(id: string, presentation: Partial<Presentation>): Observable<Presentation> {
    return this.http.patch<ApiResponse<Presentation>>(`${this.baseUrl}/${id}`, presentation, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<ApiResponse<{ success: boolean; message: string }>>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  getLogs(id: string): Observable<Record<string, unknown>[]> {
    return this.http.get<ApiResponse<Record<string, unknown>[]>>(`${this.baseUrl}/${id}/logs`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  bulkImport(presentations: Partial<Presentation>[]): Observable<{ count: number }> {
    return this.http.post<ApiResponse<{ count: number }>>(`${this.baseUrl}/bulk`, presentations, { withCredentials: true })
      .pipe(map(res => res.data));
  }
}
