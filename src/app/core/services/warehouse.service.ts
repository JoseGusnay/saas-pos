import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import {
  Warehouse, Location,
  WarehouseListResponse, LocationListResponse,
  WarehouseQueryFilters, LocationQueryFilters,
  CreateWarehousePayload, UpdateWarehousePayload,
  CreateLocationPayload, UpdateLocationPayload,
} from '../models/warehouse.models';

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/business/warehouses`;
  private readonly locationsUrl = `${environment.apiUrl}/business/locations`;

  // ── Warehouses ────────────────────────────────────────────────────────────

  findAll(filters: WarehouseQueryFilters): Observable<WarehouseListResponse> {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sortField) params = params.set('sortField', filters.sortField);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.branchId) params = params.set('branchId', filters.branchId);
    if (filters.isActive !== undefined) params = params.set('isActive', String(filters.isActive));
    if (filters.filterModel && Object.keys(filters.filterModel).length > 0) {
      params = params.set('filterModel', JSON.stringify(filters.filterModel));
    }
    return this.http.get<ApiResponse<WarehouseListResponse>>(this.baseUrl, { params, withCredentials: true })
      .pipe(map(r => r.data));
  }

  findOne(id: string): Observable<Warehouse> {
    return this.http.get<ApiResponse<Warehouse>>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  create(payload: CreateWarehousePayload): Observable<Warehouse> {
    return this.http.post<ApiResponse<Warehouse>>(this.baseUrl, payload, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  update(id: string, payload: UpdateWarehousePayload): Observable<Warehouse> {
    return this.http.patch<ApiResponse<Warehouse>>(`${this.baseUrl}/${id}`, payload, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { withCredentials: true });
  }

  getLogs(id: string): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/${id}/logs`, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  // ── Locations ─────────────────────────────────────────────────────────────

  copyLocationsFrom(sourceWarehouseId: string, targetWarehouseId: string): Observable<{ count: number }> {
    return this.http.post<ApiResponse<{ count: number }>>(
      `${this.locationsUrl}/copy-from/${sourceWarehouseId}`,
      { targetWarehouseId },
      { withCredentials: true },
    ).pipe(map(r => r.data));
  }

  findLocations(filters: LocationQueryFilters): Observable<LocationListResponse> {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.warehouseId) params = params.set('warehouseId', filters.warehouseId);
    if (filters.isActive !== undefined) params = params.set('isActive', String(filters.isActive));
    return this.http.get<ApiResponse<LocationListResponse>>(this.locationsUrl, { params, withCredentials: true })
      .pipe(map(r => r.data));
  }

  createLocation(payload: CreateLocationPayload): Observable<Location> {
    return this.http.post<ApiResponse<Location>>(this.locationsUrl, payload, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  updateLocation(id: string, payload: UpdateLocationPayload): Observable<Location> {
    return this.http.patch<ApiResponse<Location>>(`${this.locationsUrl}/${id}`, payload, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  removeLocation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.locationsUrl}/${id}`, { withCredentials: true });
  }
}
