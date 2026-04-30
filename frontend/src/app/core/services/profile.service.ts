import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = `${environment.apiUrl}/users`;
  private readonly authUrl = `${environment.apiUrl}/auth`;

  getMyProfile(): Observable<any> {
    return this.http.get<any>(`${this.usersUrl}/me/profile`);
  }

  updateProfile(data: { name: string; lastname: string }): Observable<any> {
    return this.http.put<any>(`${this.usersUrl}/me/profile`, data);
  }

  changePassword(data: { oldPassword: string; newPassword: string }): Observable<any> {
    return this.http.put<any>(`${this.usersUrl}/me/password`, data);
  }

  completeTour(): Observable<any> {
    return this.http.patch<any>(`${this.usersUrl}/me/complete-tour`, {});
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/reset-password`, { token, newPassword });
  }
}
