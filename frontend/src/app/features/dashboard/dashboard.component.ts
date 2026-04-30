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
            <div class="flex items-center gap-2 border-b border-primary/20 px-5 py-4">
              <lucide-icon [img]="SparklesIcon" [size]="18" class="text-primary" />
              <h2 class="text-sm font-semibold text-foreground">Análisis IA de Procesos</h2>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-1.5">Seleccionar política</label>
                <div class="relative">
                  <select [(ngModel)]="selectedPolicyId" (change)="loadAnalytics()"
                    class="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Elige una política...</option>
                    @for (p of allPolicies(); track p.uuid) {
                      <option [value]="p.uuid">{{ p.name || p.description }}</option>
                    }
                  </select>
                  <lucide-icon [img]="ChevronDownIcon" [size]="14" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              @if (analyticsLoading()) {
                <div class="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                  <lucide-icon [img]="BotIcon" [size]="16" class="text-primary" />
                  La IA está analizando...
                </div>
              }
              @if (analyticsResult()) {
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                    <h3 class="flex items-center gap-2 text-sm font-semibold text-destructive mb-3">
                      <lucide-icon [img]="AlertTriangleIcon" [size]="16" /> Cuellos de Botella
                    </h3>
                    <ul class="space-y-2">
                      @for (b of analyticsResult()?.bottlenecks; track $index) {
                        <li class="flex items-start gap-2 text-sm">
                          <lucide-icon [img]="AlertTriangleIcon" [size]="14" class="text-destructive mt-0.5 shrink-0" />
                          <span class="text-foreground">{{ b.activity || b.node || b }}</span>
                        </li>
                      } @empty {
                        <li class="text-xs text-muted-foreground">No se detectaron cuellos de botella.</li>
                      }
                    </ul>
                  </div>
                  <div class="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30 p-4">
                    <h3 class="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3">
                      <lucide-icon [img]="LightbulbIcon" [size]="16" /> Recomendaciones IA
                    </h3>
                    <ul class="space-y-2">
                      @for (r of analyticsResult()?.recommendations; track $index) {
                        <li class="flex items-start gap-2 text-sm">
                          <lucide-icon [img]="LightbulbIcon" [size]="14" class="text-amber-600 mt-0.5 shrink-0" />
                          <span class="text-foreground">{{ r.suggestion || r.recommendation || r }}</span>
                        </li>
                      } @empty {
                        <li class="text-xs text-muted-foreground">No hay recomendaciones disponibles.</li>
                      }
                    </ul>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Recent policies (2/5) -->
          <div class="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
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
            <div class="flex items-center gap-2 border-b border-primary/20 px-5 py-4">
              <lucide-icon [img]="SparklesIcon" [size]="18" class="text-primary" />
              <h2 class="text-sm font-semibold text-foreground">Análisis IA de Procesos</h2>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-1.5">Seleccionar política</label>
                <div class="relative">
                  <select [(ngModel)]="selectedPolicyId" (change)="loadAnalytics()"
                    class="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Elige una política...</option>
                    @for (p of allPolicies(); track p.uuid) {
                      <option [value]="p.uuid">{{ p.name || p.description }}</option>
                    }
                  </select>
                  <lucide-icon [img]="ChevronDownIcon" [size]="14" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              @if (analyticsLoading()) {
                <div class="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                  <lucide-icon [img]="BotIcon" [size]="16" class="text-primary" />
                  La IA está analizando...
                </div>
              }
              @if (analyticsResult()) {
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                    <h3 class="flex items-center gap-2 text-sm font-semibold text-destructive mb-3">
                      <lucide-icon [img]="AlertTriangleIcon" [size]="16" /> Cuellos de Botella
                    </h3>
                    <ul class="space-y-2">
                      @for (b of analyticsResult()?.bottlenecks; track $index) {
                        <li class="flex items-start gap-2 text-sm">
                          <lucide-icon [img]="AlertTriangleIcon" [size]="14" class="text-destructive mt-0.5 shrink-0" />
                          <span class="text-foreground">{{ b.activity || b.node || b }}</span>
                        </li>
                      } @empty {
                        <li class="text-xs text-muted-foreground">No se detectaron cuellos de botella.</li>
                      }
                    </ul>
                  </div>
                  <div class="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30 p-4">
                    <h3 class="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3">
                      <lucide-icon [img]="LightbulbIcon" [size]="16" /> Recomendaciones IA
                    </h3>
                    <ul class="space-y-2">
                      @for (r of analyticsResult()?.recommendations; track $index) {
                        <li class="flex items-start gap-2 text-sm">
                          <lucide-icon [img]="LightbulbIcon" [size]="14" class="text-amber-600 mt-0.5 shrink-0" />
                          <span class="text-foreground">{{ r.suggestion || r.recommendation || r }}</span>
                        </li>
                      } @empty {
                        <li class="text-xs text-muted-foreground">No hay recomendaciones disponibles.</li>
                      }
                    </ul>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Policies breakdown (2/5) -->
          <div class="lg:col-span-2 space-y-4">
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

  // Signals
  totalPolicies = signal(0);
  totalUsers = signal(0);
  totalDepts = signal(0);
  totalRoles = signal(0);
  activePolicies = signal(0);
  draftPolicies = signal(0);
  inactivePolicies = signal(0);
  allPolicies = signal<any[]>([]);

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

    if (r === 'ADMIN') {
      this.userService.getAll().subscribe((users) => this.totalUsers.set(users.length));
      this.departmentService.getAll().subscribe((depts) => this.totalDepts.set(depts.length));
      this.roleService.getAll().subscribe((roles) => this.totalRoles.set(roles.length));
    }
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
}
