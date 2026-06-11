import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { IndexedDbService, OfflineRequest } from './indexed-db.service';
import { PolicyService } from './policy.service';
import { DocumentService } from './document.service';

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private readonly indexedDb = inject(IndexedDbService);
  private readonly policyService = inject(PolicyService);
  private readonly documentService = inject(DocumentService);

  private readonly onlineStatus$ = new BehaviorSubject<boolean>(navigator.onLine);
  private readonly syncProgress$ = new BehaviorSubject<{ active: boolean; total: number; processed: number }>({
    active: false,
    total: 0,
    processed: 0
  });

  constructor() {
    this.initNetworkListeners();
    // Reconcile as soon as we regain internet connection
    this.onlineStatus$.subscribe(isOnline => {
      if (isOnline) {
        this.syncOfflineQueue();
      }
    });
  }

  get isOnline$(): Observable<boolean> {
    return this.onlineStatus$.asObservable();
  }

  get isOnline(): boolean {
    return this.onlineStatus$.value;
  }

  get syncProgress(): Observable<{ active: boolean; total: number; processed: number }> {
    return this.syncProgress$.asObservable();
  }

  private initNetworkListeners() {
    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).subscribe(status => {
      this.onlineStatus$.next(status);
    });
  }

  async syncOfflineQueue(): Promise<void> {
    if (this.syncProgress$.value.active) return;
    
    const queue = await this.indexedDb.getQueue();
    if (queue.length === 0) return;

    this.syncProgress$.next({ active: true, total: queue.length, processed: 0 });
    console.log(`[OfflineSync] Reconnection detected. Syncing ${queue.length} actions.`);

    let processedCount = 0;

    for (const item of queue) {
      try {
        if (item.type === 'complete_task') {
          // 1. Upload files first if any
          const documentUuids: string[] = [];
          if (item.files && item.files.length > 0) {
            for (const fileItem of item.files) {
              const blob = this.base64ToBlob(fileItem.data, fileItem.type);
              const file = new File([blob], fileItem.name, { type: fileItem.type });
              
              // We pass requirementName to correctly link required documents
              const uploadRes = await this.documentService.upload(
                file,
                item.payload.policyId,
                item.payload.customerId,
                fileItem.name
              ).toPromise();
              
              if (uploadRes && uploadRes.uuid) {
                documentUuids.push(uploadRes.uuid);
              }
            }
          }

          // 2. Submit task payload
          // If we uploaded files, we can include their UUIDs in task payload to associate them
          const finalPayload = {
            ...item.payload,
            uploadedDocumentUuids: documentUuids
          };

          await this.policyService.completeTask(item.url, finalPayload).toPromise();
          
          // 3. Clear from queue
          await this.indexedDb.deleteFromQueue(item.id!);
          console.log(`[OfflineSync] Successfully synchronized queued action #${item.id}`);
        }
      } catch (error) {
        console.error(`[OfflineSync] Sync error for item #${item.id}:`, error);
        // Leave the request in the queue so it can be retried or flagged as conflicting.
      } finally {
        processedCount++;
        this.syncProgress$.next({
          active: processedCount < queue.length,
          total: queue.length,
          processed: processedCount
        });
      }
    }

    // Reset status once all items are processed
    this.syncProgress$.next({ active: false, total: 0, processed: 0 });
  }

  private base64ToBlob(base64: string, type: string): Blob {
    const parts = base64.split(';base64,');
    const byteString = atob(parts.length > 1 ? parts[1] : parts[0]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type });
  }
}
