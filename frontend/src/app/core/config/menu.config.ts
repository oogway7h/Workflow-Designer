import { LucideAngularModule } from 'lucide-angular';
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  FileText,
  Edit3,
  Eye,
  Inbox,
  History,
  Bot,
  Bell,
  FolderOpen,
  Sparkles
} from 'lucide-angular';

export type UserRole = 'ADMIN' | 'DESIGNER' | 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER';

export interface MenuItem {
  path: string;
  label: string;
  icon: any;
  roles: UserRole[];
  badgeKey?: string; // key used by shell to attach a dynamic badge signal
}

export const MENU_CONFIG: MenuItem[] = [
  // Dashboard - Todos los roles tienen acceso
  {
    path: '/app/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'DESIGNER', 'MANAGER', 'EMPLOYEE'],
  },

  // Admin specific
  {
    path: '/app/users',
    label: 'Usuarios',
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    path: '/app/empresa',
    label: 'Empresa',
    icon: Building2,
    roles: ['ADMIN'],
  },
  {
    path: '/app/settings',
    label: 'Configuraciones',
    icon: Settings,
    roles: ['ADMIN'],
  },

  // Designer specific
  {
    path: '/app/policies',
    label: 'Mis Políticas',
    icon: FileText,
    roles: ['DESIGNER'],
  },
  /*{
    path: '/app/designer',
    label: 'Editor de Flujos',
    icon: Edit3,
    roles: ['DESIGNER'],
  },*/

  // Manager specific
  {
    path: '/app/manager/incoming-requests',
    label: 'Trámites Entrantes',
    icon: Inbox,
    roles: ['MANAGER'],
    badgeKey: 'incomingCount',
  },
  {
    path: '/app/manager/policies',
    label: 'Políticas Asignadas',
    icon: Eye,
    roles: ['MANAGER'],
  },
  {
    path: '/app/manager/instances',
    label: 'Instancias Activas',
    icon: FileText,
    roles: ['MANAGER'],
  },
  {
    path: '/app/manager/history',
    label: 'Historial',
    icon: History,
    roles: ['MANAGER'],
  },

  // Employee specific
  {
    path: '/app/employee/inbox',
    label: 'Bandeja de Entrada',
    icon: Inbox,
    roles: ['EMPLOYEE'],
    badgeKey: 'taskInboxCount',
  },
  {
    path: '/app/employee/history',
    label: 'Historial de Tareas',
    icon: History,
    roles: ['EMPLOYEE'],
  },
  // Documentos
  {
    path: '/app/documents',
    label: 'Documentos',
    icon: FolderOpen,
    roles: ['ADMIN', 'DESIGNER', 'MANAGER', 'EMPLOYEE', 'CUSTOMER'],
  },
  // Reportes e IA (Todos menos CUSTOMER)
  {
    path: '/app/reports',
    label: 'Reportes e IA',
    icon: Sparkles,
    roles: ['ADMIN', 'DESIGNER', 'MANAGER', 'EMPLOYEE'],
  },
];

export function getMenuItemsForRole(role: UserRole): MenuItem[] {
  return MENU_CONFIG.filter(item => item.roles.includes(role));
}

export function getDefaultDashboardForRole(role: UserRole): string {
  switch (role) {
    case 'ADMIN': return '/app/dashboard';
    case 'DESIGNER': return '/app/dashboard';
    case 'MANAGER': return '/app/dashboard';
    case 'EMPLOYEE': return '/app/dashboard';
    default: return '/app/dashboard';
  }
}