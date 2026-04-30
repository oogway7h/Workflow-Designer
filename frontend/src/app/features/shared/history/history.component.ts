import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PolicyService } from '../../../core/services/policy.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-history',
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-semibold text-foreground">Historial</h1>
      <p class="mt-1 text-sm text-muted-foreground">Visualiza el historial de actividades según tu rol</p>

      <div *ngIf="history().length; else noData">
        <ul>
          <li *ngFor="let item of history()">
            <p>{{ item.description }}</p>
          </li>
        </ul>
      </div>

      <ng-template #noData>
        <p class="text-muted-foreground">No hay datos disponibles para mostrar.</p>
      </ng-template>
    </div>
  `,  imports: [CommonModule],
  standalone: true})
export class HistoryComponent implements OnInit {
  private readonly policyService = inject(PolicyService);
  private readonly authService = inject(AuthService);

  history = signal<any[]>([]);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    switch (user.role) {
      case 'ADMIN':
        this.policyService.getHistory().subscribe((data) => this.history.set(data));
        break;
      case 'MANAGER':
        this.policyService.getManagedInstances().subscribe((data) => this.history.set(data));
        break;
      case 'EMPLOYEE':
        this.policyService.getPendingTasks().subscribe((data) => this.history.set(data));
        break;
    }
  }
}