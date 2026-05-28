import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { QuillModule } from 'ngx-quill';
import { DocumentService } from '../../../core/services/document.service';
import { WebsocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';

// Yjs/y-quill removed: using direct Quill delta sync over WebSocket instead
import mammoth from 'mammoth';
import * as quillToWord from 'quill-to-word';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';

Quill.register('modules/cursors', QuillCursors);

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, PdfViewerModule, QuillModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 4rem);
      overflow: hidden;
    }
    .viewer-wrapper {
      flex: 1;
      overflow: hidden;
      position: relative;
    }
    .docx-container {
      width: 100%;
      height: 100%;
      background: #f3f4f6;
      display: flex;
      flex-direction: column;
    }
    /* Style quill to look like a document page */
    .docx-container :host ::ng-deep .ql-toolbar {
      background: white;
      border: none !important;
      border-bottom: 1px solid #e5e7eb !important;
    }
    .docx-container :host ::ng-deep .ql-container {
      border: none !important;
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    .docx-container :host ::ng-deep .ql-editor {
      background: white;
      min-height: 100%;
      max-width: 850px;
      margin: 0 auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06);
      padding: 1in;
    }
  `],
  template: `
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm" style="flex-shrink:0;">
      <div class="flex items-center">
        <button (click)="goBack()" class="mr-3 text-gray-400 hover:text-gray-600 transition-colors">
          <lucide-icon name="arrow-left" class="h-5 w-5"></lucide-icon>
        </button>
        <div class="flex items-center">
          <lucide-icon [name]="getFileIcon(fileName)" class="h-5 w-5 text-blue-500 mr-2"></lucide-icon>
          <div>
            <h1 class="text-base font-semibold text-gray-900 leading-tight">{{ fileName }}</h1>
            <div class="text-xs text-gray-500 flex items-center">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span>
              <span>{{ activeUsers.length }} en linea</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex items-center space-x-3">
        <!-- Save button for DOCX -->
        <button *ngIf="fileType === 'docx' && !isConverting" (click)="saveVersion()" [disabled]="isSaving" class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
          <lucide-icon *ngIf="!isSaving" name="save" class="h-3.5 w-3.5 mr-1.5"></lucide-icon>
          <div *ngIf="isSaving" class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5"></div>
          {{ isSaving ? 'Guardando...' : 'Guardar Versión' }}
        </button>

        <button (click)="downloadFallback()" class="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors shadow-sm">
          <lucide-icon name="download" class="h-3 w-3 mr-1 text-gray-500"></lucide-icon>
          Descargar
        </button>
        <button (click)="viewAudit()" class="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors shadow-sm">
          <lucide-icon name="history" class="h-3 w-3 mr-1 text-gray-500"></lucide-icon>
          Bitacora
        </button>
      </div>
    </div>

    <!-- Viewer Area -->
    <div class="viewer-wrapper">
      <div *ngIf="isLoading" class="h-full flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <ng-container *ngIf="!isLoading && fileUrl">
        
        <!-- PDF Viewer -->
        <ng-container *ngIf="fileType === 'pdf'">
          <pdf-viewer 
            [src]="fileUrl"
            [render-text]="true"
            [original-size]="false"
            style="display:block;width:100%;height:100%;">
          </pdf-viewer>
        </ng-container>

        <!-- DOCX Viewer & Editor (Quill) -->
        <div *ngIf="fileType === 'docx'" class="docx-container">
          <div *ngIf="isConverting" class="h-full flex items-center justify-center text-gray-500">
             <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
             Convirtiendo documento...
          </div>
          <div *ngIf="conversionError" class="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg m-4">
             <p class="font-semibold">Error al cargar el documento:</p>
             <p class="text-sm">{{ conversionError }}</p>
          </div>
          <div class="bg-gray-100 px-4 py-1 text-xs text-gray-600 border-b border-gray-200 flex justify-between">
             <span>Estado: {{ loadStatus }}</span>
             <span *ngIf="fileUrl">URL: {{ fileUrl.substring(0, 50) }}...</span>
          </div>
          <quill-editor 
            [hidden]="isConverting || !!conversionError"
            class="flex-1 overflow-hidden flex flex-col"
            [modules]="quillModules"
            (onEditorCreated)="onEditorCreated($event)"
            [placeholder]="'Escribe aquí...'"
          ></quill-editor>
        </div>

        <!-- Image Viewer -->
        <div *ngIf="fileType === 'image'" class="w-full h-full flex items-center justify-center bg-gray-50 p-4">
          <img [src]="fileUrl" class="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
        </div>

        <!-- Video Viewer -->
        <div *ngIf="fileType === 'video'" class="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
          <video [src]="fileUrl" controls class="max-w-full max-h-full"></video>
        </div>

        <!-- Unsupported -->
        <div *ngIf="fileType === 'unknown' || fileType === 'xlsx'" class="w-full h-full flex flex-col items-center justify-center text-gray-500">
          <lucide-icon name="file-question" class="h-16 w-16 mb-4 text-gray-400"></lucide-icon>
          <p class="text-lg font-medium text-gray-900 mb-1">Formato no soportado para vista previa</p>
          <p class="text-sm mb-4">Por favor, descarga el archivo para verlo.</p>
          <button (click)="downloadFallback()" class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <lucide-icon name="download" class="h-4 w-4 mr-2"></lucide-icon>
            Descargar Archivo
          </button>
        </div>
      </ng-container>
    </div>
  `
})
export class DocumentViewerComponent implements OnInit, OnDestroy {
  uuid = '';
  fileName = 'Cargando...';
  fileType: 'pdf' | 'docx' | 'xlsx' | 'image' | 'video' | 'unknown' = 'unknown';
  fileUrl = '';
  policyId?: string;
  
  isLoading = true;
  isConverting = false;
  isSaving = false;
  conversionError = '';
  loadStatus = 'Inicializando...';
  
  activeUsers: string[] = [];

  // Quill Modules configuration
  quillModules = {
    cursors: true,
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['clean']
    ]
  };

  private presenceSubscription: any;
  private editSubscription: any;
  private awarenessSubscription: any;
  
  private quillInstance: any;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documentService = inject(DocumentService);
  private readonly wsService = inject(WebsocketService);
  private readonly authService = inject(AuthService);

  ngOnInit() {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || '';
    if (!this.uuid) {
      this.goBack();
      return;
    }

    this.loadDocument();
    this.setupPresence();
  }

  ngOnDestroy() {
    if (this.presenceSubscription) this.presenceSubscription.unsubscribe();
    if (this.editSubscription) this.editSubscription.unsubscribe();
    if (this.awarenessSubscription) this.awarenessSubscription.unsubscribe();
    
    const user = this.authService.currentUser();
    if (user && this.uuid) {
      this.wsService.getStompClient().publish({
        destination: `/app/document/${this.uuid}/leave`,
        body: JSON.stringify({ userId: user.uuid, userName: user.name || user.email })
      });
    }
  }

  loadDocument() {
    this.isLoading = true;
    
    this.documentService.getAll().subscribe({
      next: (docs) => {
        const doc = docs.find(d => d.uuid === this.uuid);
        if (doc) {
          this.fileName = doc.fileName;
          this.policyId = doc.policyId;
          this.determineFileType(doc.fileName, doc.contentType);
        }
        
        this.documentService.getPresignedUrl(this.uuid).subscribe({
          next: (res) => {
            this.fileUrl = res.url;
            this.isLoading = false;
            
            if (this.fileType === 'docx') {
              this.isConverting = true;
            }
          },
          error: (err) => {
            console.error('Error fetching presigned URL', err);
            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error fetching document metadata', err);
        this.isLoading = false;
      }
    });
  }

  onEditorCreated(quill: any) {
    this.quillInstance = quill;
    console.log('[DocViewer] Quill Editor Created');

    // Load initial DOCX content into Quill asynchronously to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.loadDocxIntoQuill().then(() => {
        this.isConverting = false;
        this.setupCollaborativeEditing();
      });
    }, 0);
  }

  private async loadDocxIntoQuill() {
    this.conversionError = '';
    this.loadStatus = 'Iniciando descarga de S3...';
    try {
      console.log('[DocViewer] Fetching DOCX from:', this.fileUrl);
      const response = await fetch(this.fileUrl);
      if (!response.ok) throw new Error('S3 fetch failed: ' + response.status + ' - ' + response.statusText);
      
      this.loadStatus = 'Descargado. Leyendo bytes del archivo...';
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      this.loadStatus = `Archivo cargado (${blob.size} bytes). Convirtiendo con Mammoth...`;

      console.log('[DocViewer] Converting DOCX to HTML via mammoth...');
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value; 
      this.loadStatus = `Conversión Mammoth exitosa (${html.length} caracteres de HTML). Renderizando en Quill...`;
      console.log('[DocViewer] Mammoth HTML preview:', html.substring(0, 200));

      // Quill v2 API: clipboard.convert takes {html: string} object
      const delta = this.quillInstance.clipboard.convert({html: html});
      console.log('[DocViewer] Delta ops count:', delta.ops?.length);
      this.quillInstance.setContents(delta, 'silent');
      this.loadStatus = 'Documento cargado en el editor. Iniciando colaboración...';
      console.log('[DocViewer] Loaded DOCX content successfully');
    } catch (err: any) {
      console.error('[DocViewer] Error loading DOCX:', err);
      this.conversionError = err.message || 'Error desconocido';
      this.loadStatus = 'Error durante la carga';
    }
  }

  private setupCollaborativeEditing() {
    const user = this.authService.currentUser();
    if (!user) return;

    const stompClient = this.wsService.getStompClient();

    // Listen for edits from other users
    this.editSubscription = stompClient.watch(`/topic/document/${this.uuid}/edits`).subscribe((message) => {
      try {
        const payload = JSON.parse(message.body);
        // Ignore edits originating from ourselves to avoid double-typing
        if (payload.senderId === user.uuid) {
          return;
        }

        const binaryString = window.atob(payload.delta);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Apply the remote delta directly to Quill
        const remoteDelta = JSON.parse(new TextDecoder().decode(bytes));
        if (remoteDelta && remoteDelta.ops) {
          this.quillInstance.updateContents(remoteDelta, 'api');
        }
      } catch (err) {
        console.error('[DocViewer] Error applying remote update:', err);
      }
    });

    // Send local Quill changes to the websocket for other users
    this.quillInstance.on('text-change', (delta: any, oldDelta: any, source: string) => {
      if (source === 'user') {
        try {
          const deltaJson = JSON.stringify(delta);
          const bytes = new TextEncoder().encode(deltaJson);
          let binaryString = '';
          bytes.forEach((byte: number) => {
            binaryString += String.fromCharCode(byte);
          });
          const base64Update = window.btoa(binaryString);

          const payload = JSON.stringify({
            senderId: user.uuid,
            delta: base64Update
          });

          stompClient.publish({
            destination: `/app/document/${this.uuid}/edit`,
            body: payload
          });
        } catch (err) {
          console.error('[DocViewer] Error sending edit:', err);
        }
      }
    });

    // Listen for remote cursors / awareness updates
    this.awarenessSubscription = stompClient.watch(`/topic/document/${this.uuid}/awareness`).subscribe((message) => {
      try {
        const payload = JSON.parse(message.body);
        if (payload.userId === user.uuid) {
          return; // Skip our own cursor updates
        }

        const cursors = this.quillInstance.getModule('cursors');
        if (!cursors) return;

        if (payload.range) {
          // Create/update the cursor for the remote user
          const color = this.getUserColor(payload.userId);
          cursors.createCursor(payload.userId, payload.userName, color);
          cursors.moveCursor(payload.userId, payload.range);
        } else {
          // Remove cursor if range is null (user blurred editor)
          cursors.removeCursor(payload.userId);
        }
      } catch (err) {
        console.error('[DocViewer] Error handling remote cursor:', err);
      }
    });

    // Send local cursor / selection changes to the websocket for other users
    this.quillInstance.on('selection-change', (range: any, oldRange: any, source: string) => {
      try {
        stompClient.publish({
          destination: `/app/document/${this.uuid}/awareness`,
          body: JSON.stringify({
            userId: user.uuid,
            userName: user.name || user.email,
            range: range ? { index: range.index, length: range.length } : null
          })
        });
      } catch (err) {
        console.error('[DocViewer] Error sending selection update:', err);
      }
    });

    this.loadStatus = 'Editor listo. Colaboración activa.';
    console.log('[DocViewer] Collaborative editing initialized');
  }

  private getUserColor(userId: string): string {
    const PRESET_COLORS = [
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#8B5CF6', // Violet
      '#F59E0B', // Amber
      '#EF4444', // Rose
      '#06B6D4', // Cyan
      '#EC4899', // Pink
      '#6366F1'  // Indigo
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PRESET_COLORS.length;
    return PRESET_COLORS[index];
  }

  async saveVersion() {
    if (!this.quillInstance || this.isSaving) return;
    this.isSaving = true;

    try {
      const delta = this.quillInstance.getContents();
      
      // Convert Quill Delta directly to a Word document blob in the browser
      const docxBlob = await quillToWord.generateWord(delta, { exportAs: 'blob' });
      
      const file = new File([docxBlob as Blob], this.fileName, { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      this.documentService.upload(file, this.policyId).subscribe({
        next: (res) => {
          this.isSaving = false;
          console.log('[DocViewer] Version saved:', res);
          // Reload document to get new S3 url
          this.loadDocument();
        },
        error: (err) => {
          console.error('[DocViewer] Error saving version:', err);
          this.isSaving = false;
        }
      });
    } catch (err) {
      console.error('[DocViewer] Error generating DOCX:', err);
      this.isSaving = false;
    }
  }

  determineFileType(fileName: string, contentType: string) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (ext === 'pdf' || contentType === 'application/pdf') {
      this.fileType = 'pdf';
    } else if (['doc', 'docx'].includes(ext || '')) {
      this.fileType = 'docx';
    } else if (['xls', 'xlsx'].includes(ext || '')) {
      this.fileType = 'xlsx';
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '') || contentType.startsWith('image/')) {
      this.fileType = 'image';
    } else if (['mp4', 'avi', 'mov'].includes(ext || '') || contentType.startsWith('video/')) {
      this.fileType = 'video';
    } else {
      this.fileType = 'unknown';
    }
  }

  setupPresence() {
    const user = this.authService.currentUser();
    if (!user) return;

    const stompClient = this.wsService.getStompClient();
    
    this.presenceSubscription = stompClient.watch(`/topic/document/${this.uuid}/presence`).subscribe((message) => {
      const presenceEvent = JSON.parse(message.body);
      
      if (presenceEvent.action === 'JOIN') {
        if (!this.activeUsers.includes(presenceEvent.userName)) {
          this.activeUsers = [...this.activeUsers, presenceEvent.userName];
        }
      } else if (presenceEvent.action === 'LEAVE') {
        this.activeUsers = this.activeUsers.filter(name => name !== presenceEvent.userName);
        if (this.quillInstance) {
          const cursors = this.quillInstance.getModule('cursors');
          if (cursors) {
            cursors.removeCursor(presenceEvent.userId);
          }
        }
      }
    });

    setTimeout(() => {
      stompClient.publish({
        destination: `/app/document/${this.uuid}/join`,
        body: JSON.stringify({ userId: user.uuid, userName: user.name || user.email })
      });
    }, 1000);
  }

  goBack() {
    this.router.navigate(['/app/documents']);
  }

  viewAudit() {
    this.router.navigate(['/app/documents', this.uuid, 'audit']);
  }

  downloadFallback() {
    window.open(this.fileUrl, '_blank');
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
}
