import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../config/menu.config';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/auth/login']);
    }

    const userRole = authService.getCurrentUserRole();
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Redirect to user's dashboard or unauthorized page
      const defaultDashboard = '/app/dashboard';
      return router.createUrlTree([defaultDashboard]);
    }

    return true;
  };
};