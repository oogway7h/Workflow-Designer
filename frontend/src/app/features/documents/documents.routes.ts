import { Routes } from '@angular/router';
import { DocumentListComponent } from './document-list/document-list.component';
import { DocumentViewerComponent } from './document-viewer/document-viewer.component';
import { DocumentAuditComponent } from './document-audit/document-audit.component';

export const DOCUMENTS_ROUTES: Routes = [
  { path: '', component: DocumentListComponent },
  { path: ':uuid', component: DocumentViewerComponent },
  { path: ':uuid/audit', component: DocumentAuditComponent },
];
