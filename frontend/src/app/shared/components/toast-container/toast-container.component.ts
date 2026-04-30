import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { LucideAngularModule, CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-angular';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-lg"
          [class]="getBorderClass(toast.type)"
        >
          @switch (toast.type) {
            @case ('success') {
              <lucide-icon [img]="CheckCircle2" [size]="18" class="text-green-500 shrink-0 mt-0.5" />
            }
            @case ('error') {
              <lucide-icon [img]="XCircleIcon" [size]="18" class="text-destructive shrink-0 mt-0.5" />
            }
            @case ('warning') {
              <lucide-icon [img]="AlertTriangleIcon" [size]="18" class="text-yellow-500 shrink-0 mt-0.5" />
            }
            @case ('info') {
              <lucide-icon [img]="InfoIcon" [size]="18" class="text-primary shrink-0 mt-0.5" />
            }
          }
          <p class="flex-1 text-sm text-foreground">{{ toast.message }}</p>
          <button
            (click)="toastService.dismiss(toast.id)"
            class="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground shrink-0"
          >
            <lucide-icon [img]="XIcon" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
  readonly CheckCircle2 = CheckCircle2;
  readonly XCircleIcon = XCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly InfoIcon = Info;
  readonly XIcon = X;

  getBorderClass(type: string): string {
    switch (type) {
      case 'success': return 'border-green-500/30';
      case 'error': return 'border-destructive/30';
      case 'warning': return 'border-yellow-500/30';
      case 'info': return 'border-primary/30';
      default: return 'border-border';
    }
  }
}
