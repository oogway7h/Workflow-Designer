import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { interval, Subscription } from 'rxjs';

export interface AppNotification {
  uuid: string;
  title: string;
  message: string;
  type: 'TASK_ASSIGNED' | 'STATUS_CHANGED' | 'INFO';
  isRead: boolean;
  relatedId: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  notifications = signal<AppNotification[]>([]);
  unreadCount = signal<number>(0);

  private pollSub: Subscription | null = null;

  startPolling(intervalMs = 30000): void {
    this.loadAll();
    this.pollSub = interval(intervalMs).subscribe(() => this.loadUnreadCount());
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  loadAll(): void {
    this.http.get<AppNotification[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.notifications.set(data);
        this.unreadCount.set(data.filter((n) => !n.isRead).length);
      },
      error: () => {},
    });
  }

  loadUnreadCount(): void {
    this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`).subscribe({
      next: ({ count }) => this.unreadCount.set(count),
      error: () => {},
    });
  }

  markAsRead(uuid: string): void {
    this.http.patch(`${this.baseUrl}/${uuid}/read`, {}).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n.uuid === uuid ? { ...n, isRead: true } : n))
        );
        this.unreadCount.update((c) => Math.max(0, c - 1));
      },
      error: () => {},
    });
  }

  clearAll(): void {
    this.http.delete(this.baseUrl).subscribe({
      next: () => {
        this.notifications.set([]);
        this.unreadCount.set(0);
      },
      error: () => {},
    });
  }
}
