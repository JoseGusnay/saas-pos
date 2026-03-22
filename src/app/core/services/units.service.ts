import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  type: 'WEIGHT' | 'VOLUME' | 'UNIT';
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class UnitsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/business/units`;

  findAll(filters?: { search?: string; type?: string; onlyActive?: boolean }): Observable<{ data: Unit[]; total: number }> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.onlyActive !== undefined) params = params.set('onlyActive', String(filters.onlyActive));
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => res.data ?? res)
    );
  }
}
