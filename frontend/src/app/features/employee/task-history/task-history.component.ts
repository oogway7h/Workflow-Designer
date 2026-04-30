import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PolicyService } from '../../../core/services/policy.service';
import { LucideAngularModule, History, CheckCircle, XCircle, Clock, FileText, User, Calendar } from 'lucide-angular';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

interface CompletedTask {
  id?: string;
  instanceUuid?: string;
  activityId?: string;
  title?: string;
  description?: string;
  processName?: string;
  assignedBy?: string;
  completedAt?: string;
  timestamp?: string;
  duration?: string;
  status?: string;
  outcome?: string;
  taskName?: string;
  action?: string;
}

@Component({
  selector: 'app-task-history',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule, LoaderComponent],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-foreground">Historial de Tareas</h1>
        <p class="mt-1 text-sm text-muted-foreground">Registro de tareas completadas y su estado</p>
      </div>

      <!-- Filters -->
      <div class="mb-6 flex gap-4">
        <select class="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option>Todas las fechas</option>
          <option>Última semana</option>
          <option>Último mes</option>
          <option>Último trimestre</option>
        </select>

        <select class="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option>Todos los resultados</option>
          <option>Completadas</option>
          <option>Canceladas</option>
          <option>Expiradas</option>
        </select>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-10">
          <app-loader text="Cargando historial de tareas..."></app-loader>
        </div>
      } @else {
        <!-- History Timeline -->
        <div class="space-y-4">
          @for (task of completedTasks(); track task.id) {
          <div class="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" [class]="getStatusIconBg(task.status)">
              <lucide-icon [img]="getStatusIcon(task.status)" [size]="20" [class]="getStatusIconColor(task.status)" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="font-semibold text-foreground">{{ task.taskName || task.activityId || 'Tarea Completada' }}</h3>
                  <div class="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <lucide-icon [img]="FileText" [size]="12" />
                      {{ task.action || ' de Trabajo' }}
                    </span>
                    <span class="flex items-center gap-1">
                      <lucide-icon [img]="Calendar" [size]="12" />
                      Completado: {{ ((task.timestamp || task.completedAt) | date:'short') ?? 'Reciente' }}
                    </span>
                  </div>
                  <div class="mt-2">
                    <span class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                          [class]="getOutcomeBadgeClass(task.outcome)">
                      {{ task.outcome }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      @if (completedTasks().length === 0) {
        <div class="rounded-xl border-2 border-dashed border-border py-16 text-center">
          <lucide-icon [img]="History" [size]="40" class="mx-auto mb-3 text-muted-foreground/50" />
          <p class="text-sm text-muted-foreground">No hay tareas completadas en el historial</p>
        </div>
      }
      }
    </div>
  `,
})
export class TaskHistoryComponent implements OnInit {
  readonly History = History;
  readonly CheckCircle = CheckCircle;
  readonly XCircle = XCircle;
  readonly Clock = Clock;
  readonly FileText = FileText;
  readonly User = User;
  readonly Calendar = Calendar;

  private policyService = inject(PolicyService);

  completedTasks = signal<CompletedTask[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    setTimeout(() => {
      this.policyService.getHistory().subscribe({
        next: (data) => {
          if (Array.isArray(data)) {
            this.completedTasks.set(data);
          }
          this.isLoading.set(false);
        },
        error: (err) => {
           console.error('Error fetching history for employee:', err);
           this.isLoading.set(false);
        }
      });
    }, 1500);
  }

  getStatusIcon(status?: string) {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'cancelled': return XCircle;
      case 'expired': return Clock;
      default: return Clock;
    }
  }

  getStatusIconBg(status?: string): string {
    switch (status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900/30';
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/30';
      case 'expired': return 'bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'bg-gray-100 dark:bg-gray-800';
    }
  }

  getStatusIconColor(status?: string): string {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'cancelled': return 'text-red-600';
      case 'expired': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  }

  getOutcomeBadgeClass(outcome?: string): string {
    if (!outcome) return 'bg-gray-100 text-gray-700';
    if (outcome.toLowerCase().includes('aprobada') || outcome.toLowerCase().includes('aceptada')) {
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    } else if (outcome.toLowerCase().includes('cancelada') || outcome.toLowerCase().includes('rechazada')) {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    } else if (outcome.toLowerCase().includes('modificaciones')) {
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    } else {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  }
}