import { Routes } from '@angular/router';

export const EMPLOYEE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'inbox',
    pathMatch: 'full',
  },
  {
    path: 'inbox',
    loadComponent: () => import('../employee/task-inbox/task-inbox.component').then(m => m.TaskInboxComponent),
  },
  {
    path: 'history',
    loadComponent: () => import('../employee/task-history/task-history.component').then(m => m.TaskHistoryComponent),
  },
  {
    path: 'task/:id',
    loadComponent: () => import('../employee/task-detail/employee-task-detail.component').then(m => m.EmployeeTaskDetailComponent),
  },
  {
    path: 'notifications',
    loadComponent: () => import('../employee/notifications/notifications.component').then(m => m.NotificationsComponent),
  },
];