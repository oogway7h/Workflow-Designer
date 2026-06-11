import { Injectable } from '@angular/core';

export interface OfflineRequest {
  id?: number;
  type: 'complete_task' | 'upload_file';
  url: string;
  payload: any;
  files?: { name: string; type: string; data: string }[]; // Base64 data strings
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private dbName = 'workflow_designer_pwa';
  private dbVersion = 2;
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDb();
  }

  private initDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event);
        reject(request.error);
      };

      request.onsuccess = (event) => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        
        // Store for cached tasks
        if (!db.objectStoreNames.contains('tasks_cache')) {
          db.createObjectStore('tasks_cache', { keyPath: 'id' });
        }
        
        // Store for queued offline actions/requests
        if (!db.objectStoreNames.contains('offline_queue')) {
          db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
        }

        // Store for detailed task cache
        if (!db.objectStoreNames.contains('task_details_cache')) {
          db.createObjectStore('task_details_cache', { keyPath: 'id' });
        }
      };
    });
  }

  // --- Tasks Cache Methods ---
  
  async saveTasksCache(tasks: any[]): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('tasks_cache', 'readwrite');
      const store = transaction.objectStore('tasks_cache');

      // Clear old cache first
      store.clear();

      tasks.forEach(task => {
        // Enforce an 'id' field for keypath if missing (using instanceId + taskId)
        const cacheItem = {
          ...task,
          id: task.id || `${task.instanceId}_${task.taskId}`
        };
        store.put(cacheItem);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getTasksCache(): Promise<any[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('tasks_cache', 'readonly');
      const store = transaction.objectStore('tasks_cache');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Task Details Cache Methods ---

  async saveTaskDetailsCache(id: string, details: any): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('task_details_cache', 'readwrite');
      const store = transaction.objectStore('task_details_cache');
      const cacheItem = {
        ...details,
        id: id
      };
      const request = store.put(cacheItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTaskDetailsCache(id: string): Promise<any> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('task_details_cache', 'readonly');
      const store = transaction.objectStore('task_details_cache');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Offline Queue Methods ---

  async enqueueRequest(requestItem: Omit<OfflineRequest, 'timestamp'>): Promise<number> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('offline_queue', 'readwrite');
      const store = transaction.objectStore('offline_queue');
      
      const fullItem: OfflineRequest = {
        ...requestItem,
        timestamp: Date.now()
      };

      const request = store.add(fullItem);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getQueue(): Promise<OfflineRequest[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('offline_queue', 'readonly');
      const store = transaction.objectStore('offline_queue');
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort queue by timestamp ascending (FIFO order)
        const sorted = (request.result as OfflineRequest[]).sort((a, b) => a.timestamp - b.timestamp);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFromQueue(id: number): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('offline_queue', 'readwrite');
      const store = transaction.objectStore('offline_queue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearQueue(): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('offline_queue', 'readwrite');
      const store = transaction.objectStore('offline_queue');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
