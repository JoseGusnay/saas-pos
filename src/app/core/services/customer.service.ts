import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { Customer, CustomerListResponse, CustomerQueryFilters } from '../models/customer.models';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl}/business/customers` : '/business/customers';

  findAll(filters: CustomerQueryFilters): Observable<CustomerListResponse> {
    let params = new HttpParams();

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sortField) params = params.set('sortField', filters.sortField);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    if (filters.search) params = params.set('search', filters.search);

    if (filters.filterModel && Object.keys(filters.filterModel).length > 0) {
      params = params.set('filterModel', JSON.stringify(filters.filterModel));
    }

    return this.http.get<ApiResponse<CustomerListResponse>>(this.baseUrl, {
      params,
      withCredentials: true
    }).pipe(map(res => res.data));
  }

  findOne(id: string): Observable<Customer> {
    return this.http.get<ApiResponse<Customer>>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  create(customer: Partial<Customer>): Observable<Customer> {
    return this.http.post<ApiResponse<Customer>>(this.baseUrl, customer, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  update(id: string, customer: Partial<Customer>): Observable<Customer> {
    return this.http.patch<ApiResponse<Customer>>(`${this.baseUrl}/${id}`, customer, { withCredentials: true })
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

  search(q: string, limit = 10): Observable<Customer[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    params = params.set('limit', limit.toString());

    return this.http.get<ApiResponse<Customer[]>>(`${this.baseUrl}/search`, {
      params,
      withCredentials: true
    }).pipe(map(res => res.data));
  }
}
