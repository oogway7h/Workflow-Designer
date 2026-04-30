import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Policy,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  UpdatePolicyStateRequest,
  UpdatePolicyDiagramRequest,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class PolicyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/policies`;

  getAll(): Observable<Policy[]> {
    return this.http.get<Policy[]>(this.apiUrl);
  }

  getByUuid(uuid: string): Observable<Policy> {
    return this.http.get<Policy>(`${this.apiUrl}/${uuid}`);
  }

  getAssignedPolicies(managerId: string): Observable<Policy[]> {
    return this.http.get<Policy[]>(`${this.apiUrl}/manager/${managerId}`);
  }

  assignActivityToUser(policyId: string, activityId: string, userId: string): Observable<any> {
    // Modify this URL according to your backend endpoint for assigning a user to a policy's activity/task.
    return this.http.post<any>(`${this.apiUrl}/${policyId}/activities/${activityId}/assign`, { userId });
  }

  startInstance(policyUuid: string, managerId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/workflow/start?policyUuid=${policyUuid}&managerId=${managerId}`, {});
  }

  create(policy: CreatePolicyRequest): Observable<Policy> {
    return this.http.post<Policy>(this.apiUrl, policy);
  }

  update(uuid: string, policy: UpdatePolicyRequest): Observable<Policy> {
    return this.http.put<Policy>(`${this.apiUrl}/${uuid}`, policy);
  }

  updateState(uuid: string, stateReq: UpdatePolicyStateRequest): Observable<Policy> {
    return this.http.patch<Policy>(`${this.apiUrl}/${uuid}/state`, stateReq);
  }

  updateDiagram(uuid: string, diagram: UpdatePolicyDiagramRequest): Observable<Policy> {
    return this.http.put<Policy>(`${this.apiUrl}/${uuid}/diagram`, diagram);
  }

  share(uuid: string, collaboratorIds: string[]): Observable<Policy> {
    return this.http.put<Policy>(`${this.apiUrl}/${uuid}/share`, { collaboratorIds });
  }

  autoAssignPolicy(policyUuid: string): Observable<Policy> {
    return this.http.post<Policy>(`${this.apiUrl}/${policyUuid}/auto-assign`, {});
  }

  delete(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${uuid}`);
  }

  getPendingTasks(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/workflow/tasks/pending`);
  }

  getActiveTasksByRole(role: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/workflow/tasks/pending`);
  }

  getManagedInstances(managerId?: string): Observable<any[]> {
    const url = managerId
      ? `${environment.apiUrl}/workflow/instances/managed?managerId=${managerId}`
      : `${environment.apiUrl}/workflow/instances/managed`;
    return this.http.get<any[]>(url);
  }

  getAllInstances(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/workflow/instances`);
  }

  getHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/workflow/history`);
  }

  getInstanceDetails(instanceUuid: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/workflow/instances/${instanceUuid}`);
  }

  completeTask(instanceUuid: string, payload: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/workflow/tasks/${instanceUuid}/complete`, payload);
  }

  getEmployeeDashboard(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/workflow/dashboard/employee`);
  }

  getInstanceHistory(instanceUuid: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/workflow/instances/${instanceUuid}/history`);
  }

  getIncomingInstances(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/workflow/instances/incoming`);
  }

  claimInstance(instanceUuid: string): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/workflow/instances/${instanceUuid}/claim`, {});
  }
}
