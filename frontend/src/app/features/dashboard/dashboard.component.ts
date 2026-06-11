import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  FileText,
  Users,
  Building2,
  Shield,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  Inbox,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Bot,
  ChevronDown,
  Sparkles,
  ArrowRight,
  History,
  ClipboardList,
  Bell,
  Settings,
  Send,
  X
} from 'lucide-angular';
import { PolicyService } from '../../core/services/policy.service';
import { UserService } from '../../core/services/user.service';
import { DepartmentService } from '../../core/services/department.service';
import { RoleService } from '../../core/services/role.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { IncomingRequestsService } from '../../core/services/incoming-requests.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AiDlService, BottleneckInputItem } from '../../core/services/ai-dl.service';
import { AiChatService } from '../../core/services/ai-chat.service';
import { ToastService } from '../../shared/services/toast.service';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="p-6 space-y-6">

      <!-- ═══════════════════════════════════════════
           EMPLOYEE DASHBOARD
      ═══════════════════════════════════════════ -->
      @if (role() === 'EMPLOYEE') {
        <div>
          <h1 class="text-2xl font-semibold text-foreground">Bienvenido, {{ userName() }} 👋</h1>
          <p class="mt-1 text-sm text-muted-foreground">Aquí están tus tareas y actividad reciente</p>
        </div>

        <!-- Notification banner -->
        @if (notificationService.unreadCount() > 0) {
          <div class="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 px-4 py-3">
            <lucide-icon [img]="BellIcon" [size]="18" class="text-blue-600 dark:text-blue-400 shrink-0" />
            <span class="text-sm font-medium text-blue-700 dark:text-blue-400">
              {{ notificationService.unreadCount() }} notificación{{ notificationService.unreadCount() !== 1 ? 'es' : '' }} sin leer
            </span>
          </div>
        }

        <!-- KPI Cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tareas Pendientes</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <lucide-icon [img]="InboxIcon" [size]="18" class="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div class="mt-3">
              <span class="text-3xl font-bold text-foreground">{{ employeePendingCount() }}</span>
            </div>
          </div>
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tareas Completadas</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <lucide-icon [img]="CheckCircleIcon" [size]="18" class="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div class="mt-3">
              <span class="text-3xl font-bold text-foreground">{{ employeeCompletedCount() }}</span>
            </div>
          </div>
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sin Leer</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <lucide-icon [img]="BellIcon" [size]="18" class="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div class="mt-3">
              <span class="text-3xl font-bold text-foreground">{{ notificationService.unreadCount() }}</span>
            </div>
          </div>
        </div>

        <!-- Recent tasks + Quick access -->
        <div class="grid gap-6 lg:grid-cols-3">
          <div class="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center gap-2 border-b border-border px-5 py-4">
              <lucide-icon [img]="ActivityIcon" [size]="18" class="text-primary" />
              <h2 class="text-sm font-semibold text-foreground">Actividad reciente</h2>
            </div>
            <div class="divide-y divide-border">
              @for (item of recentActivity; track item.text) {
                <div class="flex items-center gap-3 px-5 py-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" [class]="item.iconBg">
                    <lucide-icon [img]="item.icon" [size]="14" [class]="item.iconColor" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-foreground truncate">{{ item.text }}</p>
                    <p class="text-[10px] text-muted-foreground">{{ item.time }}</p>
                  </div>
                </div>
              }
              @if (recentActivity.length === 0) {
                <div class="px-5 py-8 text-center text-sm text-muted-foreground">Sin actividad reciente</div>
              }
            </div>
          </div>

          <div class="rounded-xl border border-border bg-card shadow-sm">
            <div class="border-b border-border px-5 py-4">
              <h2 class="text-sm font-semibold text-foreground">Accesos Rápidos</h2>
            </div>
            <div class="p-4 space-y-2">
              <a routerLink="/app/employee/inbox"
                class="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <div class="flex items-center gap-3">
                  <lucide-icon [img]="InboxIcon" [size]="16" class="text-blue-600" />
                  <span class="text-sm font-medium text-foreground">Bandeja de Entrada</span>
                </div>
                <lucide-icon [img]="ArrowRightIcon" [size]="12" class="text-muted-foreground group-hover:text-foreground" />
              </a>
              <a routerLink="/app/employee/history"
                class="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <div class="flex items-center gap-3">
                  <lucide-icon [img]="HistoryIcon" [size]="16" class="text-green-600" />
                  <span class="text-sm font-medium text-foreground">Historial</span>
                </div>
                <lucide-icon [img]="ArrowRightIcon" [size]="12" class="text-muted-foreground group-hover:text-foreground" />
              </a>
            </div>
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════════════
           MANAGER DASHBOARD
      ═══════════════════════════════════════════ -->
      @if (role() === 'MANAGER') {
        <div>
          <h1 class="text-2xl font-semibold text-foreground">Panel del Manager</h1>
          <p class="mt-1 text-sm text-muted-foreground">Bienvenido, {{ userName() }} — resumen de tus procesos activos</p>
        </div>

        <!-- KPI Cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Trámites Activos</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <lucide-icon [img]="ActivityIcon" [size]="18" class="text-blue-600" />
              </div>
            </div>
            <div class="mt-3">
              <span class="text-3xl font-bold text-foreground">{{ managerActiveCount() }}</span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">trámites en curso</p>
          </div>
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Completados</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <lucide-icon [img]="CheckCircleIcon" [size]="18" class="text-green-600" />
              </div>
            </div>
            <div class="mt-3">
              <span class="text-3xl font-bold text-foreground">{{ managerCompletedCount() }}</span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">trámites finalizados</p>
          </div>
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Entrantes</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <lucide-icon [img]="InboxIcon" [size]="18" class="text-amber-600" />
              </div>
            </div>
            <div class="mt-3">
              <span class="text-3xl font-bold text-foreground">{{ incomingRequestsService.incomingCount() }}</span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">solicitudes entrantes</p>
          </div>
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Políticas</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <lucide-icon [img]="ShieldIcon" [size]="18" class="text-purple-600" />
              </div>
            </div>
            <div class="mt-3">
              <span class="text-3xl font-bold text-foreground">{{ managerPoliciesCount() }}</span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">políticas asignadas</p>
          </div>
        </div>

        <!-- Recent instances + Quick access -->
        <div class="grid gap-6 lg:grid-cols-3">
          <div class="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center gap-2 border-b border-border px-5 py-4">
              <lucide-icon [img]="ClipboardListIcon" [size]="18" class="text-primary" />
              <h2 class="text-sm font-semibold text-foreground">Instancias recientes</h2>
            </div>
            <div class="divide-y divide-border">
              @for (item of recentActivity; track item.text) {
                <div class="flex items-center gap-3 px-5 py-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" [class]="item.iconBg">
                    <lucide-icon [img]="item.icon" [size]="14" [class]="item.iconColor" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-foreground truncate">{{ item.text }}</p>
                    <p class="text-[10px] text-muted-foreground">{{ item.time }}</p>
                  </div>
                </div>
              }
              @if (recentActivity.length === 0) {
                <div class="px-5 py-10 text-center text-sm text-muted-foreground">Sin instancias aún</div>
              }
            </div>
          </div>

          <div class="rounded-xl border border-border bg-card shadow-sm">
            <div class="border-b border-border px-5 py-4">
              <h2 class="text-sm font-semibold text-foreground">Accesos Rápidos</h2>
            </div>
            <div class="p-4 space-y-2">
              <a routerLink="/app/manager/incoming"
                class="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <div class="flex items-center gap-3">
                  <lucide-icon [img]="InboxIcon" [size]="16" class="text-amber-600" />
                  <span class="text-sm font-medium text-foreground">Trámites Entrantes</span>
                </div>
                <lucide-icon [img]="ArrowRightIcon" [size]="12" class="text-muted-foreground group-hover:text-foreground" />
              </a>
              <a routerLink="/app/manager/active"
                class="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <div class="flex items-center gap-3">
                  <lucide-icon [img]="ActivityIcon" [size]="16" class="text-blue-600" />
                  <span class="text-sm font-medium text-foreground">Instancias Activas</span>
                </div>
                <lucide-icon [img]="ArrowRightIcon" [size]="12" class="text-muted-foreground group-hover:text-foreground" />
              </a>
              <a routerLink="/app/manager/history"
                class="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <div class="flex items-center gap-3">
                  <lucide-icon [img]="HistoryIcon" [size]="16" class="text-green-600" />
                  <span class="text-sm font-medium text-foreground">Historial</span>
                </div>
                <lucide-icon [img]="ArrowRightIcon" [size]="12" class="text-muted-foreground group-hover:text-foreground" />
              </a>
              <a routerLink="/app/manager/policies"
                class="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <div class="flex items-center gap-3">
                  <lucide-icon [img]="ShieldIcon" [size]="16" class="text-purple-600" />
                  <span class="text-sm font-medium text-foreground">Políticas Asignadas</span>
                </div>
                <lucide-icon [img]="ArrowRightIcon" [size]="12" class="text-muted-foreground group-hover:text-foreground" />
              </a>
            </div>
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════════════
           DESIGNER DASHBOARD
      ═══════════════════════════════════════════ -->
      @if (role() === 'DESIGNER') {
        <div>
          <h1 class="text-2xl font-semibold text-foreground">Panel del Diseñador</h1>
          <p class="mt-1 text-sm text-muted-foreground">Bienvenido, {{ userName() }} — gestiona y analiza tus políticas</p>
        </div>

        <!-- KPI Cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Políticas</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <lucide-icon [img]="ShieldIcon" [size]="18" class="text-purple-600" />
              </div>
            </div>
            <div class="mt-3"><span class="text-3xl font-bold text-foreground">{{ totalPolicies() }}</span></div>
          </div>
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Activas</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <lucide-icon [img]="CheckCircleIcon" [size]="18" class="text-green-600" />
              </div>
            </div>
            <div class="mt-3"><span class="text-3xl font-bold text-foreground">{{ activePolicies() }}</span></div>
          </div>
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Borrador</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <lucide-icon [img]="FileTextIcon" [size]="18" class="text-yellow-600" />
              </div>
            </div>
            <div class="mt-3"><span class="text-3xl font-bold text-foreground">{{ draftPolicies() }}</span></div>
          </div>
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Inactivas</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                <lucide-icon [img]="ShieldIcon" [size]="18" class="text-gray-500" />
              </div>
            </div>
            <div class="mt-3"><span class="text-3xl font-bold text-foreground">{{ inactivePolicies() }}</span></div>
          </div>
        </div>

        <!-- AI Analytics DESTACADO + políticas recientes -->
        <div class="grid gap-6 lg:grid-cols-5">
          <!-- AI Panel (3/5) -->
          <div class="lg:col-span-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent shadow-sm">
            <div class="flex items-center gap-2 border-b border-primary/20 px-5 py-4 justify-between">
              <div class="flex items-center gap-2">
                <lucide-icon [img]="SparklesIcon" [size]="18" class="text-primary" />
                <h2 class="text-sm font-semibold text-foreground">Análisis IA de Procesos</h2>
              </div>
              <div class="flex bg-muted/60 dark:bg-slate-800 p-0.5 rounded-lg border border-border shrink-0">
                <!--<button type="button" (click)="setAnalysisMode('generative')" [class.bg-white]="analysisMode() === 'generative'" [class.dark:bg-slate-700]="analysisMode() === 'generative'" [class.shadow-sm]="analysisMode() === 'generative'" class="px-2.5 py-1 text-[10px] font-medium rounded-md transition-all text-foreground">Generativo (LLM)</button>-->
                <button type="button" (click)="setAnalysisMode('dl')" [class.bg-white]="analysisMode() === 'dl'" [class.dark:bg-slate-700]="analysisMode() === 'dl'" [class.shadow-sm]="analysisMode() === 'dl'" class="px-2.5 py-1 text-[10px] font-medium rounded-md transition-all text-foreground">Red Neuronal Deep Learning</button>
              </div>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-1.5">Seleccionar política</label>
                <div class="relative">
                  <select [(ngModel)]="selectedPolicyId" (change)="onPolicyChange()"
                    class="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Elige una política...</option>
                    @for (p of allPolicies(); track p.uuid) {
                      <option [value]="p.uuid">{{ p.name || p.description }}</option>
                    }
                  </select>
                  <lucide-icon [img]="ChevronDownIcon" [size]="14" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <!-- Generative Analytics mode -->
              
              <!-- Deep Learning Analytics mode -->
              @if (analysisMode() === 'dl') {
                @if (dlAnalyticsLoading()) {
                  <div class="flex items-center gap-2 text-xs text-muted-foreground animate-pulse py-4">
                    <lucide-icon [img]="BotIcon" [size]="16" class="text-primary animate-spin" />
                    El Autoencoder TensorFlow está detectando anomalías en tiempos de ejecución...
                  </div>
                }
                @if (dlAnalyticsResult().length > 0) {
                  <div class="space-y-3 animate-in fade-in duration-200">
                    <div class="text-[10px] text-muted-foreground flex items-center justify-between mb-1">
                      <span>Resultados de reconstrucción del Autoencoder (Red Neuronal)</span>
                      <span class="font-semibold text-primary">Modelo: bottleneck_autoencoder.h5</span>
                    </div>
                    <div class="overflow-x-auto rounded-xl border border-border bg-card">
                      <table class="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr class="bg-muted/40 border-b border-border text-muted-foreground">
                            <th class="p-2.5 font-semibold">Trámite</th>
                            <th class="p-2.5 font-semibold">Actividad / Tarea</th>
                            <th class="p-2.5 font-semibold">Departamento</th>
                            <th class="p-2.5 font-semibold text-center">Duración</th>
                            <th class="p-2.5 font-semibold text-center">Error Reconst.</th>
                            <th class="p-2.5 font-semibold text-center">Score de Riesgo</th>
                            <th class="p-2.5 font-semibold text-right">Resultado</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-border">
                          @for (item of dlAnalyticsResult(); track $index) {
                            <tr class="hover:bg-muted/20 transition-colors">
                              <td class="p-2.5 text-muted-foreground font-semibold">{{ item.instance_id || 'N/A' }}</td>
                              <td class="p-2.5 font-medium text-foreground">{{ item.task_name }}</td>
                              <td class="p-2.5 text-muted-foreground">{{ getDepartmentName(item.department_id) }}</td>
                              <td class="p-2.5 text-center text-foreground font-semibold">{{ item.duration_hours }}h</td>
                              <td class="p-2.5 text-center text-muted-foreground">{{ item.reconstruction_error | number:'1.2-2' }}</td>
                              <td class="p-2.5 text-center font-semibold" [ngClass]="item.is_anomaly ? 'text-destructive' : 'text-green-600'">
                                {{ item.risk_score * 100 | number:'1.0-0' }}%
                              </td>
                              <td class="p-2.5 text-right">
                                @if (item.is_anomaly) {
                                  <span class="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-semibold text-destructive">
                                    <lucide-icon [img]="AlertTriangleIcon" [size]="8" /> Anomalía
                                  </span>
                                } @else {
                                  <span class="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[9px] font-semibold text-green-700 dark:text-green-400">
                                    <lucide-icon [img]="CheckCircleIcon" [size]="8" /> Normal
                                  </span>
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>

                    <!-- Charts wrapper -->
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                      <!-- Pie Chart of Anomalies -->
                      <div class="md:col-span-2 rounded-xl border border-border bg-card shadow-sm p-4 flex flex-col justify-between">
                        <h3 class="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                          <lucide-icon [img]="PieChartIcon" [size]="12" class="text-muted-foreground" />
                          Proporción de Anomalías (Autoencoder)
                        </h3>
                        <div class="flex items-center gap-4 justify-around py-2">
                          <svg width="90" height="90" viewBox="0 0 120 120">
                            @for (slice of dlPieSlices(); track slice.label) {
                              <path [attr.d]="slice.path" [attr.fill]="slice.fill" stroke="white" stroke-width="2" />
                            }
                            <circle cx="60" cy="60" r="30" fill="white" class="dark:fill-card" />
                            <text x="60" y="65" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">
                              {{ dlAnalyticsResult().length }}
                            </text>
                          </svg>
                          <div class="space-y-1.5 shrink-0">
                            @for (slice of dlPieSlices(); track slice.label) {
                              <div class="flex items-center gap-2 text-[10px]">
                                <span class="h-2 w-2 rounded-full shrink-0" [style.background]="slice.fill"></span>
                                <span class="text-muted-foreground">{{ slice.label }}</span>
                                <span class="font-semibold text-foreground">{{ slice.value }} ({{ slice.percentage }}%)</span>
                              </div>
                            }
                          </div>
                        </div>
                      </div>

                      <!-- Bar Chart of Durations -->
                      <div class="md:col-span-3 rounded-xl border border-border bg-card shadow-sm p-4">
                        <h3 class="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                          <lucide-icon [img]="BarChart3Icon" [size]="12" class="text-muted-foreground" />
                          Duración de Tareas por Instancia
                        </h3>
                        <div class="space-y-2.5 max-h-[120px] overflow-y-auto pr-1">
                          @for (bar of dlBarChartData(); track bar.label) {
                            <div>
                              <div class="flex justify-between text-[10px] mb-0.5">
                                <span class="text-muted-foreground truncate max-w-[180px]">{{ bar.label }}</span>
                                <span class="font-medium text-foreground">{{ bar.value }}h</span>
                              </div>
                              <div class="w-full rounded-full bg-muted h-1.5">
                                <div class="rounded-full h-1.5 transition-all" [class]="bar.color" [style.width.%]="bar.pct"></div>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                    
                    <!-- Acción de Funcionarios -->
                    <div class="mt-4 flex items-center justify-end gap-3">
                      <button type="button" (click)="autoAssignBestEmployees()" [disabled]="isAutoAssigning()" class="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
                        <lucide-icon [img]="UsersIcon" [size]="14" />
                        {{ isAutoAssigning() ? 'Asignando...' : 'Asignación Automática (IA)' }}
                      </button>
                      <button type="button" (click)="getBestEmployees()" class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
                        <lucide-icon [img]="SparklesIcon" [size]="14" />
                        Consultar Mejores Funcionarios
                      </button>
                    </div>
                  </div>
                } @else if (!dlAnalyticsLoading() && selectedPolicyId) {
                  <p class="text-xs text-muted-foreground text-center py-4">No se pudo cargar análisis de Red Neuronal o la política no tiene actividades.</p>
                }
              }
            </div>
          </div>

          <!-- AI Chat Panel (2/5) -->
          <div class="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm flex flex-col h-full max-h-[600px]">
            <div class="flex items-center gap-2 border-b border-border px-5 py-4">
              <lucide-icon [img]="BotIcon" [size]="18" class="text-primary" />
              <h2 class="text-sm font-semibold text-foreground">Asistente IA (Análisis)</h2>
            </div>
            
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              @if (dashboardChatMessages().length === 0) {
                <div class="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                  <lucide-icon [img]="BotIcon" [size]="48" class="text-muted-foreground" />
                  <p class="text-xs text-muted-foreground max-w-[200px]">Hazme cualquier consulta sobre el análisis de procesos.</p>
                </div>
              }
              
              @for (msg of dashboardChatMessages(); track $index) {
                <div class="flex" [class.justify-end]="msg.role === 'user'">
                  <div class="max-w-[85%] rounded-2xl px-4 py-2 text-xs leading-relaxed"
                       [class.bg-primary]="msg.role === 'user'"
                       [class.text-primary-foreground]="msg.role === 'user'"
                       [class.bg-muted]="msg.role === 'assistant'"
                       [class.text-foreground]="msg.role === 'assistant'">
                    {{ msg.text }}
                  </div>
                </div>
              }
              
              @if (isDashboardChatLoading()) {
                <div class="flex items-center gap-2 text-xs text-muted-foreground animate-pulse px-2">
                  <div class="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style="animation-delay: 0ms"></div>
                  <div class="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style="animation-delay: 150ms"></div>
                  <div class="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style="animation-delay: 300ms"></div>
                </div>
              }
            </div>
            
            <div class="border-t border-border p-3">
              <div class="relative flex items-center">
                <input type="text" [(ngModel)]="dashboardChatInput" (keyup.enter)="sendDashboardChatMessage()"
                       placeholder="Escribe tu consulta..."
                       class="w-full rounded-full border border-input bg-background pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <button type="button" (click)="sendDashboardChatMessage()" [disabled]="isDashboardChatLoading()"
                        class="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  <lucide-icon [img]="SendIcon" [size]="12" class="-ml-0.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Recent policies (Full width below) -->
          <div class="lg:col-span-5 rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center gap-2 border-b border-border px-5 py-4">
              <lucide-icon [img]="FileTextIcon" [size]="18" class="text-primary" />
              <h2 class="text-sm font-semibold text-foreground">Políticas Recientes</h2>
            </div>
            <div class="divide-y divide-border">
              @for (item of recentActivity; track item.text) {
                <div class="flex items-center gap-3 px-5 py-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" [class]="item.iconBg">
                    <lucide-icon [img]="item.icon" [size]="14" [class]="item.iconColor" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-foreground truncate">{{ item.text }}</p>
                    <p class="text-[10px] text-muted-foreground">{{ item.time }}</p>
                  </div>
                </div>
              }
              @if (recentActivity.length === 0) {
                <div class="px-5 py-8 text-center text-sm text-muted-foreground">Sin políticas aún</div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════════════
           ADMIN DASHBOARD
      ═══════════════════════════════════════════ -->
      @if (role() === 'ADMIN') {
        <div>
          <h1 class="text-2xl font-semibold text-foreground">Panel de Administración</h1>
          <p class="mt-1 text-sm text-muted-foreground">Bienvenido, {{ userName() }} — visión general del sistema</p>
        </div>

        <!-- KPI Cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Políticas</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <lucide-icon [img]="ShieldIcon" [size]="18" class="text-purple-600" />
              </div>
            </div>
            <div class="mt-3"><span class="text-3xl font-bold text-foreground">{{ totalPolicies() }}</span></div>
          </div>
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Usuarios</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <lucide-icon [img]="UsersIcon" [size]="18" class="text-blue-600" />
              </div>
            </div>
            <div class="mt-3"><span class="text-3xl font-bold text-foreground">{{ totalUsers() }}</span></div>
          </div>
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Departamentos</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
                <lucide-icon [img]="Building2Icon" [size]="18" class="text-teal-600" />
              </div>
            </div>
            <div class="mt-3"><span class="text-3xl font-bold text-foreground">{{ totalDepts() }}</span></div>
          </div>
          <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Roles</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <lucide-icon [img]="SettingsIcon" [size]="18" class="text-orange-600" />
              </div>
            </div>
            <div class="mt-3"><span class="text-3xl font-bold text-foreground">{{ totalRoles() }}</span></div>
          </div>
        </div>

        <!-- AI Analytics + Breakdown -->
        <div class="grid gap-6 lg:grid-cols-5">
          <!-- AI Panel (3/5) -->
          <div class="lg:col-span-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent shadow-sm">
            <div class="flex items-center gap-2 border-b border-primary/20 px-5 py-4 justify-between">
              <div class="flex items-center gap-2">
                <lucide-icon [img]="SparklesIcon" [size]="18" class="text-primary" />
                <h2 class="text-sm font-semibold text-foreground">Análisis IA de Procesos</h2>
              </div>
              <div class="flex bg-muted/60 dark:bg-slate-800 p-0.5 rounded-lg border border-border shrink-0">
                <button type="button" (click)="setAnalysisMode('dl')" [class.bg-white]="analysisMode() === 'dl'" [class.dark:bg-slate-700]="analysisMode() === 'dl'" [class.shadow-sm]="analysisMode() === 'dl'" class="px-2.5 py-1 text-[10px] font-medium rounded-md transition-all text-foreground">Red Neuronal (DL)</button>
              </div>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-1.5">Seleccionar política</label>
                <div class="relative">
                  <select [(ngModel)]="selectedPolicyId" (change)="onPolicyChange()"
                    class="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Elige una política...</option>
                    @for (p of allPolicies(); track p.uuid) {
                      <option [value]="p.uuid">{{ p.name || p.description }}</option>
                    }
                  </select>
                  <lucide-icon [img]="ChevronDownIcon" [size]="14" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <!-- Generative Analytics mode -->
              
              <!-- Deep Learning Analytics mode -->
              @if (analysisMode() === 'dl') {
                @if (dlAnalyticsLoading()) {
                  <div class="flex items-center gap-2 text-xs text-muted-foreground animate-pulse py-4">
                    <lucide-icon [img]="BotIcon" [size]="16" class="text-primary animate-spin" />
                    El Autoencoder TensorFlow está detectando anomalías en tiempos de ejecución...
                  </div>
                }
                @if (dlAnalyticsResult().length > 0) {
                  <div class="space-y-3 animate-in fade-in duration-200">
                    <div class="text-[10px] text-muted-foreground flex items-center justify-between mb-1">
                      <span>Resultados de reconstrucción del Autoencoder (Red Neuronal)</span>
                      <span class="font-semibold text-primary">Modelo: bottleneck_autoencoder.h5</span>
                    </div>
                    <div class="overflow-x-auto rounded-xl border border-border bg-card">
                      <table class="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr class="bg-muted/40 border-b border-border text-muted-foreground">
                            <th class="p-2.5 font-semibold">Trámite</th>
                            <th class="p-2.5 font-semibold">Actividad / Tarea</th>
                            <th class="p-2.5 font-semibold">Departamento</th>
                            <th class="p-2.5 font-semibold text-center">Duración</th>
                            <th class="p-2.5 font-semibold text-center">Error Reconst.</th>
                            <th class="p-2.5 font-semibold text-center">Score de Riesgo</th>
                            <th class="p-2.5 font-semibold text-right">Resultado</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-border">
                          @for (item of dlAnalyticsResult(); track $index) {
                            <tr class="hover:bg-muted/20 transition-colors">
                              <td class="p-2.5 text-muted-foreground font-semibold">{{ item.instance_id || 'N/A' }}</td>
                              <td class="p-2.5 font-medium text-foreground">{{ item.task_name }}</td>
                              <td class="p-2.5 text-muted-foreground">{{ getDepartmentName(item.department_id) }}</td>
                              <td class="p-2.5 text-center text-foreground font-semibold">{{ item.duration_hours }}h</td>
                              <td class="p-2.5 text-center text-muted-foreground">{{ item.reconstruction_error | number:'1.2-2' }}</td>
                              <td class="p-2.5 text-center font-semibold" [ngClass]="item.is_anomaly ? 'text-destructive' : 'text-green-600'">
                                {{ item.risk_score * 100 | number:'1.0-0' }}%
                              </td>
                              <td class="p-2.5 text-right">
                                @if (item.is_anomaly) {
                                  <span class="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-semibold text-destructive">
                                    <lucide-icon [img]="AlertTriangleIcon" [size]="8" /> Anomalía
                                  </span>
                                } @else {
                                  <span class="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[9px] font-semibold text-green-700 dark:text-green-400">
                                    <lucide-icon [img]="CheckCircleIcon" [size]="8" /> Normal
                                  </span>
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>

                    <!-- Charts wrapper -->
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                      <!-- Pie Chart of Anomalies -->
                      <div class="md:col-span-2 rounded-xl border border-border bg-card shadow-sm p-4 flex    flex-col justify-between">
                        <h3 class="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                          <lucide-icon [img]="PieChartIcon" [size]="12" class="text-muted-foreground" />
                          Proporción de Anomalías
                        </h3>
                        <div class="flex items-center gap-4 justify-around py-2">
                          <svg width="90" height="90" viewBox="0 0 120 120">
                            @for (slice of dlPieSlices(); track slice.label) {
                              <path [attr.d]="slice.path" [attr.fill]="slice.fill" stroke="white" stroke-width="2" />
                            }
                            <circle cx="60" cy="60" r="30" fill="white" class="dark:fill-card" />
                            <text x="60" y="65" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">
                              {{ dlAnalyticsResult().length }}
                            </text>
                          </svg>
                          <div class="space-y-1.5 shrink-0">
                            @for (slice of dlPieSlices(); track slice.label) {
                              <div class="flex items-center gap-2 text-[10px]">
                                <span class="h-2 w-2 rounded-full shrink-0" [style.background]="slice.fill"></span>
                                <span class="text-muted-foreground">{{ slice.label }}</span>
                                <span class="font-semibold text-foreground">{{ slice.value }} ({{ slice.percentage }}%)</span>
                              </div>
                            }
                          </div>
                        </div>
                      </div>

                      <!-- Bar Chart of Durations -->
                      <div class="md:col-span-3 rounded-xl border border-border bg-card shadow-sm p-4">
                        <h3 class="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                          <lucide-icon [img]="BarChart3Icon" [size]="12" class="text-muted-foreground" />
                          Duración de Tareas por Instancia
                        </h3>
                        <div class="space-y-2.5 max-h-[120px] overflow-y-auto pr-1">
                          @for (bar of dlBarChartData(); track bar.label) {
                            <div>
                              <div class="flex justify-between text-[10px] mb-0.5">
                                <span class="text-muted-foreground truncate max-w-[180px]">{{ bar.label }}</span>
                                <span class="font-medium text-foreground">{{ bar.value }}h</span>
                              </div>
                              <div class="w-full rounded-full bg-muted h-1.5">
                                <div class="rounded-full h-1.5 transition-all" [class]="bar.color" [style.width.%]="bar.pct"></div>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                    
                    <!-- Acción de Funcionarios -->
                    <div class="mt-4 flex items-center justify-end gap-3">
                      <button type="button" (click)="autoAssignBestEmployees()" [disabled]="isAutoAssigning() || isLoadingRecommendations()" class="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
                        <lucide-icon [img]="BotIcon" [size]="14" />
                        {{ isLoadingRecommendations() ? 'Calculando...' : (isAutoAssigning() ? 'Asignando...' : 'Asignación Automática (IA)') }}
                      </button>
                    </div>


                  </div>
                } @else if (!dlAnalyticsLoading() && selectedPolicyId) {
                  <p class="text-xs text-muted-foreground text-center py-4">No se pudo cargar análisis de Red Neuronal o la política no tiene actividades.</p>
                }
              }
            </div>
          </div>

          <!-- AI Chat Panel (2/5) -->
          <div class="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm flex flex-col h-full max-h-[600px]">
            <div class="flex items-center gap-2 border-b border-border px-5 py-4">
              <lucide-icon [img]="BotIcon" [size]="18" class="text-primary" />
              <h2 class="text-sm font-semibold text-foreground">Asistente IA</h2>
            </div>
            
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              @if (dashboardChatMessages().length === 0) {
                <div class="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                  <lucide-icon [img]="BotIcon" [size]="48" class="text-muted-foreground" />
                  <p class="text-xs text-muted-foreground max-w-[200px]">Haz cualquier consulta sobre el análisis de procesos.</p>
                </div>
              }
              
              @for (msg of dashboardChatMessages(); track $index) {
                <div class="flex" [class.justify-end]="msg.role === 'user'">
                  <div class="max-w-[85%] rounded-2xl px-4 py-2 text-xs leading-relaxed"
                       [class.bg-primary]="msg.role === 'user'"
                       [class.text-primary-foreground]="msg.role === 'user'"
                       [class.bg-muted]="msg.role === 'assistant'"
                       [class.text-foreground]="msg.role === 'assistant'">
                    {{ msg.text }}
                  </div>
                </div>
              }
              
              @if (isDashboardChatLoading()) {
                <div class="flex items-center gap-2 text-xs text-muted-foreground animate-pulse px-2">
                  <div class="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style="animation-delay: 0ms"></div>
                  <div class="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style="animation-delay: 150ms"></div>
                  <div class="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style="animation-delay: 300ms"></div>
                </div>
              }
            </div>
            
            <div class="border-t border-border p-3">
              <div class="relative flex items-center">
                <input type="text" [(ngModel)]="dashboardChatInput" (keyup.enter)="sendDashboardChatMessage()"
                       placeholder="Escribe tu consulta..."
                       class="w-full rounded-full border border-input bg-background pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <button type="button" (click)="sendDashboardChatMessage()" [disabled]="isDashboardChatLoading()"
                        class="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  <lucide-icon [img]="SendIcon" [size]="12" class="-ml-0.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Policies breakdown (Full width below) -->
          <div class="lg:col-span-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Pie Chart -->
            <div class="rounded-xl border border-border bg-card shadow-sm p-5">
              <h2 class="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <lucide-icon [img]="PieChartIcon" [size]="14" class="text-muted-foreground" />
                Estado de Políticas
              </h2>
              <div class="flex items-center gap-6">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  @for (slice of pieSlices(); track slice.label) {
                    <path [attr.d]="slice.path" [attr.fill]="slice.fill" stroke="white" stroke-width="2" />
                  }
                  @if (totalPolicies() === 0) {
                    <circle cx="60" cy="60" r="50" fill="#e5e7eb" />
                  }
                  <circle cx="60" cy="60" r="28" fill="white" class="dark:fill-card" />
                  <text x="60" y="56" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">{{ totalPolicies() }}</text>
                  <text x="60" y="70" text-anchor="middle" font-size="8" fill="#9ca3af">total</text>
                </svg>
                <div class="space-y-2">
                  @for (slice of pieSlices(); track slice.label) {
                    <div class="flex items-center gap-2 text-xs">
                      <span class="h-3 w-3 rounded-full shrink-0" [style.background]="slice.fill"></span>
                      <span class="text-muted-foreground">{{ slice.label }}</span>
                      <span class="ml-auto font-semibold text-foreground">{{ slice.value }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
            <!-- Bar chart -->
            <div class="rounded-xl border border-border bg-card shadow-sm p-5">
              <h2 class="text-sm font-semibold text-foreground mb-4">Distribución de Políticas</h2>
              <div class="space-y-3">
                @for (bar of barChartData; track bar.label) {
                  <div>
                    <div class="flex justify-between text-xs mb-1">
                      <span class="text-muted-foreground">{{ bar.label }}</span>
                      <span class="font-medium text-foreground">{{ bar.value }}</span>
                    </div>
                    <div class="w-full rounded-full bg-muted h-2">
                      <div class="rounded-full h-2 transition-all" [class]="bar.color" [style.width.%]="bar.pct"></div>
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="rounded-xl border border-border bg-card shadow-sm p-5">
              <h2 class="text-sm font-semibold text-foreground mb-3">Accesos Rápidos</h2>
              <div class="space-y-2">
                <a routerLink="/app/admin/users"
                  class="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                  <div class="flex items-center gap-2">
                    <lucide-icon [img]="UsersIcon" [size]="14" class="text-blue-600" />
                    <span class="text-sm text-foreground">Gestión de Usuarios</span>
                  </div>
                  <lucide-icon [img]="ArrowRightIcon" [size]="12" class="text-muted-foreground" />
                </a>
                <a routerLink="/app/admin/departments"
                  class="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                  <div class="flex items-center gap-2">
                    <lucide-icon [img]="Building2Icon" [size]="14" class="text-teal-600" />
                    <span class="text-sm text-foreground">Departamentos</span>
                  </div>
                  <lucide-icon [img]="ArrowRightIcon" [size]="12" class="text-muted-foreground" />
                </a>
                <a routerLink="/app/admin/policies"
                  class="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                  <div class="flex items-center gap-2">
                    <lucide-icon [img]="ShieldIcon" [size]="14" class="text-purple-600" />
                    <span class="text-sm text-foreground">Políticas</span>
                  </div>
                  <lucide-icon [img]="ArrowRightIcon" [size]="12" class="text-muted-foreground" />
                </a>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════════════
           DEFAULT / OTHER ROLES
      ═══════════════════════════════════════════ -->
      @if (role() !== 'EMPLOYEE' && role() !== 'MANAGER' && role() !== 'DESIGNER' && role() !== 'ADMIN') {
        <div>
          <h1 class="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p class="mt-1 text-sm text-muted-foreground">Resumen general del sistema</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (kpi of kpis(); track kpi.label) {
            <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{{ kpi.label }}</span>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg" [class]="kpi.iconBg">
                  <lucide-icon [img]="kpi.icon" [size]="18" [class]="kpi.iconColor" />
                </div>
              </div>
              <div class="mt-3">
                <span class="text-3xl font-bold text-foreground">{{ kpi.value }}</span>
              </div>
            </div>
          }
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
                    <lucide-icon [img]="UsersIcon" [size]="14" />
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
              <button (click)="confirmAutoAssignBestEmployees()" [disabled]="aiRecommendations().length === 0 || isAutoAssigning()" class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
                {{ isAutoAssigning() ? 'Aplicando...' : 'Confirmar Asignación' }}
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly policyService = inject(PolicyService);
  private readonly userService = inject(UserService);
  private readonly departmentService = inject(DepartmentService);
  private readonly roleService = inject(RoleService);
  private readonly authService = inject(AuthService);
  readonly notificationService = inject(NotificationService);
  readonly incomingRequestsService = inject(IncomingRequestsService);
  private readonly http = inject(HttpClient);
  private readonly aiDlService = inject(AiDlService);
  private readonly aiChatService = inject(AiChatService);
  private readonly toast = inject(ToastService);

  // Dashboard Chat State
  dashboardChatMessages = signal<{ role: 'user' | 'assistant', text: string }[]>([]);
  dashboardChatInput: string = '';
  isDashboardChatLoading = signal<boolean>(false);

  // Icon bindings
  readonly FileTextIcon = FileText;
  readonly UsersIcon = Users;
  readonly Building2Icon = Building2;
  readonly ShieldIcon = Shield;
  readonly TrendingUpIcon = TrendingUp;
  readonly ActivityIcon = Activity;
  readonly BarChart3Icon = BarChart3;
  readonly PieChartIcon = PieChart;
  readonly InboxIcon = Inbox;
  readonly CheckCircleIcon = CheckCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly LightbulbIcon = Lightbulb;
  readonly BotIcon = Bot;
  readonly ChevronDownIcon = ChevronDown;
  readonly SparklesIcon = Sparkles;
  readonly ArrowRightIcon = ArrowRight;
  readonly HistoryIcon = History;
  readonly ClipboardListIcon = ClipboardList;
  readonly BellIcon = Bell;
  readonly SettingsIcon = Settings;
  readonly SendIcon = Send;
  readonly XIcon = X;

  // Signals
  totalPolicies = signal(0);
  totalUsers = signal(0);
  totalDepts = signal(0);
  totalRoles = signal(0);
  activePolicies = signal(0);
  draftPolicies = signal(0);
  inactivePolicies = signal(0);
  allPolicies = signal<any[]>([]);
  allUsers = signal<any[]>([]);
  allRoles = signal<any[]>([]);
  departmentsList = signal<any[]>([]);
  analysisMode = signal<'dl'>('dl');
  dlAnalyticsLoading = signal(false);
  dlAnalyticsResult = signal<any[]>([]);

  // Manager signals
  managerActiveCount = signal(0);
  managerCompletedCount = signal(0);
  managerPoliciesCount = signal(0);

  // Employee signals
  employeePendingCount = signal(0);
  employeeCompletedCount = signal(0);

  // AI Analytics
  selectedPolicyId = '';
  analyticsLoading = signal(false);
  analyticsResult = signal<any>(null);

  // Recommendations state
  isLoadingRecommendations = signal(false);
  showRecommendationsModal = signal(false);
  aiRecommendations = signal<any[]>([]);

  kpis = signal<{ label: string; value: number; icon: any; iconBg: string; iconColor: string }[]>([]);

  barChartData: { label: string; value: number; pct: number; color: string }[] = [];

  pieSlices = computed(() => {
    const active = this.activePolicies();
    const draft = this.draftPolicies();
    const inactive = this.inactivePolicies();
    const total = active + draft + inactive;
    if (total === 0) return [];
    const slices = [
      { label: 'Activas', value: active, fill: '#22c55e' },
      { label: 'Borrador', value: draft, fill: '#eab308' },
      { label: 'Inactivas', value: inactive, fill: '#9ca3af' },
    ].filter(s => s.value > 0);
    const cx = 60, cy = 60, r = 50;
    let startAngle = -Math.PI / 2;
    return slices.map(s => {
      const angle = (s.value / total) * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
      startAngle = endAngle;
      return { ...s, path };
    });
  });

  dlPieSlices = computed(() => {
    const results = this.dlAnalyticsResult();
    if (!results || results.length === 0) return [];

    const anomalies = results.filter((r: any) => r.is_anomaly).length;
    const normals = results.length - anomalies;
    const total = results.length;

    const slices = [
      { label: 'Anomalías', value: anomalies, fill: '#ef4444' },
      { label: 'Normales', value: normals, fill: '#22c55e' }
    ].filter(s => s.value > 0);

    const cx = 60, cy = 60, r = 50;
    let startAngle = -Math.PI / 2;
    return slices.map(s => {
      const angle = (s.value / total) * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
      startAngle = endAngle;
      return { ...s, path, percentage: Math.round((s.value / total) * 100) };
    });
  });

  dlBarChartData = computed(() => {
    const results = this.dlAnalyticsResult();
    if (!results || results.length === 0) return [];

    const maxDuration = Math.max(...results.map((r: any) => r.duration_hours || 0.1), 1);

    return results.map((r: any) => {
      const label = `${r.task_name} (${r.instance_id ? r.instance_id.split(' ')[0] : 'T'})`;
      const val = r.duration_hours || 0;
      const pct = Math.min(100, Math.round((val / maxDuration) * 100));
      return {
        label,
        value: val,
        pct,
        color: r.is_anomaly ? 'bg-destructive' : 'bg-primary'
      };
    });
  });

  recentActivity: { text: string; time: string; icon: any; iconBg: string; iconColor: string }[] = [];

  role = computed(() => this.authService.getCurrentUserRole() ?? '');
  userName = computed(() => this.authService.currentUser()?.name ?? '');

  ngOnInit(): void {
    const r = this.role();

    if (r === 'EMPLOYEE') {
      this.policyService.getEmployeeDashboard().subscribe((data: any) => {
        this.employeePendingCount.set(data?.activeTasksCount ?? data?.activeTasks ?? 0);
        this.employeeCompletedCount.set(data?.completedTasksCount ?? data?.historyTasks ?? 0);
        if (data?.recentCompletedTasks) {
          this.recentActivity = (data.recentCompletedTasks as any[]).slice(0, 5).map((t) => ({
            text: t.taskName || t.activityId || 'Tarea completada',
            time: t.timestamp ? new Date(t.timestamp).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente',
            icon: CheckCircle,
            iconBg: 'bg-green-100 dark:bg-green-900/30',
            iconColor: 'text-green-600',
          }));
        }
      });
      return;
    }

    if (r === 'MANAGER') {
      const user = this.authService.currentUser();
      if (user?.uuid) {
        this.policyService.getManagedInstances(user.uuid).subscribe((instances: any[]) => {
          const active = instances.filter((i) => i.status?.toUpperCase() !== 'COMPLETED');
          const completed = instances.filter((i) => i.status?.toUpperCase() === 'COMPLETED');
          this.managerActiveCount.set(active.length);
          this.managerCompletedCount.set(completed.length);
          this.recentActivity = active.slice(0, 5).map((i) => ({
            text: i.policyName || i.policyId || 'Instancia',
            time: i.status ?? 'En curso',
            icon: ClipboardList,
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600',
          }));
        });
        this.policyService.getAssignedPolicies(user.uuid).subscribe((policies: any[]) => {
          this.managerPoliciesCount.set(policies.length);
        });
      }
      return;
    }

    // DESIGNER / ADMIN: load policies
    this.policyService.getAll().subscribe((policies) => {
      this.totalPolicies.set(policies.length);
      this.activePolicies.set(policies.filter((p) => p.state === 'ACTIVE').length);
      this.draftPolicies.set(policies.filter((p) => p.state === 'DRAFT').length);
      this.inactivePolicies.set(policies.filter((p) => p.state === 'INACTIVE').length);
      this.allPolicies.set(policies);

      const active = this.activePolicies();
      const draft = this.draftPolicies();
      const inactive = this.inactivePolicies();
      const max = Math.max(active, draft, inactive, 1);
      this.barChartData = [
        { label: 'Activas', value: active, pct: (active / max) * 90, color: 'bg-green-500' },
        { label: 'Borrador', value: draft, pct: (draft / max) * 90, color: 'bg-yellow-500' },
        { label: 'Inactivas', value: inactive, pct: (inactive / max) * 90, color: 'bg-gray-400' },
      ];

      this.recentActivity = policies.slice(0, 5).map((p) => ({
        text: p.name || p.description,
        time: p.state === 'ACTIVE' ? 'Activa' : p.state === 'DRAFT' ? 'Borrador' : 'Inactiva',
        icon: FileText,
        iconBg: p.state === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30',
        iconColor: p.state === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600',
      }));
    });

    // Load departments list for mapping names
    this.departmentService.getAll().subscribe((depts) => {
      this.totalDepts.set(depts.length);
      this.departmentsList.set(depts);
    });

    if (r === 'ADMIN' || r === 'DESIGNER') {
      this.userService.getAll().subscribe((users) => {
        this.allUsers.set(users);
        if (r === 'ADMIN') this.totalUsers.set(users.length);
      });
      this.roleService.getAll().subscribe((roles) => {
        this.allRoles.set(roles);
        if (r === 'ADMIN') this.totalRoles.set(roles.length);
      });
    }
  }

  sendDashboardChatMessage(predefinedMsg?: string) {
    const msg = predefinedMsg || this.dashboardChatInput;
    if (!msg.trim() || this.isDashboardChatLoading()) return;

    this.dashboardChatInput = '';

    this.dashboardChatMessages.update(msgs => [...msgs, { role: 'user', text: msg }]);
    this.isDashboardChatLoading.set(true);

    const selectedPolicy = this.allPolicies().find(p => p.uuid === this.selectedPolicyId);
    
    // Find the Funcionario role ID
    const funcionarioRole = this.allRoles().find(r => r.name === 'Funcionario' || r.name === 'EMPLOYEE');
    
    const sendChat = () => {
      const screenData = {
        selectedPolicyId: this.selectedPolicyId,
        selectedPolicyName: selectedPolicy ? (selectedPolicy.name || selectedPolicy.description) : 'Política actual',
        dlAnalyticsResult: this.dlAnalyticsResult(),
        aiRecommendations: this.aiRecommendations().map(r => ({
          activityName: this.getActivityName(r.activityUuid),
          employeeName: this.getUserName(r.employeeUuid),
          estimatedHours: r.estimatedHours
        })),
        availableEmployees: this.allUsers()
          .filter(u => funcionarioRole ? u.roleId === (funcionarioRole.uuid || funcionarioRole.id) : true)
          .map(u => ({
            id: u.uuid,
            name: `${u.name} ${u.lastname}`,
            email: u.email,
            departmentId: u.departmentId,
            roleId: u.roleId,
            historicalPerformanceScore: Math.round(80 + Math.random() * 20) + '%' // Simulated historical score
        })),
        departments: this.departmentsList().map(d => ({
          id: d.uuid || d.id,
          name: d.name
        }))
      };

      this.aiChatService.getChatResponse({
        user_role: this.role() || 'USER',
        current_screen: 'DASHBOARD_ANALYTICS',
        user_message: msg,
        screen_data: JSON.stringify(screenData)
      }).subscribe({
        next: (res) => {
          this.dashboardChatMessages.update(msgs => [...msgs, { role: 'assistant', text: res.reply }]);
          this.isDashboardChatLoading.set(false);
        },
        error: () => {
          this.dashboardChatMessages.update(msgs => [...msgs, { role: 'assistant', text: 'Lo siento, ha ocurrido un error al procesar tu solicitud.' }]);
          this.isDashboardChatLoading.set(false);
        }
      });
    };

    if (this.selectedPolicyId && this.aiRecommendations().length === 0) {
      this.policyService.getAutoAssignRecommendations(this.selectedPolicyId).subscribe({
        next: (response) => {
          const mapped = (response.assignments || []).map((a: any) => ({
            activityUuid: a.activity_uuid || a.activityUuid,
            employeeUuid: a.employee_uuid || a.employeeUuid,
            justification: a.justification,
            estimatedHours: a.estimated_hours || a.estimatedHours || parseFloat(a.justification?.match(/estimado:\s*([\d.]+)/)?.[1] || '0')
          })).filter((a: any) => {
            const policy = this.allPolicies().find(p => p.uuid === this.selectedPolicyId);
            if (!policy || !policy.activityNodes) return true;
            const node = policy.activityNodes.find((n: any) => n.uuid === a.activityUuid);
            return node && (node.state === 'ACTIVITY' || node.state === 'APPROVAL');
          });
          this.aiRecommendations.set(mapped);
          sendChat();
        },
        error: () => {
          sendChat();
        }
      });
    } else {
      sendChat();
    }
  }

  getBestEmployees() {
    if (!this.selectedPolicyId) return;

    this.isLoadingRecommendations.set(true);
    this.policyService.getAutoAssignRecommendations(this.selectedPolicyId).subscribe({
      next: (response) => {
        this.isLoadingRecommendations.set(false);
        const mapped = (response.assignments || []).map((a: any) => ({
          activityUuid: a.activity_uuid || a.activityUuid,
          employeeUuid: a.employee_uuid || a.employeeUuid,
          justification: a.justification,
          estimatedHours: a.estimated_hours || a.estimatedHours || parseFloat(a.justification?.match(/estimado:\s*([\d.]+)/)?.[1] || '0')
        })).filter((a: any) => {
          const policy = this.allPolicies().find(p => p.uuid === this.selectedPolicyId);
          if (!policy || !policy.activityNodes) return true;
          const node = policy.activityNodes.find((n: any) => n.uuid === a.activityUuid);
          return node && (node.state === 'ACTIVITY' || node.state === 'APPROVAL');
        });
        this.aiRecommendations.set(mapped);
        this.sendDashboardChatMessage("¿Cuáles son los mejores funcionarios para ejecutar las tareas de esta política basándose en su rendimiento histórico y el análisis actual?");
      },
      error: (err) => {
        this.isLoadingRecommendations.set(false);
        this.sendDashboardChatMessage("¿Cuáles son los mejores funcionarios para ejecutar las tareas de esta política basándose en su rendimiento histórico y el análisis actual?");
      }
    });
  }

  isAutoAssigning = signal<boolean>(false);

  autoAssignBestEmployees() {
    if (!this.selectedPolicyId) return;

    this.isLoadingRecommendations.set(true);
    this.policyService.getAutoAssignRecommendations(this.selectedPolicyId).subscribe({
      next: (response) => {
        this.isLoadingRecommendations.set(false);
        const mapped = (response.assignments || []).map((a: any) => ({
          activityUuid: a.activity_uuid || a.activityUuid,
          employeeUuid: a.employee_uuid || a.employeeUuid,
          justification: a.justification,
          estimatedHours: a.estimated_hours || a.estimatedHours || parseFloat(a.justification?.match(/estimado:\s*([\d.]+)/)?.[1] || '0')
        })).filter((a: any) => {
          const policy = this.allPolicies().find(p => p.uuid === this.selectedPolicyId);
          if (!policy || !policy.activityNodes) return true;
          const node = policy.activityNodes.find((n: any) => n.uuid === a.activityUuid);
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

  confirmAutoAssignBestEmployees() {
    if (!this.selectedPolicyId) return;
    this.isAutoAssigning.set(true);

    const assignmentsPayload = this.aiRecommendations().map(r => ({
      activity_uuid: r.activityUuid,
      employee_uuid: r.employeeUuid,
      justification: r.justification
    }));

    this.policyService.autoAssignPolicy(this.selectedPolicyId, assignmentsPayload).subscribe({
      next: (updatedPolicy) => {
        this.allPolicies.update(list =>
          list.map(p => p.uuid === updatedPolicy.uuid ? updatedPolicy : p)
        );
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
    const policy = this.allPolicies().find(p => p.uuid === this.selectedPolicyId);
    if (!policy || !policy.activityNodes) return 'Actividad';
    const node = policy.activityNodes.find((n: any) => n.uuid === uuid);
    return node?.name || 'Actividad';
  }

  getUserName(uuid: string): string {
    if (!uuid) return 'Desconocido';
    const user = this.allUsers().find(u => u.uuid === uuid || u.id === uuid);
    return user ? `${user.name} ${user.lastname}` : 'Desconocido';
  }

  loadAnalytics(): void {
    if (!this.selectedPolicyId) {
      this.analyticsResult.set(null);
      return;
    }
    this.analyticsLoading.set(true);
    this.analyticsResult.set(null);
    this.http
      .get<any>(`${environment.apiUrl}/workflows/policies/${this.selectedPolicyId}/analytics`)
      .subscribe({
        next: (data) => {
          this.analyticsLoading.set(false);
          this.analyticsResult.set(data);
        },
        error: () => {
          this.analyticsLoading.set(false);
          this.analyticsResult.set({ bottlenecks: [], recommendations: [] });
        },
      });
  }

  setAnalysisMode(mode: 'dl'): void {
    this.analysisMode.set(mode);
    this.onPolicyChange();
  }

  onPolicyChange(): void {
    this.loadDlAnalytics();
    if (this.selectedPolicyId) {
      this.policyService.getAutoAssignRecommendations(this.selectedPolicyId).subscribe({
        next: (response) => {
          const mapped = (response.assignments || []).map((a: any) => ({
            activityUuid: a.activity_uuid || a.activityUuid,
            employeeUuid: a.employee_uuid || a.employeeUuid,
            justification: a.justification,
            estimatedHours: a.estimated_hours || a.estimatedHours || parseFloat(a.justification?.match(/estimado:\s*([\d.]+)/)?.[1] || '0')
          })).filter((a: any) => {
            const policy = this.allPolicies().find(p => p.uuid === this.selectedPolicyId);
            if (!policy || !policy.activityNodes) return true;
            const node = policy.activityNodes.find((n: any) => n.uuid === a.activityUuid);
            return node && (node.state === 'ACTIVITY' || node.state === 'APPROVAL');
          });
          this.aiRecommendations.set(mapped);
        },
        error: () => {}
      });
    } else {
      this.aiRecommendations.set([]);
    }
  }

  getDepartmentName(deptId: string): string {
    const dept = this.departmentsList().find(d => d.uuid === deptId || d.id === deptId);
    return dept ? dept.name : 'Desconocido';
  }

  loadDlAnalytics(): void {
    if (!this.selectedPolicyId) {
      this.dlAnalyticsResult.set([]);
      return;
    }
    this.dlAnalyticsLoading.set(true);
    this.dlAnalyticsResult.set([]);

    const policy = this.allPolicies().find(p => p.uuid === this.selectedPolicyId);
    if (!policy || !policy.activityNodes) {
      this.dlAnalyticsLoading.set(false);
      return;
    }

    const items: BottleneckInputItem[] = [];
    const day = new Date().getDay();
    const hour = new Date().getHours();

    policy.activityNodes.forEach((node: any) => {
      if (node.state === 'ACTIVITY' || node.state === 'APPROVAL') {
        // Normal execution run 1
        items.push({
          department_id: node.laneId || 'e6edcb81-4782-44f0-af6d-1e9e184c77ba',
          day_of_week: day,
          hour_of_day: (hour + 1) % 24,
          duration_hours: Math.round((Math.random() * 4 + 1.2) * 10) / 10,
          task_id: node.name || node.uuid
        });

        // Normal execution run 2
        items.push({
          department_id: node.laneId || 'e6edcb81-4782-44f0-af6d-1e9e184c77ba',
          day_of_week: (day + 1) % 7,
          hour_of_day: (hour + 4) % 24,
          duration_hours: Math.round((Math.random() * 5 + 2.5) * 10) / 10,
          task_id: node.name || node.uuid
        });

        // Add a simulated bottleneck for demonstration if node name suggests review or approval
        const isReviewTask = node.name && (
          node.name.toLowerCase().includes('aprob') ||
          node.name.toLowerCase().includes('revis') ||
          node.name.toLowerCase().includes('firm') ||
          node.name.toLowerCase().includes('valid')
        );
        if (isReviewTask) {
          items.push({
            department_id: node.laneId || 'e6edcb81-4782-44f0-af6d-1e9e184c77ba',
            day_of_week: (day + 2) % 7,
            hour_of_day: (hour + 8) % 24,
            duration_hours: Math.round((Math.random() * 40 + 45.0) * 10) / 10, // 45h - 85h duration
            task_id: node.name || node.uuid
          });
        }
      }
    });

    if (items.length === 0) {
      this.dlAnalyticsLoading.set(false);
      return;
    }

    this.aiDlService.analyzeBottlenecks(items).subscribe({
      next: (res) => {
        this.dlAnalyticsLoading.set(false);
        const results = res.results.map((r: any) => {
          const inputItem = items[r.item_index];
          return {
            ...r,
            task_name: inputItem.task_id,
            department_id: inputItem.department_id,
            duration_hours: inputItem.duration_hours
          };
        });
        this.dlAnalyticsResult.set(results);
      },
      error: (err) => {
        console.error('Error loading DL Bottlenecks', err);
        this.dlAnalyticsLoading.set(false);
        this.dlAnalyticsResult.set([]);
      }
    });
  }
}
