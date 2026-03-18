import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UserRole {
  id: string;
  name: string;
  displayName?: string;
}

export interface UserBranch {
  id: string;
  name: string;
}

export interface TenantUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  isActive: boolean;
  isProtected: boolean;
  phone?: string;
  countryCode?: string;
  roles: UserRole[];

  branches: UserBranch[];
  createdAt: string;
  updatedAt: string;
}

export interface UserQueryResponse {
  data: TenantUser[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/business/users`;

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

    return this.http.get<any>(this.apiUrl, { params: httpParams }).pipe(map(res => res.data));
  }

  getById(id: string): Observable<TenantUser> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(map(res => res.data));
  }

  create(user: any): Observable<TenantUser> {
    return this.http.post<any>(this.apiUrl, user).pipe(map(res => res.data));
  }

  update(id: string, user: any): Observable<TenantUser> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, user).pipe(map(res => res.data));
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(map(res => res.data));
  }

  bulkImport(users: any[]): Observable<{ imported: number; errors: string[] }> {
    return this.http.post<any>(`${this.apiUrl}/bulk-import`, { users }).pipe(map(res => res.data));
  }

  getLogs(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/logs`).pipe(map(res => (res as any).data));
  }
}
