import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Policy } from '../models/policy.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DesignerPolicyService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/policies`;

  getMyPolicies(): Observable<Policy[]> {
    const ownerId = this.authService.currentUser()?.uuid;
    return this.http.get<Policy[]>(`${this.apiUrl}/owner/${ownerId}`);
  }

  getSharedWithMe(): Observable<Policy[]> {
    return this.http.get<Policy[]>(`${this.apiUrl}/shared-with-me`);
  }
}
