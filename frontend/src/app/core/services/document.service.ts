import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Document, DocumentAudit, DocumentUploadResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/documents`;

  upload(file: File, policyId?: string): Observable<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (policyId) {
      formData.append('policyId', policyId);
    }
    return this.http.post<DocumentUploadResponse>(`${this.apiUrl}/upload`, formData);
  }

  getAll(): Observable<Document[]> {
    return this.http.get<Document[]>(this.apiUrl);
  }

  getByPolicy(policyId: string): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/policy/${policyId}`);
  }

  download(uuid: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${uuid}/download`, { responseType: 'blob' });
  }

  getPresignedUrl(uuid: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.apiUrl}/${uuid}/url`);
  }

  delete(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${uuid}`);
  }

  getAudit(uuid: string): Observable<DocumentAudit[]> {
    return this.http.get<DocumentAudit[]>(`${this.apiUrl}/${uuid}/audit`);
  }

  getRecentAudit(): Observable<DocumentAudit[]> {
    return this.http.get<DocumentAudit[]>(`${this.apiUrl}/audit/recent`);
  }
}
