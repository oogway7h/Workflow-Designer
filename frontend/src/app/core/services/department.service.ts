import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/departments`;

  getAll(): Observable<Department[]> {
    return this.http.get<Department[]>(this.apiUrl);
  }

  getByUuid(uuid: string): Observable<Department> {
    return this.http.get<Department>(`${this.apiUrl}/${uuid}`);
  }

  create(department: CreateDepartmentRequest): Observable<Department> {
    return this.http.post<Department>(this.apiUrl, department);
  }

  update(uuid: string, department: UpdateDepartmentRequest): Observable<Department> {
    return this.http.put<Department>(`${this.apiUrl}/${uuid}`, department);
  }

  delete(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${uuid}`);
  }
}
