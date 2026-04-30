import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { NotificationService } from '../../core/services/notification.service';
import { IncomingRequestsService } from '../../core/services/incoming-requests.service';
import { TaskCountService } from '../../core/services/task-count.service';
import { NotificationDropdownComponent } from '../../shared/components/notification-dropdown/notification-dropdown.component';
import { getMenuItemsForRole, UserRole } from '../../core/config/menu.config';
import { AiChatWidgetComponent } from '../../shared/components/ai-chat-widget/ai-chat-widget.component';
import { VoiceNavWidgetComponent } from '../../shared/components/voice-nav-widget/voice-nav-widget.component';
import { TourOverlayComponent } from '../../shared/components/tour-overlay/tour-overlay.component';
import {
  LucideAngularModule,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  LayoutDashboard,
  UserCircle,
} from 'lucide-angular';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ThemeToggleComponent,
    LucideAngularModule,
    AiChatWidgetComponent,
    VoiceNavWidgetComponent,
    TourOverlayComponent,
    NotificationDropdownComponent,
  ],
  template: `
    <div class="flex h-screen overflow-hidden bg-background text-foreground">
      <!-- Tour overlay for first-time users -->
      @if (showTour()) {
        <app-tour-overlay [role]="userRole()" (done)="showTour.set(false)" />
      }

      <!-- Sidebar -->
      <aside
        class="flex flex-col border-r border-border bg-card transition-all duration-300"
        [class.w-64]="!collapsed()"
        [class.w-16]="collapsed()"
      >
        <!-- Logo -->
        <div
          class="flex h-14 items-center border-b border-border px-4"
          [class.justify-between]="!collapsed()"
          [class.justify-center]="collapsed()"
        >
          @if (!collapsed()) {
            <span class="text-sm font-semibold text-primary truncate">Workflow Designer</span>
          }
          <button
            (click)="toggleSidebar()"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            @if (collapsed()) {
              <lucide-icon [img]="ChevronRight" [size]="18" />
            } @else {
              <lucide-icon [img]="ChevronLeft" [size]="18" />
            }
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 space-y-1 px-2 py-3">
          @for (item of navItems(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-primary/10 text-primary"
              [routerLinkActiveOptions]="{ exact: false }"
              class="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              [class.justify-center]="collapsed()"
              [title]="item.label"
            >
              <div class="relative shrink-0">
                <lucide-icon [img]="item.icon" [size]="20" />
                @if (item.badgeKey === 'incomingCount' && incomingRequestsService.incomingCount() > 0) {
                  <span class="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground leading-none">
                    {{ incomingRequestsService.incomingCount() > 99 ? '99+' : incomingRequestsService.incomingCount() }}
                  </span>
                }
                @if (item.badgeKey === 'notificationCount' && notificationService.unreadCount() > 0) {
                  <span class="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground leading-none">
                    {{ notificationService.unreadCount() > 99 ? '99+' : notificationService.unreadCount() }}
                  </span>
                }
                @if (item.badgeKey === 'taskInboxCount' && taskCountService.taskInboxCount() > 0) {
                  <span class="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground leading-none">
                    {{ taskCountService.taskInboxCount() > 99 ? '99+' : taskCountService.taskInboxCount() }}
                  </span>
                }
              </div>
              @if (!collapsed()) {
                <span class="truncate">{{ item.label }}</span>
                @if (item.badgeKey === 'incomingCount' && incomingRequestsService.incomingCount() > 0) {
                  <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground leading-none">
                    {{ incomingRequestsService.incomingCount() > 99 ? '99+' : incomingRequestsService.incomingCount() }}
                  </span>
                }
                @if (item.badgeKey === 'notificationCount' && notificationService.unreadCount() > 0) {
                  <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground leading-none">
                    {{ notificationService.unreadCount() > 99 ? '99+' : notificationService.unreadCount() }}
                  </span>
                }
                @if (item.badgeKey === 'taskInboxCount' && taskCountService.taskInboxCount() > 0) {
                  <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground leading-none">
                    {{ taskCountService.taskInboxCount() > 99 ? '99+' : taskCountService.taskInboxCount() }}
                  </span>
                }
              }
            </a>
          }
        </nav>

        <!-- User / Logout -->
        <div class="border-t border-border p-2">
          <!-- Profile link (click on user name) -->
          @if (!collapsed()) {
            <a routerLink="/app/profile"
              class="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-accent transition-colors group">
              <lucide-icon [img]="UserCircleIcon" [size]="18" class="shrink-0 text-muted-foreground group-hover:text-foreground" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                  {{ authService.currentUser()?.name || 'Usuario' }}
                </p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ authService.currentUser()?.email || '' }}
                </p>
              </div>
            </a>
          }
          <button
            (click)="authService.logout()"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            [class.justify-center]="collapsed()"
            title="Cerrar sesión"
          >
            <lucide-icon [img]="LogOut" [size]="20" class="shrink-0" />
            @if (!collapsed()) {
              <span>Cerrar sesión</span>
            }
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <!-- Top bar -->
        <header class="flex h-14 items-center justify-between border-b border-border px-6">
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors lg:hidden"
            (click)="toggleSidebar()"
          >
            <lucide-icon [img]="Menu" [size]="18" />
          </button>
          <div class="flex-1"></div>
          <app-notification-dropdown />
          <app-theme-toggle />
        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-auto relative">
          <router-outlet />
          <app-ai-chat-widget></app-ai-chat-widget>
          <app-voice-nav-widget></app-voice-nav-widget>
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  readonly notificationService = inject(NotificationService);
  readonly incomingRequestsService = inject(IncomingRequestsService);
  readonly taskCountService = inject(TaskCountService);
  private readonly router = inject(Router);

  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly LogOut = LogOut;
  readonly Menu = Menu;
  readonly LayoutDashboard = LayoutDashboard;
  readonly UserCircleIcon = UserCircle;

  collapsed = signal(false);
  showTour = signal(false);
  userRole = computed(() => this.authService.currentUser()?.role ?? null);

  ngOnInit(): void {
    this.notificationService.startPolling();
    // Start incoming requests polling only for MANAGER role
    const role = this.authService.getCurrentUserRole();
    if (role === 'MANAGER') {
      this.incomingRequestsService.startPolling();
    }
    if (role === 'EMPLOYEE') {
      this.taskCountService.startPolling();
    }
    // Check isFirstLogin via /me/profile endpoint
    const rolee = this.authService.getCurrentUserRole();
    if (rolee && rolee !== 'CUSTOMER') {
      this.profileService.getMyProfile().subscribe({
        next: (profile) => {
          // Jackson puede serializar 'boolean isFirstLogin' como 'firstLogin' o 'isFirstLogin'
          const firstLogin = profile?.isFirstLogin ?? profile?.firstLogin ?? false;
          console.log('[Tour] profile loaded, isFirstLogin=', firstLogin, profile);
          if (firstLogin === true) {
            this.showTour.set(true);
          }
        },
        error: (err) => {
          console.warn('[Tour] Could not fetch profile for tour check', err);
        },
      });
    }
  }

  navItems = computed(() => {
    const userRole = this.authService.getCurrentUserRole();
    const items = userRole ? getMenuItemsForRole(userRole) : [];

    if (items.length === 0) {
      return [
        {
          path: '/app/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          roles: ['ADMIN', 'DESIGNER', 'MANAGER', 'EMPLOYEE'] as UserRole[],
        }
      ];
    }

    return items;
  });

  toggleSidebar(): void {
    this.collapsed.update((v) => !v);
  }

  ngOnDestroy(): void {
    this.notificationService.stopPolling();
    this.incomingRequestsService.stopPolling();
  }
}
