import { Component, inject, signal, OnInit } from '@angular/core';
import { PolicyService } from '../../../core/services/policy.service';
import { LucideAngularModule, Bell, CheckCircle, AlertCircle, Info, Clock, X, CheckCheck } from 'lucide-angular';

interface Notification {
  id: string;
  type: 'task_assigned' | 'task_due' | 'task_overdue' | 'approval_required' | 'info' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-foreground">Notificaciones</h1>
            <p class="mt-1 text-sm text-muted-foreground">Mantente al día con tus tareas y procesos</p>
          </div>
          @if (unreadCount() > 0) {
            <button
              (click)="markAllAsRead()"
              class="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <lucide-icon [img]="CheckCheck" [size]="12" />
              Marcar todas como leídas
            </button>
          }
        </div>
      </div>

      <!-- Filters -->
      <div class="mb-6 flex gap-4">
        <select class="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option>Todas las notificaciones</option>
          <option>No leídas</option>
          <option>Leídas</option>
        </select>
        <select class="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option>Todos los tipos</option>
          <option>Tareas asignadas</option>
          <option>Vencimientos</option>
          <option>Aprobaciones</option>
          <option>Información</option>
        </select>
        <select class="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option>Todas las fechas</option>
          <option>Hoy</option>
          <option>Esta semana</option>
          <option>Este mes</option>
        </select>
      </div>

      <!-- Notifications List -->
      <div class="space-y-3">
        @for (notification of notifications(); track notification.id) {
          <div
            class="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
            [class]="getNotificationClasses(notification)">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" [class]="getNotificationIconBg(notification.type)">
              <lucide-icon [img]="getNotificationIcon(notification.type)" [size]="20" [class]="getNotificationIconColor(notification.type)" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <div class="min-w-0 flex-1">
                  <h3 class="font-semibold text-foreground" [class.font-normal]="notification.read">{{ notification.title }}</h3>
                  <p class="text-sm text-muted-foreground mt-1">{{ notification.message }}</p>
                  <div class="mt-2 flex items-center gap-2">
                    <span class="text-xs text-muted-foreground">{{ notification.timestamp }}</span>
                    @if (notification.actionText && notification.actionUrl) {
                      <button class="text-xs text-primary hover:text-primary/80 underline">
                        {{ notification.actionText }}
                      </button>
                    }
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  @if (!notification.read) {
                    <div class="h-2 w-2 rounded-full bg-primary"></div>
                  }
                  <button
                    (click)="markAsRead(notification.id)"
                    class="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                    <lucide-icon [img]="notification.read ? CheckCircle : X" [size]="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      @if (notifications().length === 0) {
        <div class="rounded-xl border-2 border-dashed border-border py-16 text-center">
          <lucide-icon [img]="Bell" [size]="40" class="mx-auto mb-3 text-muted-foreground/50" />
          <p class="text-sm text-muted-foreground">No tienes notificaciones</p>
          <p class="text-xs text-muted-foreground mt-1">¡Estás al día!</p>
        </div>
      }
    </div>
  `,
})
export class NotificationsComponent implements OnInit {
  readonly Bell = Bell;
  readonly CheckCircle = CheckCircle;
  readonly AlertCircle = AlertCircle;
  readonly Info = Info;
  readonly Clock = Clock;
  readonly X = X;
  readonly CheckCheck = CheckCheck;

  private policyService = inject(PolicyService);

  notifications = signal<Notification[]>([
    {
      id: '1',
      type: 'task_assigned',
      title: 'Nueva tarea asignada',
      message: 'Se te ha asignado la tarea "Aprobar solicitud de compra" en el proceso de compras.',
      timestamp: 'Hace 5 minutos',
      read: false,
      actionUrl: '/app/employee/inbox',
      actionText: 'Ver tarea',
    },
    {
      id: '2',
      type: 'task_due',
      title: 'Tarea próxima a vencer',
      message: 'La tarea "Revisar solicitud de vacaciones" vence en 2 horas.',
      timestamp: 'Hace 1 hora',
      read: false,
      actionUrl: '/app/employee/inbox',
      actionText: 'Ver tarea',
    },
    {
      id: '3',
      type: 'task_overdue',
      title: 'Tarea vencida',
      message: 'La tarea "Aprobar cambio de puesto" ha vencido. Por favor, complétala lo antes posible.',
      timestamp: 'Hace 3 horas',
      read: true,
      actionUrl: '/app/employee/inbox',
      actionText: 'Ver tarea',
    },
    {
      id: '4',
      type: 'approval_required',
      title: 'Aprobación requerida',
      message: 'Tu solicitud de vacaciones requiere aprobación adicional del departamento de RRHH.',
      timestamp: 'Hace 1 día',
      read: true,
      actionUrl: '/app/employee/history',
      actionText: 'Ver detalles',
    },
    {
      id: '5',
      type: 'info',
      title: 'Actualización del sistema',
      message: 'Se ha actualizado el proceso de aprobación de compras. Revisa los nuevos criterios.',
      timestamp: 'Hace 2 días',
      read: true,
    },
    {
      id: '6',
      type: 'system',
      title: 'Mantenimiento programado',
      message: 'El sistema estará en mantenimiento este sábado de 2:00 AM a 4:00 AM.',
      timestamp: 'Hace 3 días',
      read: true,
    },
  ]);

  ngOnInit(): void {
    // TODO: Load notifications from service
  }

  get unreadCount(): any {
    return this.notifications().filter(n => !n.read).length;
  }

  getNotificationIcon(type: string) {
    switch (type) {
      case 'task_assigned': return CheckCircle;
      case 'task_due': return Clock;
      case 'task_overdue': return AlertCircle;
      case 'approval_required': return AlertCircle;
      case 'info': return Info;
      case 'system': return Bell;
      default: return Bell;
    }
  }

  getNotificationIconBg(type: string): string {
    switch (type) {
      case 'task_assigned': return 'bg-blue-100 dark:bg-blue-900/30';
      case 'task_due': return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'task_overdue': return 'bg-red-100 dark:bg-red-900/30';
      case 'approval_required': return 'bg-orange-100 dark:bg-orange-900/30';
      case 'info': return 'bg-green-100 dark:bg-green-900/30';
      case 'system': return 'bg-purple-100 dark:bg-purple-900/30';
      default: return 'bg-gray-100 dark:bg-gray-800';
    }
  }

  getNotificationIconColor(type: string): string {
    switch (type) {
      case 'task_assigned': return 'text-blue-600';
      case 'task_due': return 'text-yellow-600';
      case 'task_overdue': return 'text-red-600';
      case 'approval_required': return 'text-orange-600';
      case 'info': return 'text-green-600';
      case 'system': return 'text-purple-600';
      default: return 'text-gray-500';
    }
  }

  getNotificationBorderClass(type: string): string {
    switch (type) {
      case 'task_assigned': return 'border-l-blue-500';
      case 'task_due': return 'border-l-yellow-500';
      case 'task_overdue': return 'border-l-red-500';
      case 'approval_required': return 'border-l-orange-500';
      case 'info': return 'border-l-green-500';
      case 'system': return 'border-l-purple-500';
      default: return '';
    }
  }

  markAsRead(notificationId: string): void {
    this.notifications.update(notifications =>
      notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }

  getNotificationClasses(notification: Notification): string {
    let classes = '';
    if (!notification.read) {
      classes += 'bg-muted/30 border-l-4 ';
    }
    classes += this.getNotificationBorderClass(notification.type);
    return classes.trim();
  }

  markAllAsRead(): void {
    this.notifications.update(notifications =>
      notifications.map(n => ({ ...n, read: true }))
    );
  }
}