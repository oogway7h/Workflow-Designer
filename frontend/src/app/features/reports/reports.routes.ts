import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./reports-panel/reports-panel.component').then(m => m.ReportsPanelComponent)
  }
];
