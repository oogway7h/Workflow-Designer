import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Bell, Check, Trash2, X } from 'lucide-angular';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="relative">
      <!-- Bell button -->
      <button
        (click)="toggle()"
        class="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        title="Notificaciones"
      >
        <lucide-icon [img]="Bell" [size]="20" />
        @if (notifService.unreadCount() > 0) {
          <span
            class="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none"
          >
            {{ notifService.unreadCount() > 9 ? '9+' : notifService.unreadCount() }}
          </span>
        }
      </button>

      <!-- Dropdown panel -->
      @if (open()) {
        <div
          class="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-card shadow-xl animate-in slide-in-from-top-2 fade-in duration-150"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <span class="text-sm font-semibold text-foreground">Notificaciones</span>
            <div class="flex items-center gap-1">
              @if (notifService.notifications().length > 0) {
                <button
                  (click)="clearAll()"
                  class="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Limpiar todo"
                >
                  <lucide-icon [img]="Trash2" [size]="14" />
                </button>
              }
              <button
                (click)="open.set(false)"
                class="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent transition-colors"
              >
                <lucide-icon [img]="X" [size]="14" />
              </button>
            </div>
          </div>

          <!-- List -->
          <div class="max-h-80 overflow-y-auto">
            @if (notifService.notifications().length === 0) {
              <div class="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                <lucide-icon [img]="Bell" [size]="32" class="opacity-30" />
                <p class="text-xs">Sin notificaciones</p>
              </div>
            } @else {
              @for (notif of notifService.notifications().slice(0, 10); track notif.uuid) {
                <div
                  (click)="onNotifClick(notif)"
                  class="flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-accent/50 border-b border-border/50 last:border-0"
                  [class.opacity-60]="notif.isRead"
                >
                  <!-- Type dot -->
                  <span
                    class="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full"
                    [class]="typeDotClass(notif.type)"
                  ></span>

                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-semibold text-foreground" [class.font-normal]="notif.isRead">
                      {{ notif.title }}
                    </p>
                    <p class="mt-0.5 text-xs text-muted-foreground line-clamp-2">{{ notif.message }}</p>
                    <p class="mt-1 text-[10px] text-muted-foreground/70">
                      {{ notif.createdAt | date: 'dd/MM/yy HH:mm' }}
                    </p>
                  </div>

                  @if (!notif.isRead) {
                    <span class="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-primary"></span>
                  }
                </div>
              }
            }
          </div>

          <!-- Footer -->
          @if (notifService.notifications().length > 10) {
            <div class="border-t border-border px-4 py-2 text-center">
              <span class="text-xs text-muted-foreground">
                Mostrando 10 de {{ notifService.notifications().length }}
              </span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class NotificationDropdownComponent {
  readonly Bell = Bell;
  readonly Check = Check;
  readonly Trash2 = Trash2;
  readonly X = X;

  readonly notifService = inject(NotificationService);
  private readonly router = inject(Router);

  open = signal(false);

  toggle(): void {
    if (!this.open()) {
      this.notifService.loadAll();
    }
    this.open.update((v) => !v);
  }

  onNotifClick(notif: AppNotification): void {
    if (!notif.isRead) {
      this.notifService.markAsRead(notif.uuid);
    }
    this.open.set(false);
    if (notif.relatedId) {
      this.router.navigate(['/app/manager/instances', notif.relatedId]);
    }
  }

  clearAll(): void {
    this.notifService.clearAll();
  }

  typeDotClass(type: string): string {
    switch (type) {
      case 'TASK_ASSIGNED': return 'bg-blue-500';
      case 'STATUS_CHANGED': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('app-notification-dropdown')) {
      this.open.set(false);
    }
  }
}
