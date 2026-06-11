import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { OfflineSyncService } from './core/services/offline-sync.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent, ConfirmDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'workflow-designer';
  private readonly offlineSync = inject(OfflineSyncService);
  
  isOffline = toSignal(this.offlineSync.isOnline$.pipe(map(online => !online)), { initialValue: false });
  showReconnected = signal(false);

  constructor() {
    let wasOffline = !navigator.onLine;
    this.offlineSync.isOnline$.subscribe(online => {
      if (!online) {
        wasOffline = true;
      } else if (online && wasOffline) {
        wasOffline = false;
        this.showReconnected.set(true);
        setTimeout(() => {
          this.showReconnected.set(false);
        }, 5000);
      }
    });
  }
}
