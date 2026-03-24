import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Role {
  id: string;
  name: string;
  displayName?: string;
  permissions?: any[];
  createdAt?: Date;
}

export interface CreateRoleDto {
  name: string;
  permissionIds: string[];
}

export interface UpdateRoleDto {
  name?: string;
  permissionIds?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/business/roles`;

  getAll(params: any = {}): Observable<any> {
    let httpParams = new HttpParams();

    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        if (typeof params[key] === 'object') {
          httpParams = httpParams.set(key, JSON.stringify(params[key]));
        } else {
          httpParams = httpParams.set(key, params[key]);
        }
      }
    });

    return this.http.get<any>(this.apiUrl, { params: httpParams, withCredentials: true })
      .pipe(map(res => res.data));
  }

  getPermissions(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/permissions`, { withCredentials: true }).pipe(
      map(res => {
        if (res && res.data && Array.isArray(res.data)) return res.data;
        if (res && res.data && res.data.data && Array.isArray(res.data.data)) return res.data.data;
        if (Array.isArray(res)) return res;
        return [];
      })
    );
  }

  create(data: CreateRoleDto): Observable<Role> {
    return this.http.post<any>(this.apiUrl, data, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  update(id: string, data: UpdateRoleDto): Observable<Role> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { withCredentials: true })
      .pipe(map(res => res.data));
  }

  getLogs(id: string): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/${id}/logs`, { withCredentials: true })
      .pipe(map(res => res.data || res));
  }
}
