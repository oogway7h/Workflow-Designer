import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TaskCountService {
  private readonly http = inject(HttpClient);

  /** Number of pending tasks for the current employee. */
  readonly taskInboxCount = signal<number>(0);

  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  startPolling(intervalMs = 30000): void {
    this.loadCount();
    this.pollingTimer = setInterval(() => this.loadCount(), intervalMs);
  }

  stopPolling(): void {
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  loadCount(): void {
    this.http
      .get<any>(`${environment.apiUrl}/workflow/dashboard/employee`)
      .subscribe({
        next: (data) => this.taskInboxCount.set(data?.pendingTasksCount ?? 0),
        error: () => {},
      });
  }
}
