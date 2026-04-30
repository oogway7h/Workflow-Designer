import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { LucideAngularModule, FileText, Clock, AlertTriangle, CheckCircle, X, ListTodo, User, RefreshCw, Inbox } from 'lucide-angular';
import { PolicyService } from '../../../core/services/policy.service';
import { AuthService } from '../../../core/services/auth.service';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-active-instances',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, LoaderComponent],
  template: `
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-foreground">Instancias Activas</h1>
          <p class="mt-1 text-sm text-muted-foreground">Trámites en curso bajo mi supervisión</p>
        </div>
        <button
          (click)="loadInstances()"
          [disabled]="loading()"
          class="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <lucide-icon [img]="RefreshCwIcon" [size]="14" [class]="loading() ? 'animate-spin' : ''" />
          Actualizar
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <app-loader text="Cargando instancias..."></app-loader>
        </div>
      }

      <!-- Error State -->
      @if (!loading() && error()) {
        <div class="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 p-6 text-center">
          <lucide-icon [img]="AlertTriangleIcon" [size]="32" class="mx-auto mb-3 text-red-500" />
          <h3 class="font-semibold text-foreground mb-1">Error al cargar instancias</h3>
          <p class="text-sm text-muted-foreground mb-4">{{ error() }}</p>
          <button
            (click)="loadInstances()"
            class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <lucide-icon [img]="RefreshCwIcon" [size]="14" />
            Reintentar
          </button>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && !error() && runningInstances().length === 0) {
        <div class="rounded-xl border-2 border-dashed border-border py-20 text-center">
          <lucide-icon [img]="InboxIcon" [size]="40" class="mx-auto mb-3 text-muted-foreground/50" />
          <p class="text-sm text-muted-foreground">No hay instancias activas bajo tu supervisión</p>
          <p class="text-xs text-muted-foreground mt-1">Las instancias iniciadas aparecerán aquí</p>
        </div>
      }

      <!-- Instance Cards -->
      @if (!loading() && !error() && runningInstances().length > 0) {
        <div class="grid gap-4">
          @for (instance of runningInstances(); track instance.instanceId || instance.uuid || instance.id) {
            <div (click)="viewDetails(instance)" class="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <lucide-icon [img]="FileTextIcon" [size]="20" class="text-blue-600" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-foreground">{{ instance.policyName || 'Proceso Activo' }}</h3>
                    <p class="text-xs text-muted-foreground mt-1">{{ instance.startedAt | date:'medium' }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <span class="text-xs text-muted-foreground">{{ instance.updatedAt | date:'short' }}</span>
                  <div class="mt-1">
                    <span class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                          [class]="getStatusBadgeClass(instance.status)">
                      <lucide-icon [img]="ClockIcon" [size]="12" />
                      {{ getStatusText(instance.status) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-muted-foreground">Actividad actual: {{ instance.currentTask || 'En proceso' }}</span>
                @if (instance.status === 'OVERDUE' || instance.status === 'overdue') {
                  <span class="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white">Vencido</span>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Instance Details Modal -->
      @if (selectedInstance()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" (click)="closeDetails()">
          <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg" (click)="$event.stopPropagation()">
            <div class="mb-6 flex items-start justify-between">
              <div>
                <h2 class="text-xl font-semibold text-foreground">Detalles de la Instancia</h2>
                <p class="text-sm text-muted-foreground">{{ selectedInstance()?.policyName || 'Documento / Flujo' }}</p>
                <div class="mt-2 text-xs text-muted-foreground space-y-1">
                  <p><strong>Fecha Inicio:</strong> {{ selectedInstance()?.startedAt | date:'medium' }}</p>
                  <p><strong>Estado Actual:</strong> {{ getStatusText(selectedInstance()?.status) }}</p>
                </div>
              </div>
              <button (click)="closeDetails()" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent ring-primary">
                <lucide-icon [img]="XIcon" [size]="20" />
              </button>
            </div>

            <div class="space-y-4">
              <h3 class="font-medium text-foreground text-lg border-b pb-2 mb-4">Línea de Actividades</h3>
              
              <!-- History or Tasks Timeline -->
              @if (selectedInstance()?.history && selectedInstance()?.history.length > 0) {
                <div class="space-y-3">
                  @for (activity of selectedInstance()?.history; track activity.id || $index) {
                    <div 
                      (click)="goToTaskDetails(selectedInstance()?.processInstanceId || selectedInstance()?.id || selectedInstance()?.uuid || selectedInstance()?._id, activity.taskId || activity.id); $event.stopPropagation()"
                      class="flex gap-4 rounded-lg border border-border bg-background p-4 shadow-sm hover:border-primary/50 cursor-pointer transition-colors"
                    >
                      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <lucide-icon [img]="ListTodoIcon" [size]="14" class="text-muted-foreground" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                          <h4 class="font-medium text-sm text-foreground">{{ activity.taskName || activity.name || 'Actividad' }}</h4>
                          <span class="text-xs px-2 py-1 rounded-full font-medium" [class]="getStatusBadgeClass(activity.status)">
                             {{ getStatusText(activity.status) }}
                          </span>
                        </div>
                        <div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <lucide-icon [img]="UserIcon" [size]="12" />
                          <span>{{ activity.assigneeName || activity.assigneeId || 'Sin asignar' }}</span>
                          <span>&bull;</span>
                          <lucide-icon [img]="ClockIcon" [size]="12" />
                          <span>{{ (activity.completedAt || activity.updatedAt) | date:'short' }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="rounded-lg border border-border bg-background p-4 flex justify-between items-center hover:border-primary/50 cursor-pointer"
                     (click)="goToTaskDetails(selectedInstance()?.processInstanceId || selectedInstance()?.id || selectedInstance()?.uuid || selectedInstance()?._id, 'current'); $event.stopPropagation()">
                   <div>
                     <h4 class="font-medium text-sm text-foreground">
                       {{ selectedInstanceDetail()?.currentTaskName || selectedInstance()?.currentTask || 'Actividad Actual' }}
                     </h4>
                     @if (selectedInstanceDetail()?.currentTaskAssigneeName) {
                       <div class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                         <lucide-icon [img]="UserIcon" [size]="12" />
                         <span>{{ selectedInstanceDetail()?.currentTaskAssigneeName }}</span>
                       </div>
                     }
                     <p class="text-xs text-primary mt-1">Haz clic para ver la actividad...</p>
                   </div>
                   <span class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">En Curso</span>
                </div>
              }
            </div>
            
            <div class="mt-6 flex justify-end">
              <button (click)="closeDetails()" class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent ring-primary transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ActiveInstancesComponent implements OnInit {
  readonly FileTextIcon = FileText;
  readonly ClockIcon = Clock;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly CheckCircleIcon = CheckCircle;
  readonly XIcon = X;
  readonly ListTodoIcon = ListTodo;
  readonly UserIcon = User;
  readonly RefreshCwIcon = RefreshCw;
  readonly InboxIcon = Inbox;

  private readonly policyService = inject(PolicyService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);  private readonly toast = inject(ToastService);
  activeInstances = signal<any[]>([]);
  runningInstances = computed(() =>
    this.activeInstances().filter(i => i.status?.toUpperCase() !== 'COMPLETED')
  );
  selectedInstance = signal<any | null>(null);
  selectedInstanceDetail = signal<any | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadInstances();
  }

  loadInstances(): void {
    this.loading.set(true);
    this.error.set(null);

    // First try without explicit managerId (backend extracts from JWT SecurityContext)
    this.policyService.getManagedInstances().pipe(
      catchError((err) => {
        console.warn(
          '[ActiveInstances] JWT-based endpoint failed (status ' + err.status + '). ' +
          'Retrying with explicit managerId...',
          err
        );
        // Fallback: pass managerId explicitly as query param
        const currentUser = this.authService.currentUser();
        if (currentUser?.uuid) {
          return this.policyService.getManagedInstances(currentUser.uuid).pipe(
            catchError((fallbackErr) => {
              console.error('[ActiveInstances] Fallback also failed:', fallbackErr);
              const msg = fallbackErr?.error?.message
                || fallbackErr?.message
                || `Error del servidor (${fallbackErr?.status ?? 'desconocido'})`;
              return of({ __error: msg });
            })
          );
        }
        const msg = err?.error?.message
          || err?.message
          || `Error del servidor (${err?.status ?? 'desconocido'})`;
        return of({ __error: msg });
      })
    ).subscribe((result: any) => {
      setTimeout(() => {
        this.loading.set(false);
        if (result && result.__error) {
          this.error.set(result.__error);
          this.activeInstances.set([]);
        } else {
          this.activeInstances.set(Array.isArray(result) ? result : []);
        }
      }, 1500);
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
      case 'ACTIVE': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'OVERDUE': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'COMPLETED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    }
  }

  getStatusText(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
      case 'ACTIVE': return 'Pendiente / Activo';
      case 'OVERDUE': return 'Vencido';
      case 'COMPLETED': return 'Completado';
      default: return status || 'Desconocido';
    }
  }

  viewDetails(instance: any): void {
    this.selectedInstance.set(instance);
    this.selectedInstanceDetail.set(null);
    // Load full detail (includes activity name + assignee)
    const id = instance.instanceId || instance.uuid || instance.id;
    if (id) {
      this.policyService.getInstanceDetails(id).subscribe({
        next: (detail) => this.selectedInstanceDetail.set(detail),
        error: () => { /* detail load failed, fallback to summary data */ }
      });
    }
  }

  closeDetails(): void {
    this.selectedInstance.set(null);
    this.selectedInstanceDetail.set(null);
  }

  goToTaskDetails(instanceId: string | undefined | null, taskId: string): void {
    const inst = this.selectedInstance();
    if (!instanceId && inst) {
      console.log('No instanceId passed, trying to extract from selectedInstance:', inst);
      instanceId = inst.id || inst.uuid || inst._id || inst.processInstanceId || inst.instanceId;
    }

    console.log('Navigating to:', '/app/manager/instances', instanceId, 'tasks', taskId);

    if (instanceId) {
      this.closeDetails();
      this.router.navigateByUrl('/app/manager/instances/' + instanceId + '/tasks/' + taskId);
    } else {
      this.toast.error('Error: No se pudo obtener el ID de la instancia.');
      console.error('Selected Instance payload:', inst);
    }
  }
}