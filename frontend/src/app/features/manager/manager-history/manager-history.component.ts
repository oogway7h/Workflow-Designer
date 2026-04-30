import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, History, CheckCircle, Clock, FileText, RefreshCw } from 'lucide-angular';
import { PolicyService } from '../../../core/services/policy.service';
import { AuthService } from '../../../core/services/auth.service';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-manager-history',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, LoaderComponent],
  template: `
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-foreground">Historial</h1>
          <p class="mt-1 text-sm text-muted-foreground">Trámites completados bajo mi supervisión</p>
        </div>
        <button
          (click)="loadInstances()"
          [disabled]="isLoading()"
          class="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <lucide-icon [img]="RefreshCwIcon" [size]="14" [class]="isLoading() ? 'animate-spin' : ''" />
          Actualizar
        </button>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-20">
          <app-loader text="Cargando historial..."></app-loader>
        </div>
      } @else if (completedInstances().length === 0) {
        <div class="rounded-xl border-2 border-dashed border-border py-20 text-center">
          <lucide-icon [img]="HistoryIcon" [size]="40" class="mx-auto mb-3 text-muted-foreground/50" />
          <p class="text-sm text-muted-foreground">Aún no hay trámites completados</p>
          <p class="text-xs text-muted-foreground mt-1">Los trámites finalizados aparecerán aquí</p>
        </div>
      } @else {
        <div class="grid gap-4">
          @for (instance of completedInstances(); track instance.instanceId || instance.uuid || instance.id) {
            <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                    <lucide-icon [img]="CheckCircleIcon" [size]="20" class="text-green-600" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-foreground">{{ instance.policyName || 'Trámite Finalizado' }}</h3>
                    <p class="text-xs text-muted-foreground mt-1">Iniciado: {{ instance.startedAt | date:'medium' }}</p>
                  </div>
                </div>
                <span class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <lucide-icon [img]="CheckCircleIcon" [size]="12" />
                  Completado
                </span>
              </div>
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                <lucide-icon [img]="ClockIcon" [size]="12" />
                <span>Finalizado: {{ instance.updatedAt | date:'medium' }}</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ManagerHistoryComponent implements OnInit {
  readonly HistoryIcon = History;
  readonly CheckCircleIcon = CheckCircle;
  readonly ClockIcon = Clock;
  readonly FileTextIcon = FileText;
  readonly RefreshCwIcon = RefreshCw;

  private readonly policyService = inject(PolicyService);
  private readonly authService = inject(AuthService);

  allInstances = signal<any[]>([]);
  completedInstances = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadInstances();
  }

  loadInstances(): void {
    const user = this.authService.currentUser();
    if (!user) return;
    this.isLoading.set(true);
    this.policyService.getManagedInstances(user.uuid).subscribe({
      next: (data) => {
        this.allInstances.set(data);
        this.completedInstances.set(data.filter((i: any) => i.status?.toUpperCase() === 'COMPLETED'));
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}