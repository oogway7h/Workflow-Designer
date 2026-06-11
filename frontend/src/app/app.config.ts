import { ApplicationConfig, importProvidersFrom, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import {
  provideAngularQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { LucideAngularModule, ArrowLeft, Download, RefreshCw, Eye, FileText, Image, Video, File, Plus, History, Trash2, Edit, Activity, UploadCloud, X, FileSpreadsheet, Save, MousePointer, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Pencil, Type, Undo2, Redo2, Pause, Play, Rewind, FastForward, Maximize, FileQuestion, Folder, Users, Shield, AlignLeft, AlignCenter, AlignRight, Combine, Undo, Redo, PaintBucket, Eraser, Percent, DollarSign } from 'lucide-angular';

import { routes } from './app.routes';
import { apiInterceptor } from './core/interceptors/api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideAngularQuery(new QueryClient()),
    importProvidersFrom(LucideAngularModule.pick({
      ArrowLeft, Download, RefreshCw, Eye, FileText, Image, Video, File, Plus, History, Trash2, Edit, Activity, UploadCloud, X, FileSpreadsheet, Save, MousePointer, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Pencil, Type, Undo2, Redo2, Pause, Play, Rewind, FastForward, Maximize, FileQuestion, Folder, Users, Shield,
      AlignLeft, AlignCenter, AlignRight, Combine, Undo, Redo, PaintBucket, Eraser, Percent, DollarSign
    })),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
