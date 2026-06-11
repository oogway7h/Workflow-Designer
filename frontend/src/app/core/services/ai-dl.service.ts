import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RouteIntentRequest {
  text: string;
}

export interface PolicyPrediction {
  policy_id: string;
  confidence: number;
}

export interface RouteIntentResponse {
  policy_id: string;
  confidence: number;
  all_predictions: any[];
}

export interface BottleneckInputItem {
  department_id: string;
  day_of_week: number;
  hour_of_day: number;
  duration_hours: number;
  task_id: string;
  instance_id?: string;
}

export interface AnalyzeBottlenecksRequest {
  items: BottleneckInputItem[];
}

export interface BottleneckItem {
  item_index: number;
  reconstruction_error: number;
  is_anomaly: boolean;
  risk_score: number;
  instance_id?: string;
}

export interface AnalyzeBottlenecksResponse {
  results: BottleneckItem[];
}

export interface CandidateInput {
  employee_id: string;
  pending_tasks: number;
}

export interface BestRouteRequest {
  policy_id: string;
  activity_id: string;
  candidates: CandidateInput[];
}

export interface CandidateEstimate {
  employee_id: string;
  estimated_hours: number;
}

export interface BestRouteResponse {
  best_employee_id: string;
  estimated_hours: number;
  all_estimates: CandidateEstimate[];
}

@Injectable({
  providedIn: 'root'
})
export class AiDlService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/workflows/ai/dl`;

  routeIntent(text: string): Observable<RouteIntentResponse> {
    return this.http.post<RouteIntentResponse>(`${this.apiUrl}/route-intent`, { text });
  }

  analyzeBottlenecks(items: BottleneckInputItem[]): Observable<AnalyzeBottlenecksResponse> {
    return this.http.post<AnalyzeBottlenecksResponse>(`${this.apiUrl}/analyze-bottlenecks`, { items });
  }

  analyzeBottlenecksForPolicy(policyId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/analyze-bottlenecks/${policyId}`);
  }

  findBestRoute(policyId: string, activityId: string, candidates: CandidateInput[]): Observable<BestRouteResponse> {
    return this.http.post<BestRouteResponse>(`${this.apiUrl}/best-route`, {
      policy_id: policyId,
      activity_id: activityId,
      candidates
    });
  }

  getDlStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/status`);
  }

  suggestPolicies(text: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/suggest-policies`, { text });
  }

  trainDlModels(epochsNlp: number = 50, epochsBottleneck: number = 100, epochsCompletion: number = 100): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/train`, {
      epochs_nlp: epochsNlp,
      epochs_bottleneck: epochsBottleneck,
      epochs_completion: epochsCompletion
    });
  }
}
