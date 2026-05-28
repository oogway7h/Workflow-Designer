import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Skip interceptor for external URLs (S3 presigned URLs, Syncfusion API, etc.)
  const isExternalRequest = !req.url.startsWith('/') && !req.url.includes('localhost');
  if (isExternalRequest) {
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      })
    );
  }

  let newHeaders = req.headers;

  if (!(req.body instanceof FormData) && !newHeaders.has('Content-Type')) {
    newHeaders = newHeaders.set('Content-Type', 'application/json');
  }

  const token = localStorage.getItem('auth_token');
  if (token) {
    newHeaders = newHeaders.set('Authorization', `Bearer ${token}`);
  }

  const apiReq = req.clone({ headers: newHeaders });

  return next(apiReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};
