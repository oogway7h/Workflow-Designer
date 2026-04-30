import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Clock, FileText, CheckCircle, AlertTriangle } from 'lucide-angular';
import { PolicyService } from '../../core/services/policy.service';
import { AuthService } from '../../core/services/auth.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-task-inbox',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, LoaderComponent],
  template: `
    <div class="p-6">
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-foreground">Bandeja de Tareas</h1>
          <p class="mt-1 text-sm text-muted-foreground">Revisa y completa tus tareas pendientes</p>
        </div>
      </div>

      @if (error()) {
        <div class="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-start gap-3 border border-red-200 dark:border-red-800">
          <lucide-icon [img]="AlertTriangle" [size]="18" class="mt-0.5 shrink-0" />
          <div>
            <p class="font-medium">Ocurrió un problema</p>
            <p>{{ error() }}</p>
          </div>
        </div>
      }

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <app-loader text="Cargando tus tareas..."></app-loader>
        </div>
      } @else {
        <div class="space-y-4">
          @for (task of activeTasks(); track task.taskId || task.executionId) {
            <div 
              class="group flex flex-col sm:flex-row gap-4 rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
              (click)="goToTask(task.executionId, task.taskId)"
            >
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                <lucide-icon [img]="FileText" [size]="24" />
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <span class="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 uppercase tracking-wider">Pendiente</span>
                      <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">Instancia Id: {{ (task.executionId || task.instanceId) | slice:0:8 }}</span>
                    </div>
                    <h3 class="text-lg font-semibold text-foreground">{{ task.taskName || 'Tarea Desconocida' }}</h3>
                    <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ task.policyName || 'Política' }}</p>
                  </div>
                  
                  <div class="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
                    <button class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                      <lucide-icon [img]="CheckCircle" [size]="16" />
                      Resolver
                    </button>
                  </div>
                </div>
              </div>
            </div>
          } @empty {
            <div class="rounded-xl border-2 border-dashed border-border py-16 text-center">
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20 mb-4">
                <lucide-icon [img]="CheckCircle" [size]="32" class="text-green-500" />
              </div>
              <h3 class="text-lg font-semibold text-foreground mb-1">¡Estás al día!</h3>
              <p class="text-sm text-muted-foreground max-w-sm mx-auto">No tienes tareas pendientes en tu bandeja de entrada. Recibirás una notificación cuando se te asigne una nueva tarea.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TaskInboxComponent implements OnInit {
  readonly Clock = Clock;
  readonly FileText = FileText;
  readonly CheckCircle = CheckCircle;
  readonly AlertTriangle = AlertTriangle;

  private readonly policyService = inject(PolicyService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  activeTasks = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string>('');

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user?.role) {
      this.loadActiveTasks(user.role);
    } else {
      this.error.set('No se pudo identificar tu rol para cargar las tareas.');
      this.isLoading.set(false);
    }
  }

  loadActiveTasks(role?: string): void {
    if (!role) return;
    
    this.isLoading.set(true);
    this.error.set('');
    
    setTimeout(() => {
      this.policyService.getActiveTasksByRole(role).subscribe({
        next: (tasks) => {
          this.activeTasks.set(tasks);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error fetching active tasks', err);
          this.error.set('No se pudieron cargar las tareas. Intenta nuevamente.');
          this.isLoading.set(false);
          this.toastService.error('Error al cargar tareas');
        }
      });
    }, 1500);
  }

  goToTask(executionId: string, taskId: string): void {
    if (executionId && taskId) {
      this.router.navigate(['/app/employee/task', executionId, taskId]);
    } else {
      this.toastService.error('Datos de tarea incompletos');
    }
  }
}
