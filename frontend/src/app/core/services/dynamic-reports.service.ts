import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface KpiItem {
  title: string;
  value: string;
  format: 'number' | 'currency' | 'percentage' | 'hours' | string;
}

export interface ReportResponse {
  title: string;
  description: string;
  downloadUrl: string;
  kpis: KpiItem[];
}

@Injectable({
  providedIn: 'root'
})
export class DynamicReportsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports`;

  generateReport(prompt: string, format: 'pdf' | 'csv' | 'xlsx' | 'docx'): Observable<ReportResponse> {
    return this.http.post<ReportResponse>(`${this.apiUrl}/generate`, { prompt, format });
  }
}
