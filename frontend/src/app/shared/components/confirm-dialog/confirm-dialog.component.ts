import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';
import { LucideAngularModule, AlertTriangle } from 'lucide-angular';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (confirmService.visible()) {
      <div
        class="fixed inset-0 z-[110] flex items-center justify-center bg-black/50"
        (click)="confirmService.respond(false)"
      >
        <div
          class="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start gap-4">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              [class]="getIconBgClass()"
            >
              <lucide-icon
                [img]="AlertTriangleIcon"
                [size]="20"
                [class]="getIconTextClass()"
              />
            </div>
            <div class="flex-1">
              <h3 class="text-base font-semibold text-foreground">
                {{ confirmService.options().title }}
              </h3>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ confirmService.options().message }}
              </p>
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button
              (click)="confirmService.respond(false)"
              class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              {{ confirmService.options().cancelLabel }}
            </button>
            <button
              (click)="confirmService.respond(true)"
              class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              [class]="getConfirmBtnClass()"
            >
              {{ confirmService.options().confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly confirmService = inject(ConfirmService);
  readonly AlertTriangleIcon = AlertTriangle;

  getIconBgClass(): string {
    return this.confirmService.options().variant === 'danger'
      ? 'bg-red-100 dark:bg-red-900/20'
      : 'bg-blue-100 dark:bg-blue-900/20';
  }

  getIconTextClass(): string {
    return this.confirmService.options().variant === 'danger'
      ? 'text-destructive'
      : 'text-primary';
  }

  getConfirmBtnClass(): string {
    return this.confirmService.options().variant === 'danger'
      ? 'bg-destructive text-white hover:opacity-90'
      : 'bg-primary text-primary-foreground hover:opacity-90';
  }
}
