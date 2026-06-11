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

  upload(file: File, policyId?: string, customerId?: string, requirementName?: string): Observable<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (policyId) {
      formData.append('policyId', policyId);
    }
    if (customerId) {
      formData.append('customerId', customerId);
    }
    if (requirementName) {
      formData.append('requirementName', requirementName);
    }
    return this.http.post<DocumentUploadResponse>(`${this.apiUrl}/upload`, formData);
  }

  getAll(): Observable<Document[]> {
    return this.http.get<Document[]>(this.apiUrl);
  }

  getByPolicy(policyId: string): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/policy/${policyId}`);
  }

  getByCustomer(customerId: string): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/customer/${customerId}`);
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
