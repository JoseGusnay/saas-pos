import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tax } from '../models/tax.models';

@Injectable({
  providedIn: 'root'
})
export class TaxService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/business/taxes`;

  findAll(): Observable<Tax[]> {
    return this.http.get<Tax[]>(this.apiUrl);
  }

  findOne(id: string): Observable<Tax> {
    return this.http.get<Tax>(`${this.apiUrl}/${id}`);
  }

  create(payload: any): Observable<Tax> {
    return this.http.post<Tax>(this.apiUrl, payload);
  }

  update(id: string, payload: any): Observable<Tax> {
    return this.http.patch<Tax>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
