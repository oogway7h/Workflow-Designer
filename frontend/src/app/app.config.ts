import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  provideAngularQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { LucideAngularModule, ArrowLeft, Download, RefreshCw, Eye, FileText, Image, Video, File, Plus, History, Trash2, Edit, Activity, UploadCloud, X, FileSpreadsheet, Save } from 'lucide-angular';

import { routes } from './app.routes';
import { apiInterceptor } from './core/interceptors/api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideAngularQuery(new QueryClient()),
    importProvidersFrom(LucideAngularModule.pick({
      ArrowLeft, Download, RefreshCw, Eye, FileText, Image, Video, File, Plus, History, Trash2, Edit, Activity, UploadCloud, X, FileSpreadsheet, Save
    })),
  ],
};
