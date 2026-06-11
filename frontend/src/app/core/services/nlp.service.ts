import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NlpNavigateRequest {
  spokenText: string;
}

export interface NlpNavigateResponse {
  route: string;
}

export interface NlpFillFormRequest {
  spokenText: string;
  formSchema: Record<string, string>;
}

export interface NlpFillFormResponse {
  filledForm: Record<string, string>;
}

export interface NlpIntentRequest {
  spokenText: string;
  currentRoute?: string;
}

export interface NlpIntentResponse {
  intent: 'navigate' | 'ask' | 'generate_policy' | 'fill_form' | 'open_create_policy' | 'modify_diagram' | 'compile_report';
  spoken_text: string;
}

@Injectable({ providedIn: 'root' })
export class NlpService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/workflows/ai/nlp`;

  navigate(spokenText: string): Observable<NlpNavigateResponse> {
    return this.http.post<NlpNavigateResponse>(`${this.apiUrl}/navigate`, { spokenText });
  }

  fillForm(spokenText: string, formSchema: Record<string, string>): Observable<NlpFillFormResponse> {
    return this.http.post<NlpFillFormResponse>(`${this.apiUrl}/fill-form`, { spokenText, formSchema });
  }

  detectIntent(spokenText: string, currentRoute = ''): Observable<NlpIntentResponse> {
    return this.http.post<NlpIntentResponse>(`${this.apiUrl}/intent`, { spokenText, currentRoute });
  }
}
