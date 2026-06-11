import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PolicyService } from '../../../core/services/policy.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { LucideAngularModule, Inbox, Clock, AlertCircle, CheckCircle, FileText, User } from 'lucide-angular';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

interface Task {
  id: string;
  instanceUuid: string;
  title: string;
  description: string;
  processName: string;
  assignedBy: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  status: 'pending' | 'in_progress' | 'overdue';
  createdAt: string;
}

@Component({
  selector: 'app-task-inbox',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, LoaderComponent],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-foreground">Bandeja de Entrada</h1>
        <p class="mt-1 text-sm text-muted-foreground">Tareas pendientes que requieren tu atención</p>
      </div>

      <!-- Task Filters -->
      <div class="mb-6 flex gap-4">
        <select class="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option>Todas las prioridades</option>
          <option>Urgente</option>
          <option>Alta</option>
          <option>Media</option>
          <option>Baja</option>
        </select>
        <select class="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option>Todos los procesos</option>
          <option>Aprobación de compras</option>
          <option>Solicitud de vacaciones</option>
          <option>Cambio de puesto</option>
        </select>
        <select class="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option>Todos los estados</option>
          <option>Pendientes</option>
          <option>En progreso</option>
          <option>Vencidas</option>
        </select>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-10">
          <app-loader text="Cargando tus tareas..."></app-loader>
        </div>
      } @else {
        <!-- Tasks List -->
        <div class="space-y-4">
          @for (task of tasks(); track task.instanceId || task.instanceUuid || task.id || $index) {
          <div [routerLink]="['/app/employee/task', task.instanceId || task.instanceUuid || task.id]" 
               class="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg" [class]="getPriorityBadgeClass(task.priority)">
              <lucide-icon [img]="getPriorityIcon(task.priority)" [size]="20" [class]="getPriorityIconColor(task.priority)" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <div class="min-w-0 flex-1">
                  <h3 class="font-semibold text-foreground group-hover:text-primary transition-colors truncate flex items-center gap-2">
                    Actividad: {{ task.taskName || task.title || task.activityId || 'Tarea Asignada' }}
                    @if (task.isFromCache) {
                      <span class="inline-flex items-center rounded-md bg-rose-400/10 px-2 py-0.5 text-[10px] font-medium text-rose-400 ring-1 ring-inset ring-rose-400/20">Caché Offline</span>
                    }
                  </h3>
                  <p class="text-sm text-muted-foreground mt-1">Política: {{ task.policyName || task.processName || 'Flujo de Trabajo' }}</p>
                  <p class="text-xs text-muted-foreground mt-2">{{ task.description || 'Completar los campos requeridos para avanzar el flujo.' }}</p>
                </div>
                <div class="text-right">
                  <span class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium mb-2"
                        [class]="getStatusBadgeClass(task.status)">
                    @if (task.status === 'pending') {
                      <lucide-icon [img]="Clock" [size]="12" />
                    } @else if (task.status === 'in_progress') {
                      <lucide-icon [img]="AlertCircle" [size]="12" />
                    } @else {
                      <lucide-icon [img]="AlertCircle" [size]="12" />
                    }
                    {{ getStatusText(task.status || 'pending') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      @if (tasks().length === 0) {
        <div class="rounded-xl border-2 border-dashed border-border py-16 text-center">
          <lucide-icon [img]="Inbox" [size]="40" class="mx-auto mb-3 text-muted-foreground/50" />
          <p class="text-sm text-muted-foreground">No tienes tareas pendientes</p>
          <p class="text-xs text-muted-foreground mt-1">¡Excelente trabajo!</p>
        </div>
      }
      }
    </div>
  `,
})
export class TaskInboxComponent implements OnInit {
  readonly Inbox = Inbox;
  readonly Clock = Clock;
  readonly AlertCircle = AlertCircle;
  readonly CheckCircle = CheckCircle;
  readonly FileText = FileText;
  readonly User = User;

  private readonly policyService = inject(PolicyService);
  private readonly indexedDb = inject(IndexedDbService);
  private readonly offlineSync = inject(OfflineSyncService);

  tasks = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    setTimeout(() => {
      if (!this.offlineSync.isOnline) {
        this.loadTasksFromCache();
      } else {
        this.policyService.getPendingTasks().subscribe({
          next: (tasks) => {
            this.tasks.set(tasks);
            this.indexedDb.saveTasksCache(tasks).catch(err => console.error('Error caching tasks:', err));
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Error fetching tasks, falling back to cache:', err);
            this.loadTasksFromCache();
          }
        });
      }
    }, 1500);
  }

  private loadTasksFromCache() {
    this.indexedDb.getTasksCache().then(cachedTasks => {
      const markedTasks = cachedTasks.map(t => ({ ...t, isFromCache: true }));
      this.tasks.set(markedTasks);
      this.isLoading.set(false);
    }).catch(err => {
      console.error('Failed to load tasks from cache:', err);
      this.isLoading.set(false);
    });
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'urgent': return 'bg-red-100 dark:bg-red-900/30';
      case 'high': return 'bg-orange-100 dark:bg-orange-900/30';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'low': return 'bg-green-100 dark:bg-green-900/30';
      default: return 'bg-gray-100 dark:bg-gray-800';
    }
  }

  getPriorityIcon(priority: string) {
    switch (priority) {
      case 'urgent': return AlertCircle;
      case 'high': return AlertCircle;
      case 'medium': return Clock;
      case 'low': return CheckCircle;
      default: return FileText;
    }
  }

  getPriorityIconColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-500';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'overdue': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'overdue': return 'Vencida';
      default: return 'Desconocido';
    }
  }
}