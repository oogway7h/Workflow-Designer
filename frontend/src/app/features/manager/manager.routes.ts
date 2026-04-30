import { Routes } from '@angular/router';

export const MANAGER_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'policies',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    redirectTo: 'policies',
    pathMatch: 'full',
  },
  {
    path: 'incoming-requests',
    loadComponent: () => import('../manager/incoming-requests/incoming-requests.component').then(m => m.IncomingRequestsComponent),
  },
  {
    path: 'policies',
    loadComponent: () => import('../manager/assigned-policies/assigned-policies.component').then(m => m.AssignedPoliciesComponent),
  },
  {
    path: 'policies/:id/diagram',
    loadComponent: () => import('../manager/policy-viewer/policy-viewer.component').then(m => m.PolicyViewerComponent),
  },
  {
    path: 'instances',
    loadComponent: () => import('../manager/active-instances/active-instances.component').then(m => m.ActiveInstancesComponent),
  },
  {
    path: 'instances/:id/tasks/:taskId',
    loadComponent: () => import('../manager/instance-task-detail/instance-task-detail.component').then(m => m.InstanceTaskDetailComponent),
  },
  {
    path: 'history',
    loadComponent: () => import('../manager/manager-history/manager-history.component').then(m => m.ManagerHistoryComponent),
  },
];