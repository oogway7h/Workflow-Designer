import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, DecodedToken, UserInfo } from '../models';
import { UserRole } from '../config/menu.config';

/** Maps internal role strings to UserRole tokens (all English now) */
const ROLE_NAME_MAPPING: Record<string, UserRole> = {
  'EMPLOYEE': 'EMPLOYEE',
  'DESIGNER': 'DESIGNER',
  'MANAGER': 'MANAGER',
  'ADMIN': 'ADMIN',
  'CUSTOMER': 'CUSTOMER',
  // Spanish fallbacks for old tokens already in localStorage
  'Funcionario': 'EMPLOYEE',
  'Diseñador de Politicas': 'DESIGNER',
  'Diseñador de Políticas': 'DESIGNER',
  'Gestor de Politicas': 'MANAGER',
  'Gestor de Políticas': 'MANAGER',
  'Administrador': 'ADMIN',
};

const USER_CACHE_KEY = 'auth_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  currentUser = signal<UserInfo | null>(this.loadCachedUser());

  login(credentials: LoginRequest): Observable<void> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        localStorage.setItem('auth_token', response.token);
        const partial = this.decodeToken(response.token);
        if (partial) {
          // Map role to internal UserRole (fallback to EMPLOYEE if unknown)
          const userRole: UserRole = (ROLE_NAME_MAPPING[partial.role] ?? 'EMPLOYEE') as UserRole;
          const userInfo: UserInfo = {
            uuid: partial.uuid,
            name: partial.name,
            email: partial.email,
            roleId: partial.roleId,
            role: userRole,
          };
          this.cacheUser(userInfo);
          this.currentUser.set(userInfo);
        }
      }),
      map(() => void 0)
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem(USER_CACHE_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? payload.exp * 1000 > Date.now() : true;
    } catch {
      return false;
    }
  }

  getCurrentUserRole(): UserRole | null {
    const user = this.currentUser();
    if (user?.role) {
      return user.role as UserRole;
    }
    return null;
  }

  hasRole(role: UserRole): boolean {
    return this.getCurrentUserRole() === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this.getCurrentUserRole();
    return userRole ? roles.includes(userRole) : false;
  }

  private decodeToken(token: string): { uuid: string; name: string; email: string; roleId: string; role: string } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const decoded = JSON.parse(atob(parts[1])) as DecodedToken;
      return {
        uuid: decoded.uuid,
        name: decoded.name,
        email: decoded.sub,
        roleId: decoded.roleId,
        role: decoded.role ?? '',
      };
    } catch {
      return null;
    }
  }

  private cacheUser(user: UserInfo): void {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  }

  private loadCachedUser(): UserInfo | null {
    if (!this.isAuthenticated()) {
      localStorage.removeItem(USER_CACHE_KEY);
      return null;
    }
    try {
      const cached = localStorage.getItem(USER_CACHE_KEY);
      return cached ? (JSON.parse(cached) as UserInfo) : null;
    } catch {
      return null;
    }
  }
}
