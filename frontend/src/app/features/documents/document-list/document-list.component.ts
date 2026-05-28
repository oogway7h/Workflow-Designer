import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Plus, Eye, Download, History, Trash2, FileText, FileSpreadsheet, Image, Video, File } from 'lucide-angular';
import { DocumentService } from '../../../core/services/document.service';
import { Document } from '../../../core/models';
import { DocumentUploadComponent } from '../document-upload/document-upload.component';
import { WebsocketService } from '../../../core/services/websocket.service';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DocumentUploadComponent],
  template: `
    <div class="p-8">
      <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Documentos</h1>
          <p class="text-sm text-gray-500 mt-1">Gestiona los archivos y repositorios del sistema</p>
        </div>
        <button
          (click)="showUploadModal = true"
          class="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all"
        >
          <lucide-icon name="plus" class="mr-2 h-4 w-4"></lucide-icon>
          Subir Documento
        </button>
      </div>

      <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Nombre</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tamaño</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Subido por</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fecha</th>
              <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span class="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr *ngFor="let doc of documents" class="hover:bg-gray-50 transition-colors">
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                <div class="flex items-center">
                  <div class="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <lucide-icon [name]="getFileIcon(doc.fileName)" class="h-5 w-5"></lucide-icon>
                  </div>
                  <div class="ml-4">
                    <div class="font-medium text-gray-900 cursor-pointer hover:text-blue-600" (click)="viewDocument(doc.uuid)">{{ doc.fileName }}</div>
                    <div class="text-gray-500">{{ doc.contentType }}</div>
                  </div>
                </div>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {{ formatBytes(doc.fileSizeBytes) }}
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {{ doc.uploaderName }}
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {{ doc.createdAt | date:'short' }}
              </td>
              <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div class="flex justify-end gap-2">
                  <button (click)="viewDocument(doc.uuid)" class="text-gray-400 hover:text-blue-600 transition-colors" title="Ver">
                    <lucide-icon name="eye" class="h-5 w-5"></lucide-icon>
                  </button>
                  <button (click)="download(doc.uuid, doc.fileName)" class="text-gray-400 hover:text-blue-600 transition-colors" title="Descargar">
                    <lucide-icon name="download" class="h-5 w-5"></lucide-icon>
                  </button>
                  <button (click)="viewAudit(doc.uuid)" class="text-gray-400 hover:text-indigo-600 transition-colors" title="Bitácora">
                    <lucide-icon name="history" class="h-5 w-5"></lucide-icon>
                  </button>
                  <button (click)="delete(doc.uuid)" class="text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                    <lucide-icon name="trash-2" class="h-5 w-5"></lucide-icon>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="documents.length === 0">
              <td colspan="5" class="px-3 py-8 text-center text-sm text-gray-500">
                No hay documentos subidos aún.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <app-document-upload 
      *ngIf="showUploadModal" 
      (close)="showUploadModal = false"
      (uploadSuccess)="loadDocuments()">
    </app-document-upload>
  `
})
export class DocumentListComponent implements OnInit {
  documents: Document[] = [];
  showUploadModal = false;

  private readonly documentService = inject(DocumentService);
  private readonly router = inject(Router);
  private readonly wsService = inject(WebsocketService);

  ngOnInit() {
    this.loadDocuments();

    // Subscribe to WS updates for any policy or global
    const stompClient = this.wsService.getStompClient();
    stompClient.watch('/topic/documents/updates').subscribe(() => {
      this.loadDocuments();
    });
  }

  loadDocuments() {
    this.documentService.getAll().subscribe({
      next: (docs) => this.documents = docs,
      error: (err) => console.error('Error loading documents', err)
    });
  }

  viewDocument(uuid: string) {
    this.router.navigate(['/app/documents', uuid]);
  }

  viewAudit(uuid: string) {
    this.router.navigate(['/app/documents', uuid, 'audit']);
  }

  download(uuid: string, fileName: string) {
    this.documentService.download(uuid).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error downloading document', err)
    });
  }

  delete(uuid: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este documento?')) {
      this.documentService.delete(uuid).subscribe({
        next: () => this.loadDocuments(),
        error: (err) => console.error('Error deleting document', err)
      });
    }
  }

  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return 'file-text';
    if (['doc', 'docx'].includes(ext || '')) return 'file-text';
    if (['xls', 'xlsx'].includes(ext || '')) return 'file-spreadsheet';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image';
    if (['mp4', 'avi', 'mov'].includes(ext || '')) return 'video';
    return 'file';
  }

  formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
}
