import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PolicyService } from '../../../core/services/policy.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { DepartmentService } from '../../../core/services/department.service';
import { RoleService } from '../../../core/services/role.service';
import { Policy, ActivityNode, User, Department, Role } from '../../../core/models';
import { ToastService } from '../../../shared/services/toast.service';
import { LucideAngularModule, Eye, FileText, Users, ArrowLeft, UserPlus, ListTodo, X, CheckCircle, Bot, Sparkles } from 'lucide-angular';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { AiDlService } from '../../../core/services/ai-dl.service';


@Component({
  selector: 'app-assigned-policies',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, LoaderComponent],
  template: `
    <div class="p-6">
      @if (!selectedPolicy()) {
        <div class="mb-6">
          <h1 class="text-2xl font-semibold text-foreground">Políticas Asignadas</h1>
          <p class="mt-1 text-sm text-muted-foreground">Políticas que superviso como gestor responsable</p>
        </div>

        @if (isLoading()) {
          <div class="flex items-center justify-center py-10">
            <app-loader text="Cargando tus políticas..."></app-loader>
          </div>
        } @else {
          <!-- Políticas ACTIVAS -->
          @if (activePolicies().length > 0) {
            <h2 class="mb-3 text-sm font-semibold text-foreground">Políticas Activas</h2>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
              @for (policy of activePolicies(); track policy.uuid) {
                <div class="group cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
                     (click)="selectPolicy(policy)">
                  <div class="mb-3 flex items-start justify-between">
                    <lucide-icon [img]="FileText" [size]="20" class="text-primary" />
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" [class]="getStateBadgeClass(policy.state)">{{ policy.state }}</span>
                  </div>
                  <h3 class="mb-1 text-sm font-semibold text-foreground line-clamp-2">{{ policy.name || policy.description }}</h3>
                  <p class="text-xs text-muted-foreground mb-2">{{ policy.activityNodes?.length ?? 0 }} nodos &middot; {{ policy.transitions?.length ?? 0 }} transiciones</p>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1 text-xs text-primary font-medium">
                      <lucide-icon [img]="ListTodo" [size]="14" />
                      <span>Ver actividades</span>
                    </div>
                    <button (click)="viewPolicyDiagram(policy); $event.stopPropagation()" class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <lucide-icon [img]="Eye" [size]="12" />
                      <span>Diagrama</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Políticas NO activas (DRAFT / INACTIVE) -->
          @if (inactivePolicies().length > 0) {
            <h2 class="mb-3 text-sm font-semibold text-muted-foreground">No disponibles para gestión</h2>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (policy of inactivePolicies(); track policy.uuid) {
                <div class="rounded-xl border border-border bg-card/60 p-5 shadow-sm opacity-60 cursor-not-allowed">
                  <div class="mb-3 flex items-start justify-between">
                    <lucide-icon [img]="FileText" [size]="20" class="text-muted-foreground" />
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" [class]="getStateBadgeClass(policy.state)">{{ policy.state }}</span>
                  </div>
                  <h3 class="mb-1 text-sm font-semibold text-foreground line-clamp-2">{{ policy.name || policy.description }}</h3>
                  <p class="text-xs text-muted-foreground mb-2">{{ policy.activityNodes?.length ?? 0 }} nodos &middot; {{ policy.transitions?.length ?? 0 }} transiciones</p>
                  <p class="text-[10px] text-muted-foreground italic mt-1">
                    @if (policy.state === 'DRAFT') { Pendiente de publicación por el diseñador }
                    @else { Política desactivada }
                  </p>
                </div>
              }
            </div>
          }

          @if (assignedPolicies().length === 0) {
            <div class="col-span-full rounded-xl border-2 border-dashed border-border py-16 text-center">
              <lucide-icon [img]="FileText" [size]="40" class="mx-auto mb-3 text-muted-foreground/50" />
              <p class="text-sm text-muted-foreground">No tienes políticas asignadas</p>
              <p class="text-xs text-muted-foreground mt-1">Las políticas asignadas aparecerán aquí</p>
            </div>
          }
        }
      } @else {
        <!-- Actividades de la Política Seleccionada -->
        <div class="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div>
             <button (click)="selectedPolicy.set(null)" class="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
               <lucide-icon [img]="ArrowLeft" [size]="14" />
               Volver a Políticas
             </button>
            <h1 class="text-2xl font-semibold text-foreground">Actividades: {{ selectedPolicy()!.name || selectedPolicy()!.description }}</h1>
            <p class="mt-1 text-sm text-muted-foreground">Gestiona y asigna las actividades a los funcionarios correspondientes</p>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="autoAssign()" [disabled]="isLoadingRecommendations() || isAutoAssigning()" class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm">
              <lucide-icon [img]="BotIcon" [size]="16" />
              {{ isLoadingRecommendations() ? 'Calculando...' : (isAutoAssigning() ? 'Asignando...' : 'Asignar automáticamente') }}
            </button>
            <button (click)="startPolicyInstance()" class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
              <lucide-icon [img]="ListTodo" [size]="16" />
              Iniciar instancia
            </button>
            <button (click)="viewPolicyDiagram(selectedPolicy()!)" class="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
              <lucide-icon [img]="Eye" [size]="16" />
              Ver diagrama
            </button>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (node of filteredActivities(); track node.uuid) {
            <div class="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg transition-transform duration-200 cursor-pointer">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-[10px] font-bold uppercase text-primary tracking-wider">{{ node.state }}</span>
                  <span class="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">{{ getDepartmentName(node.laneId) }}</span>
                </div>
                <h2 class="text-sm font-semibold text-foreground mb-1">{{ node.name}}</h2>
                <p class="mb-2 text-xs text-muted-foreground">Descripcion: {{ node.description }}</p>
              </div>
              <div class="mt-3 pt-3 border-t border-border">
                @if (node.assigneeId) {
                  <div class="mb-2 flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 px-2 py-1.5">
                    <lucide-icon [img]="UserPlus" [size]="12" class="text-green-600 shrink-0" />
                    <span class="text-xs font-medium text-green-700 dark:text-green-400 truncate">{{ getUserName(node.assigneeId) }}</span>
                  </div>
                } @else {
                  <div class="mb-2 flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1.5">
                    <lucide-icon [img]="UserPlus" [size]="12" class="text-muted-foreground shrink-0" />
                    <span class="text-xs text-muted-foreground italic">Sin asignar</span>
                  </div>
                }
                <div class="flex justify-end">
                  <button (click)="openAssignModal(node)" class="flex items-center gap-1.5 text-xs font-medium rounded-lg text-primary hover:text-primary/80 transition-colors">
                    <lucide-icon [img]="UserPlus" [size]="14" />
                    {{ node.assigneeId ? 'Cambiar' : 'Asignar' }} Funcionario
                  </button>
                </div>
              </div>
            </div>
          } @empty {
            <div class="col-span-full rounded-xl border-2 border-dashed border-border py-16 text-center">
              <lucide-icon [img]="ListTodo" [size]="40" class="mx-auto mb-3 text-muted-foreground/50" />
              <p class="text-sm text-muted-foreground">Esta política no tiene actividades asignables.</p>
            </div>
          }
        </div>
      }

      <!-- Modal de Asignación -->
      @if (assigningActivity()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" (click)="closeAssignModal()">
          <div class="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg" (click)="$event.stopPropagation()">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-foreground">Asignar Funcionario</h2>
              <button (click)="closeAssignModal()" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                <lucide-icon [img]="XIcon" [size]="18" />
              </button>
            </div>
            
            <div class="mb-4 text-sm text-muted-foreground">
              <p class="mb-1"><strong>Actividad:</strong> {{ assigningActivity()?.description }}</p>
              <p>Selecciona un funcionario del departamento: <strong>{{ getDepartmentName(assigningActivity()?.laneId) }}</strong></p>
            </div>

            <!-- Deep Learning Predictions -->
            @if (bestRouteLoading()) {
              <div class="mb-4 text-xs text-muted-foreground flex items-center gap-2 animate-pulse">
                <lucide-icon [img]="BotIcon" [size]="14" class="text-primary animate-spin" />
                <span>La Red Neuronal estimando tiempos de finalización...</span>
              </div>
            } @else if (bestRouteInfo()) {
              <div class="mb-4 p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2 animate-in fade-in duration-200">
                <div class="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <lucide-icon [img]="BotIcon" [size]="14" />
                  <span>Recomendación Deep Learning</span>
                </div>
                <div class="text-xs text-foreground">
                  Funcionario más rápido estimado: 
                  <strong class="text-primary">{{ getUserName(bestRouteInfo()?.best_employee_id) }}</strong> 
                  (Estimado: {{ bestRouteInfo()?.estimated_hours | number:'1.1-1' }} hrs)
                </div>
                <div class="text-[10px] text-muted-foreground divide-y divide-border pt-1">
                  @for (est of bestRouteInfo()?.all_estimates; track est.employee_id) {
                    <div class="flex justify-between py-1">
                      <span>{{ getUserName(est.employee_id) }}</span>
                      <span class="font-medium text-foreground">
                        {{ est.estimated_hours | number:'1.1-1' }} hrs ({{ getPendingTasksCount(est.employee_id) }} p.)
                      </span>
                    </div>
                  }
                </div>
              </div>
            }

            <form (ngSubmit)="confirmAssignment()">
              <label class="mb-1 block text-sm font-medium text-foreground">Funcionario</label>
              <select [(ngModel)]="selectedUserId" name="userId"
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" required>
                <option value="" disabled>Selecciona un funcionario...</option>
                @if (departmentUsers().length === 0) {
                  <option value="" disabled>Sin funcionarios en este departamento</option>
                }
                @for (user of departmentUsers(); track user.uuid) {
                  <option [value]="user.uuid">
                    {{ user.name }} {{ user.lastname }} 
                    @if (bestRouteInfo()) {
                       &middot; Est: {{ getCandidateEstimateHours(user.uuid) | number:'1.1-1' }} hrs
                    }
                  </option>
                }
              </select>
              <div class="mt-4 flex justify-end gap-2">
                <button type="button" (click)="closeAssignModal()" class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Cancelar</button>
                <button type="submit" [disabled]="!selectedUserId" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">Guardar Asignación</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Recommendations Modal -->
      @if (showRecommendationsModal()) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div class="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95">
            <div class="mb-4 flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 class="text-lg font-semibold flex items-center gap-2">
                  <lucide-icon [img]="SparklesIcon" class="text-violet-600" [size]="20" />
                  Recomendaciones de IA
                </h3>
                <p class="text-sm text-muted-foreground">Funcionarios óptimos calculados por Deep Learning</p>
              </div>
              <button (click)="showRecommendationsModal.set(false)" class="rounded-lg p-2 hover:bg-accent">
                <lucide-icon [img]="XIcon" [size]="20" />
              </button>
            </div>

            <div class="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
              @for (assignment of aiRecommendations(); track assignment.activityUuid) {
                <div class="flex items-center justify-between p-4 rounded-xl border border-border bg-background">
                  <div>
                    <p class="font-medium text-sm text-foreground">{{ getActivityName(assignment.activityUuid) }}</p>
                    <p class="text-xs text-muted-foreground mt-1">Tiempo estimado: {{ assignment.estimatedHours | number:'1.1-1' }}h</p>
                  </div>
                  <div class="flex items-center gap-2 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 px-3 py-1.5 rounded-lg">
                    <lucide-icon [img]="UserIcon" [size]="14" />
                    <span class="text-sm font-semibold">{{ getUserName(assignment.employeeUuid) }}</span>
                  </div>
                </div>
              }
              @if (aiRecommendations().length === 0) {
                <p class="text-center text-sm text-muted-foreground py-6">No hay recomendaciones disponibles para esta política.</p>
              }
            </div>

            <div class="mt-6 flex justify-end gap-3 border-t border-border pt-4">
              <button (click)="showRecommendationsModal.set(false)" class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
                Cancelar
              </button>
              <button (click)="confirmAutoAssign()" [disabled]="aiRecommendations().length === 0 || isAutoAssigning()" class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
                {{ isAutoAssigning() ? 'Aplicando...' : 'Confirmar Asignación' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Iniciar Instancia -->
      @if (showInstanceStartedModal()) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="showInstanceStartedModal.set(false)">
          <div class="flex flex-col items-center justify-center p-8 rounded-2xl bg-card shadow-2xl animate-in zoom-in-95 duration-200">
            <lucide-icon [img]="CheckCircle" [size]="80" class="text-green-500 mb-4" />
            <h2 class="text-2xl font-bold text-foreground">Instancia Iniciada</h2>
            <p class="mt-2 text-muted-foreground">La instancia de la política se ha iniciado correctamente.</p>
          </div>
        </div>
      }
    </div>
  `,
})
export class AssignedPoliciesComponent implements OnInit {
  private readonly policyService = inject(PolicyService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly departmentService = inject(DepartmentService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(ToastService);
  private readonly aiDlService = inject(AiDlService);

  readonly Eye = Eye;
  readonly FileText = FileText;
  readonly Users = Users;
  readonly ArrowLeft = ArrowLeft;
  readonly UserPlus = UserPlus;
  readonly ListTodo = ListTodo;
  readonly XIcon = X;
  readonly CheckCircle = CheckCircle;
  readonly BotIcon = Bot;
  readonly SparklesIcon = Sparkles;
  readonly UserIcon = Users;

  isAutoAssigning = signal<boolean>(false);
  bestRouteLoading = signal<boolean>(false);
  bestRouteInfo = signal<any>(null);
  allInstances = signal<any[]>([]);

  assignedPolicies = signal<any[]>([]);
  selectedPolicy = signal<Policy | null>(null);
  isLoading = signal<boolean>(true);

  activePolicies = computed(() => this.assignedPolicies().filter(p => p.state === 'ACTIVE'));
  inactivePolicies = computed(() => this.assignedPolicies().filter(p => p.state !== 'ACTIVE'));
  
  users = signal<User[]>([]);
  departments = signal<Department[]>([]);
  roles = signal<Role[]>([]);
  
  showInstanceStartedModal = signal(false);
  
  // Recommendations state
  isLoadingRecommendations = signal(false);
  showRecommendationsModal = signal(false);
  aiRecommendations = signal<any[]>([]);

  assigningActivity = signal<ActivityNode | null>(null);
  selectedUserId: string = '';

  filteredActivities = computed(() => {
    const policy = this.selectedPolicy();
    if (!policy) return [];
    return policy.activityNodes.filter(n => n.state === 'ACTIVITY' || n.state === 'APPROVAL');
  });

  departmentUsers = computed(() => {
    const activity = this.assigningActivity();
    if (!activity || !activity.laneId) return [];
    
    // Buscar el rol FUNCIONARIO o EMPLOYEE
    const funcRole = this.roles().find(r => r.roleName.toUpperCase() === 'FUNCIONARIO' || r.roleName.toUpperCase() === 'EMPLOYEE');
    if (!funcRole) return [];

    // Filtrar por departamento correspondientes y solo por rol FUNCIONARIO
    return this.users().filter(u => u.departmentId === activity.laneId && u.roleId === funcRole.uuid);
  });

  ngOnInit(): void {
    this.loadAssignedPolicies();
    this.userService.getAll().subscribe(u => this.users.set(u));
    this.departmentService.getAll().subscribe(d => this.departments.set(d));
    this.roleService.getAll().subscribe(r => this.roles.set(r));
    this.policyService.getAllInstances().subscribe({
      next: (instances) => this.allInstances.set(instances),
      error: () => {}
    });
  }

  loadAssignedPolicies(): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;
    
    this.isLoading.set(true);
    setTimeout(() => {
      this.policyService.getAssignedPolicies(currentUser.uuid).subscribe({
        next: (assigned) => {
          this.assignedPolicies.set(assigned);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading assigned policies', err);
          this.isLoading.set(false);
        }
      });
    }, 1500);
  }

  selectPolicy(policy: Policy): void {
    this.selectedPolicy.set(policy);
  }

  viewPolicyDiagram(policy: Policy): void {
    // Navigate to a read-only view of the policy diagram
    this.router.navigate(['/app/manager/policies', policy.uuid, 'diagram']);
  }

  getDepartmentName(laneId?: string): string {
    if (!laneId) return 'Sin Emplazamiento';
    const dept = this.departments().find(d => d.uuid === laneId);
    return dept ? dept.name : 'Desconocido';
  }

  getUserName(userId?: string): string {
    if (!userId) return 'Sin asignar';
    const user = this.users().find(u => u.uuid === userId);
    return user ? `${user.name} ${user.lastname}` : 'Sin asignar';
  }

  getPendingTasksCount(userId: string): number {
    return this.allInstances().filter(
      inst => inst.currentAssigneeId === userId && inst.status !== 'COMPLETED'
    ).length;
  }

  getCandidateEstimateHours(userId: string): number {
    const info = this.bestRouteInfo();
    if (!info || !info.all_estimates) return 0;
    const est = info.all_estimates.find((e: any) => e.employee_id === userId);
    return est ? est.estimated_hours : 0;
  }

  openAssignModal(activity: ActivityNode): void {
    this.assigningActivity.set(activity);
    this.selectedUserId = '';
    this.bestRouteInfo.set(null);

    const candidates = this.departmentUsers().map(u => ({
      employee_id: u.uuid,
      pending_tasks: this.getPendingTasksCount(u.uuid)
    }));

    if (candidates.length > 0 && this.selectedPolicy()) {
      this.bestRouteLoading.set(true);
      this.aiDlService.findBestRoute(
        this.selectedPolicy()!.uuid,
        activity.uuid,
        candidates
      ).subscribe({
        next: (res) => {
          this.bestRouteLoading.set(false);
          this.bestRouteInfo.set(res);
        },
        error: (err) => {
          console.error('Error finding best route', err);
          this.bestRouteLoading.set(false);
        }
      });
    }
  }

  autoAssign(): void {
    const policy = this.selectedPolicy();
    if (!policy) return;

    // Primer paso: Consultar las recomendaciones sin aplicar
    this.isLoadingRecommendations.set(true);
    this.policyService.getAutoAssignRecommendations(policy.uuid).subscribe({
      next: (response) => {
        this.isLoadingRecommendations.set(false);
        const mapped = (response.assignments || []).map((a: any) => ({
          activityUuid: a.activity_uuid || a.activityUuid,
          employeeUuid: a.employee_uuid || a.employeeUuid,
          justification: a.justification,
          estimatedHours: a.estimated_hours || a.estimatedHours || parseFloat(a.justification?.match(/estimado:\s*([\d.]+)/)?.[1] || '0')
        })).filter((a: any) => {
          const policyVal = this.selectedPolicy();
          if (!policyVal || !policyVal.activityNodes) return true;
          const node = policyVal.activityNodes.find((n: any) => n.uuid === a.activityUuid);
          return node && (node.state === 'ACTIVITY' || node.state === 'APPROVAL');
        });
        this.aiRecommendations.set(mapped);
        this.showRecommendationsModal.set(true);
      },
      error: (err) => {
        this.isLoadingRecommendations.set(false);
        this.toast.show('Error al calcular las recomendaciones óptimas: ' + (err?.error?.message || err?.message || 'Servicio no disponible'), 'error');
      }
    });
  }

  confirmAutoAssign(): void {
    const policy = this.selectedPolicy();
    if (!policy) return;

    // Segundo paso: Aplicar permanentemente la asignación en DB
    this.isAutoAssigning.set(true);

    const assignmentsPayload = this.aiRecommendations().map(r => ({
      activity_uuid: r.activityUuid,
      employee_uuid: r.employeeUuid,
      justification: r.justification
    }));

    this.policyService.autoAssignPolicy(policy.uuid, assignmentsPayload).subscribe({
      next: (updatedPolicy) => {
        this.assignedPolicies.update(list =>
          list.map(p => p.uuid === updatedPolicy.uuid ? updatedPolicy : p)
        );
        this.selectedPolicy.set(updatedPolicy);
        this.isAutoAssigning.set(false);
        this.showRecommendationsModal.set(false);
        this.toast.show('Asignación automática completada con IA', 'success');
      },
      error: (err) => {
        this.isAutoAssigning.set(false);
        this.toast.show('Error al asignar automáticamente: ' + (err?.error?.message || err?.message || 'Servicio IA no disponible'), 'error');
      }
    });
  }

  getActivityName(uuid: string): string {
    const policy = this.selectedPolicy();
    if (!policy || !policy.activityNodes) return 'Actividad';
    const node = policy.activityNodes.find((n: any) => n.uuid === uuid);
    return node?.name || 'Actividad';
  }

  startPolicyInstance(): void {
    const policy = this.selectedPolicy();
    const currentUser = this.authService.currentUser();
    if (!policy || !currentUser) return;

    this.policyService.startInstance(policy.uuid, currentUser.uuid).subscribe({
      next: (res) => {
        this.showInstanceStartedModal.set(true);
        setTimeout(() => this.showInstanceStartedModal.set(false), 3000);
      },
      error: (err) => {
        console.error('Error al iniciar la instancia:', err);
        this.toast.error('Ocurrió un error al iniciar la instancia');
      }
    });
  }

  closeAssignModal(): void {
    this.assigningActivity.set(null);
    this.selectedUserId = '';
    this.bestRouteInfo.set(null);
  }

  confirmAssignment(): void {
    const activity = this.assigningActivity();
    const policy = this.selectedPolicy();
    if (!activity || !policy || !this.selectedUserId) return;

    // Aquí deberíamos llamar al método del servicio, asumiendo que hemos integrado
    // assignActivityToUser(policyId: string, activityId: string, userId: string) en policy.service.ts
    // Si tu backend no lo tiene, es importante crearlo para que guarde esta asignación.
    this.policyService.assignActivityToUser(policy.uuid, activity.uuid, this.selectedUserId).subscribe({
      next: () => {
        (activity as any).assignedUserId = this.selectedUserId;
        this.toast.success('Actividad asignada correctamente al funcionario');
        this.closeAssignModal();
      },
      error: (err) => {
        // En caso de que no exista el backend, mostraremos un mensaje indicando el payload a enviar.
        console.error('Error o endpoint de backend ausente:', err);
        this.toast.error('Ocurrió un error (verifica el endpoint en el backend)');
        // Como simulación para la demo en caso falle:
        // this.closeAssignModal();
      }
    });
  }

  getStateBadgeClass(state: string): string {
    switch (state) {
      case 'ACTIVE': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'INACTIVE': return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-muted text-muted-foreground';
    }
  }
}