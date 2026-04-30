import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Role, CreateRoleRequest, UpdateRoleRequest } from '../models';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/roles`;

  getAll(): Observable<Role[]> {
    return this.http.get<Role[]>(this.apiUrl);
  }

  getByUuid(uuid: string): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/${uuid}`);
  }

  create(role: CreateRoleRequest): Observable<Role> {
    return this.http.post<Role>(this.apiUrl, role);
  }

  update(uuid: string, role: UpdateRoleRequest): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/${uuid}`, role);
  }

  delete(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${uuid}`);
  }
}
