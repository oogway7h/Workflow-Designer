import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, CheckCircle, FileText, User, Clock, Save, AlertTriangle } from 'lucide-angular';
import { PolicyService } from '../../../core/services/policy.service';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-instance-task-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, KeyValuePipe, LoaderComponent],
  template: `
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <button (click)="goBack()" class="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <lucide-icon [img]="ArrowLeft" [size]="14" />
            Volver a Instancias Activas
          </button>
          <h1 class="text-2xl font-semibold text-foreground">Detalles de la Actividad</h1>
          <p class="mt-1 text-sm text-muted-foreground">{{ taskDetails()?.policyName || 'Cargando información...' }}</p>
        </div>
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-sm"
             [ngClass]="{'bg-green-100 text-green-700': taskDetails()?.status === 'COMPLETED', 'bg-blue-100 text-blue-700': taskDetails()?.status === 'ACTIVE', 'bg-gray-100 text-gray-700': !taskDetails()}">
          <lucide-icon [img]="taskDetails()?.status === 'COMPLETED' ? CheckCircle : Clock" [size]="16" />
          {{ getStatusText(taskDetails()?.status) }}
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex justify-center items-center py-12">
           <app-loader text="Cargando detalles..."></app-loader>
        </div>
      } @else if (error()) {
        <div class="flex justify-center items-center py-12">
           <div class="flex flex-col items-center">
              <lucide-icon [img]="AlertTriangle" [size]="32" class="text-red-500 mb-4" />
              <p class="text-red-500 font-medium">{{ error() }}</p>
           </div>
        </div>
      } @else if (taskDetails()) {
        <div class="grid gap-6 md:grid-cols-3">
          <!-- Main details -->
          <div class="col-span-2 space-y-6">
            
            <!-- Historical Data (instanceData) -->
            @if (taskDetails()?.instanceData && hasKeys(taskDetails()?.instanceData)) {
              <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
                 <h3 class="text-lg font-medium border-b pb-2 mb-4 flex items-center gap-2">
                   <lucide-icon [img]="FileText" [size]="20" class="text-muted-foreground"/> Datos del Progreso
                 </h3>
                 <div class="grid grid-cols-2 gap-4">
                    @for (item of taskDetails()?.instanceData | keyvalue; track item.key) {
                      <div class="space-y-1">
                        <label class="text-sm font-medium text-muted-foreground capitalize">{{ item.key }}</label>
                        <div class="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-foreground">
                           {{ formatValue(item.value) }}
                        </div>
                      </div>
                    }
                 </div>
              </div>
            }

            <!-- Current Task Form -->
            <div class="rounded-xl border border-primary/20 bg-card p-6 shadow-sm">
               <h3 class="text-lg font-medium border-b pb-2 mb-4 flex items-center gap-2 text-primary">
                 <lucide-icon [img]="FileText" [size]="20" /> Tarea Actual: {{ taskDetails()?.currentTaskName || taskDetails()?.taskName || 'Sin nombre' }}
               </h3>
               
               <!-- Aviso de solo lectura para el manager -->
               <div class="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
                 <lucide-icon [img]="AlertTriangle" [size]="16" />
                 <span>Vista de solo lectura. Las tareas son completadas por los empleados asignados.</span>
               </div>

               <div class="space-y-4">
                  @if (taskDetails()?.formSchemaJson?.fields?.length > 0) {
                     @for (field of taskDetails()?.formSchemaJson?.fields; track field.name) {
                        <div class="space-y-2">
                           <label class="text-sm font-medium text-foreground">{{ field.label || field.name }}</label>
                           
                           @if (field.type === 'boolean') {
                             <div class="flex items-center gap-2 mt-2">
                               <input type="checkbox" [disabled]="true" [(ngModel)]="formData[field.name]" class="h-4 w-4 rounded border-gray-300 text-primary">
                               <span class="text-sm text-muted-foreground">{{ field.label || field.name }}</span>
                             </div>
                           } @else if (field.type === 'textarea') {
                             <textarea [disabled]="true" [(ngModel)]="formData[field.name]" class="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm outline-none cursor-not-allowed" rows="3"></textarea>
                           } @else if (field.type === 'number') {
                             <input type="number" [disabled]="true" [(ngModel)]="formData[field.name]" class="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm outline-none cursor-not-allowed">
                           } @else {
                             <input type="text" [disabled]="true" [(ngModel)]="formData[field.name]" class="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm outline-none cursor-not-allowed">
                           }
                        </div>
                     }

                     <!-- Botón solo visible cuando todos los empleados completaron sus actividades -->
                     @if (allEmployeesCompleted()) {
                       <div class="pt-4 border-t mt-6 flex justify-end">
                          <button (click)="submitTask()" [disabled]="isSubmitting()" class="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                            @if (isSubmitting()) {
                              <lucide-icon [img]="Clock" [size]="18" class="animate-spin" /> Procesando...
                            } @else {
                              <lucide-icon [img]="CheckCircle" [size]="18" /> Avanzar Flujo
                            }
                          </button>
                       </div>
                     }
                  } @else {
                     <p class="text-sm text-muted-foreground italic">No hay campos configurados para esta tarea.</p>

                     @if (allEmployeesCompleted()) {
                       <div class="pt-4 flex justify-end">
                          <button (click)="submitTask()" [disabled]="isSubmitting()" class="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                            <lucide-icon [img]="CheckCircle" [size]="18" /> Avanzar Flujo
                          </button>
                       </div>
                     }
                  }
               </div>
            </div>
          </div>

          <!-- Sidebar Activity Info -->
          <div class="space-y-6">
             <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 class="text-lg font-medium border-b pb-2 mb-4 flex items-center gap-2">
                   <lucide-icon [img]="Clock" [size]="20" class="text-primary" /> Tiempos
                </h3>
                <div class="space-y-3 text-sm">
                   <div class="flex justify-between">
                     <span class="text-muted-foreground">Iniciado:</span>
                     <span class="font-medium">{{ taskDetails()?.startedAt | date:'short' }}</span>
                   </div>
                   <div class="flex justify-between">
                     <span class="text-muted-foreground">Última act.:</span>
                     <span class="font-medium">{{ taskDetails()?.updatedAt | date:'short' }}</span>
                   </div>
                </div>
             </div>

             <!-- Funcionario Responsable -->
             <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 class="text-lg font-medium border-b pb-2 mb-4 flex items-center gap-2">
                   <lucide-icon [img]="UserIcon" [size]="20" class="text-primary" /> Responsable
                </h3>
                @if (taskDetails()?.currentTaskAssigneeName) {
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <lucide-icon [img]="UserIcon" [size]="16" class="text-primary" />
                    </div>
                    <span class="text-sm font-medium text-foreground">{{ taskDetails()?.currentTaskAssigneeName }}</span>
                  </div>
                } @else {
                  <p class="text-sm text-muted-foreground italic">Sin asignar</p>
                }
             </div>

             <div class="rounded-xl border border-border bg-muted/10 p-6 shadow-sm">
                <h3 class="text-sm font-medium text-foreground mb-2">Estado de Flujo</h3>
                @if (taskDetails()?.status === 'COMPLETED') {
                   <div class="flex items-center gap-2 text-green-600 bg-green-100 px-3 py-2 rounded-lg text-sm font-medium">
                      <lucide-icon [img]="CheckCircle" [size]="16" /> Flujo Terminado
                   </div>
                } @else if (taskDetails()?.status === 'ACTIVE') {
                   <div class="flex items-center gap-2 text-blue-600 bg-blue-100 px-3 py-2 rounded-lg text-sm font-medium">
                      <lucide-icon [img]="Clock" [size]="16" /> Esperando Acción
                   </div>
                } @else {
                   <div class="flex items-center gap-2 text-yellow-600 bg-yellow-100 px-3 py-2 rounded-lg text-sm font-medium">
                      <lucide-icon [img]="AlertTriangle" [size]="16" /> {{ taskDetails()?.status }}
                   </div>
                }
             </div>
          </div>
        </div>
      }
    </div>
  `
})
export class InstanceTaskDetailComponent implements OnInit {
  readonly ArrowLeft = ArrowLeft;
  readonly FileText = FileText;
  readonly CheckCircle = CheckCircle;
  readonly UserIcon = User;
  readonly Clock = Clock;
  readonly Save = Save;
  readonly AlertTriangle = AlertTriangle;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly policyService = inject(PolicyService);
  private readonly toast = inject(ToastService);

  instanceId = signal<string>('');
  taskId = signal<string>('');
  
  taskDetails = signal<any | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string>('');
  isSubmitting = signal<boolean>(false);

  formData: Record<string, any> = {};

  ngOnInit(): void {
    this.instanceId.set(this.route.snapshot.paramMap.get('id') || '');
    this.taskId.set(this.route.snapshot.paramMap.get('taskid') || '');

    if (this.instanceId()) {
      this.loadDetails(this.instanceId());
    } else {
      this.error.set('No se especificó ningún ID de instancia válido.');
      this.isLoading.set(false);
    }
  }

  formatValue(val: any): string {
    if (val === true || val === 'true') return 'CONFIRMADO(true)';
    if (val === false || val === 'false') return 'NEGADO(false)';
    return val;
  }

  loadDetails(uuid: string): void {
    this.isLoading.set(true);
    this.error.set('');
    
    setTimeout(() => {
      this.policyService.getInstanceDetails(uuid).subscribe({
        next: (data) => {
          this.taskDetails.set(data);
          this.isLoading.set(false);
          
          // Inicializar form data si hay campos
          if (data.formSchemaJson?.fields) {
             data.formSchemaJson.fields.forEach((field: any) => {
                if (field.type === 'boolean') {
                   this.formData[field.name] = false;
                } else if (field.type === 'number') {
                   this.formData[field.name] = 0;
                } else {
                   this.formData[field.name] = '';
                }
             });
          }
        },
        error: (err) => {
          console.error('Error fetching task details', err);
          this.error.set('Error al cargar los detalles de la tarea.');
          this.isLoading.set(false);
        }
      });
    }, 1500);
  }

  submitTask(): void {
    if (!this.instanceId() || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    
    setTimeout(() => {
      this.policyService.completeTask(this.instanceId(), this.formData).subscribe({
        next: () => {
           this.isSubmitting.set(false);
           this.toast.success('¡Tarea completada o flujo avanzado con éxito!');
           this.loadDetails(this.instanceId()); // Recargar
        },
        error: (err) => {
           console.error('Error completing task', err);
           this.isSubmitting.set(false);
           this.toast.error('Hubo un error al rellenar/completar la tarea.');
        }
      });
    }, 1500);
  }

  isTaskPending(): boolean {
    const details = this.taskDetails();
    if (!details) return false;
    return details.status === 'ACTIVE' || details.status === 'PENDING';
  }

  /**
   * El manager solo puede avanzar el flujo cuando todos los empleados
   * completaron sus actividades. Depende del campo `canAdvance` o
   * `allEmployeesCompleted` que retorne el backend.
   */
  allEmployeesCompleted(): boolean {
    const details = this.taskDetails();
    if (!details) return false;
    // Usa el campo que el backend exponga; ajusta el nombre si es necesario
    return details.canAdvance === true || details.allEmployeesCompleted === true;
  }

  hasKeys(obj: any): boolean {
    if (!obj) return false;
    return Object.keys(obj).length > 0;
  }

  getStatusText(status: string | undefined): string {
    if (!status) return 'Cargando...';
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'PENDING': return 'En Proceso';
      case 'COMPLETED': return 'Completado';
      default: return status;
    }
  }

  goBack(): void {
    this.router.navigate(['/app/manager/instances']);
  }
}
