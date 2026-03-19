import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
}

@Injectable({ providedIn: 'root' })
export class FileStorageService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/files/upload`;

  upload(file: File, category = 'products'): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return this.http.post<any>(this.apiUrl, formData, { withCredentials: true }).pipe(
      map(res => {
        const d = res.data ?? res;
        return {
          url: d.url,
          publicId: d.publicId,
          format: d.format,
          bytes: d.bytes,
        };
      })
    );
  }
}
