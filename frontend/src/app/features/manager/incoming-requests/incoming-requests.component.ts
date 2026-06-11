import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PolicyService } from '../../../core/services/policy.service';
import { IncomingRequestsService } from '../../../core/services/incoming-requests.service';
import { LucideAngularModule, Inbox, Clock, Play } from 'lucide-angular';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

@Component({
  selector: 'app-incoming-requests',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="h-full flex flex-col p-6 space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Trámites Entrantes</h1>
          <p class="text-muted-foreground">
            Solicitudes de clientes pendientes de asignación.
          (Aqui se mostraran trámites que vengan de la app móvil)
          </p>
        </div>
        <lucide-icon [img]="Inbox" class="w-8 h-8 text-muted-foreground opacity-50" />
      </div>

      <div class="flex-1 overflow-auto bg-card rounded-lg border border-border shadow-sm">
        @if (isLoading()) {
          <div class="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
            <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p>Cargando trámites...</p>
          </div>
        } @else if (incomingRequests().length === 0) {
          <div class="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
            <lucide-icon [img]="Inbox" class="w-12 h-12 opacity-20" />
            <p>No hay trámites entrantes en este momento.</p>
          </div>
        } @else {
          <div class="min-w-full inline-block align-middle">
            <div class="overflow-hidden">
              <table class="min-w-full divide-y divide-border">
                <thead class="bg-muted/50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Trámite</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha Solicitud</th>
                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  @for (req of incomingRequests(); track req.instanceId) {
                    <tr class="hover:bg-muted/50 transition-colors">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-medium text-foreground">{{ req.policyName }}</div>
                        <div class="text-xs text-muted-foreground">ID: {{ req.instanceId | slice:0:8 }}...</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {{ req.currentTask }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <div class="flex items-center gap-2">
                          <lucide-icon [img]="Clock" class="w-4 h-4" />
                          {{ formatTimeAgo(req.startedAt) }}
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          (click)="claimRequest(req.instanceId)"
                          [disabled]="isClaiming()"
                          class="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <lucide-icon [img]="Play" class="w-4 h-4" />
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class IncomingRequestsComponent implements OnInit {
  private policyService = inject(PolicyService);
  private incomingRequestsService = inject(IncomingRequestsService);
  private router = inject(Router);

  incomingRequests = signal<any[]>([]);
  isLoading = signal(true);
  isClaiming = signal(false);

  readonly Inbox = Inbox;
  readonly Clock = Clock;
  readonly Play = Play;

  ngOnInit() {
    this.loadIncomingRequests();
  }

  loadIncomingRequests() {
    this.isLoading.set(true);
    this.policyService.getIncomingInstances().subscribe({
      next: (requests) => {
        this.incomingRequests.set(requests);
        this.incomingRequestsService.incomingCount.set(requests.length);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading incoming requests', err);
        this.isLoading.set(false);
      }
    });
  }

  claimRequest(instanceId: string) {
    if (this.isClaiming()) return;

    this.isClaiming.set(true);
    this.policyService.claimInstance(instanceId).subscribe({
      next: (instance) => {
        this.isClaiming.set(false);
        this.incomingRequestsService.loadCount();
        this.router.navigate(['/app/manager/instances']);
      },
      error: (err) => {
        console.error('Error claiming request', err);
        this.isClaiming.set(false);
      }
    });
  }

  formatTimeAgo(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  }
}
