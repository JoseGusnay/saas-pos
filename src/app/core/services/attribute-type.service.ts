import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { AttributeType } from '../../features/inventory/models/product.model';

@Injectable({ providedIn: 'root' })
export class AttributeTypeService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/business/attribute-types`;

  findAll(): Observable<AttributeType[]> {
    return this.http
      .get<ApiResponse<AttributeType[]>>(this.baseUrl, { withCredentials: true })
      .pipe(map(res => res.data));
  }
}
