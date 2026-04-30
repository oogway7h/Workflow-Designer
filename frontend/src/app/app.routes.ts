import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      // Dashboard - accessible to all roles
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(
            (m) => m.DASHBOARD_ROUTES
          ),
      },

      // Admin routes
      {
        path: 'users',
        canActivate: [roleGuard(['ADMIN'])],
        loadChildren: () =>
          import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
      },
      {
        path: 'empresa',
        canActivate: [roleGuard(['ADMIN'])],
        loadChildren: () =>
          import('./features/empresa/empresa.routes').then(
            (m) => m.EMPRESA_ROUTES
          ),
      },
      {
        path: 'settings',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./features/admin/settings/settings.component').then(
            (m) => m.SettingsComponent
          ),
      },

      // Designer routes
      {
        path: 'policies',
        canActivate: [roleGuard(['DESIGNER'])],
        loadChildren: () =>
          import('./features/policy-designer/policy-designer.routes').then(
            (m) => m.POLICY_DESIGNER_ROUTES
          ),
      },

      // Manager routes
      {
        path: 'manager',
        canActivate: [roleGuard(['MANAGER'])],
        loadChildren: () =>
          import('./features/manager/manager.routes').then((m) => m.MANAGER_ROUTES),
      },

      // Employee routes
      {
        path: 'employee',
        canActivate: [roleGuard(['EMPLOYEE'])],
        loadChildren: () =>
          import('./features/employee/employee.routes').then((m) => m.EMPLOYEE_ROUTES),
      },

      // Profile - accessible to all authenticated users
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/shared/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
      },

      // Default redirect based on role
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth' },
];
