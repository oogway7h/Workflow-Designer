import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { QuillModule } from 'ngx-quill';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../../../core/services/document.service';
import { WebsocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';
import { SpreadsheetEditorComponent } from '../spreadsheet-editor/spreadsheet-editor.component';
import { ImageEditorComponent } from '../image-editor/image-editor.component';

// Yjs/y-quill removed: using direct Quill delta sync over WebSocket instead
import mammoth from 'mammoth';
import * as quillToWord from 'quill-to-word';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';

import * as Y from 'yjs';
import { QuillBinding } from 'y-quill';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import * as base64js from 'base64-js';

Quill.register('modules/cursors', QuillCursors);

// Register custom block line height attributor
const Parchment = Quill.import('parchment');
const LineHeightStyle = new Parchment.StyleAttributor('lineheight', 'line-height', {
  scope: Parchment.Scope.BLOCK,
  whitelist: ['1', '1.15', '1.5', '2', '2.5', '3']
});
Quill.register(LineHeightStyle, true);

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, PdfViewerModule, QuillModule, FormsModule, SpreadsheetEditorComponent, ImageEditorComponent],
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
      background: hsl(var(--muted));
      display: flex;
      flex-direction: column;
    }
    ::ng-deep .docx-container .ql-container.ql-snow {
      position: relative !important;
      font-size: 14px;
      border: none !important;
      flex: 1 !important;
      overflow-y: auto !important;
      padding: 2rem 0 !important;
      background: hsl(var(--muted)) !important;
      height: auto !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    }
    ::ng-deep .docx-container .ql-container.ql-snow .ql-editor {
      position: relative !important;
      background: hsl(var(--card)) !important;
      color: hsl(var(--card-foreground)) !important;
      min-height: 1056px !important;
      height: auto !important;
      width: 100% !important;
      max-width: 816px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
      border: 1px solid hsl(var(--border)) !important;
      padding: 1in !important;
      overflow-y: visible !important;
      margin-bottom: 2rem !important;
      display: block !important;
      flex-grow: 0 !important;
      flex-shrink: 0 !important;
    }
    ::ng-deep .ql-cursor-selections {
      pointer-events: none;
    }
    .toolbar-select {
      background: hsl(var(--card));
      color: hsl(var(--foreground));
      border: 1px solid hsl(var(--border));
      border-radius: 4px;
      padding: 2px 4px;
      font-size: 11px;
      cursor: pointer;
      outline: none;
      height: 24px;
    }
    .toolbar-select:hover {
      background: hsl(var(--accent));
    }
  `],
  template: `
    <!-- Header -->
    <div class="bg-card border-b border-border px-4 py-2 flex items-center justify-between shadow-sm" style="flex-shrink:0;">
      <div class="flex items-center">
        <button (click)="goBack()" class="mr-3 text-muted-foreground hover:text-foreground transition-colors">
          <lucide-icon name="arrow-left" class="h-5 w-5"></lucide-icon>
        </button>
        <div class="flex items-center">
          <lucide-icon [name]="getFileIcon(fileName)" class="h-5 w-5 text-blue-500 mr-2"></lucide-icon>
          <div>
            <h1 class="text-base font-semibold text-foreground leading-tight">{{ fileName }}</h1>
            <div class="text-xs text-muted-foreground flex items-center">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span>
              <span>{{ activeUsers.length }} en linea</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex items-center space-x-3">
        <!-- Save button for DOCX, XLSX, and Images -->
        <button *ngIf="(fileType === 'docx' && !isConverting) || fileType === 'xlsx' || fileType === 'image'" (click)="saveVersion()" [disabled]="isSaving" class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
          <lucide-icon *ngIf="!isSaving" name="save" class="h-3.5 w-3.5 mr-1.5"></lucide-icon>
          <div *ngIf="isSaving" class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5"></div>
          {{ isSaving ? 'Guardando...' : 'Guardar Versión' }}
        </button>

        <button (click)="downloadFallback()" class="inline-flex items-center px-2 py-1 text-xs font-medium text-foreground bg-card border border-border rounded hover:bg-accent transition-colors shadow-sm">
          <lucide-icon name="download" class="h-3 w-3 mr-1 text-muted-foreground"></lucide-icon>
          Descargar
        </button>
        <button (click)="viewAudit()" class="inline-flex items-center px-2 py-1 text-xs font-medium text-foreground bg-card border border-border rounded hover:bg-accent transition-colors shadow-sm">
          <lucide-icon name="history" class="h-3 w-3 mr-1 text-muted-foreground"></lucide-icon>
          Bitacora
        </button>
      </div>
    </div>

    <!-- Toolbar Extensions & Counters for DOCX -->
    <div *ngIf="fileType === 'docx' && !isConverting && !conversionError" class="bg-muted border-b border-border px-4 py-1.5 flex items-center justify-between shadow-sm text-xs text-muted-foreground">
      <div class="flex items-center space-x-4">
        <span>Palabras: {{ wordCount }}</span>
        <span>Caracteres: {{ charCount }}</span>
      </div>
      <!-- Space for future find&replace or other docx tools -->
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
          <div *ngIf="isConverting" class="h-full flex items-center justify-center text-muted-foreground">
             <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
             Cargando documento...
          </div>
          <div *ngIf="conversionError" class="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg m-4">
             <p class="font-semibold">Error al cargar el documento:</p>
             <p class="text-sm">{{ conversionError }}</p>
          </div>
          
          <div id="custom-toolbar" [hidden]="isConverting || !!conversionError" class="bg-white border border-border px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-2 shadow-sm rounded-t-md mx-4 mt-4" style="flex-shrink:0">
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50">
              <select class="ql-font !text-xs font-medium" title="Familia Tipográfica"></select>
              <select class="ql-size !text-xs font-medium" title="Tamaño de Letra"></select>
            </span>
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50">
              <select class="ql-header !text-xs font-medium" title="Estilo de Párrafo">
                <option value="">Normal</option>
                <option value="1">Título 1</option>
                <option value="2">Título 2</option>
                <option value="3">Título 3</option>
                <option value="4">Título 4</option>
              </select>
            </span>
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50 gap-1">
              <button class="ql-bold hover:bg-accent rounded px-1.5 transition-colors" title="Negrita"></button>
              <button class="ql-italic hover:bg-accent rounded px-1.5 transition-colors" title="Cursiva"></button>
              <button class="ql-underline hover:bg-accent rounded px-1.5 transition-colors" title="Subrayado"></button>
              <button class="ql-strike hover:bg-accent rounded px-1.5 transition-colors" title="Tachado"></button>
            </span>
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50 gap-1">
              <select class="ql-color" title="Color de Texto"></select>
              <select class="ql-background" title="Color de Fondo"></select>
            </span>
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50">
              <select class="ql-lineheight !text-xs font-medium" title="Interlineado">
                <option value="1">Normal (1.0)</option>
                <option value="1.15">1.15</option>
                <option value="1.5">1.5</option>
                <option value="2">2.0</option>
                <option value="2.5">2.5</option>
                <option value="3">3.0</option>
              </select>
            </span>
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50 gap-1">
              <button class="ql-script" value="sub" title="Subíndice"></button>
              <button class="ql-script" value="super" title="Superíndice"></button>
            </span>
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50 gap-1">
              <button class="ql-blockquote" title="Cita"></button>
              <button class="ql-code" title="Código en línea"></button>
              <button class="ql-code-block" title="Bloque de código"></button>
              <button class="ql-formula" title="Fórmula Matemática"></button>
            </span>
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50 gap-1">
              <button class="ql-list" value="ordered" title="Lista numerada"></button>
              <button class="ql-list" value="bullet" title="Lista con viñetas"></button>
              <button class="ql-list" value="check" title="Lista de tareas (Checklist)"></button>
              <button class="ql-indent" value="-1" title="Reducir sangría"></button>
              <button class="ql-indent" value="+1" title="Aumentar sangría"></button>
            </span>
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50">
              <select class="ql-align" title="Alineación"></select>
              <button class="ql-direction" value="rtl" title="Dirección de texto (RTL)"></button>
            </span>
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50 gap-1">
              <button class="ql-link hover:bg-accent rounded px-1.5 transition-colors" title="Enlace"></button>
              <button class="ql-image hover:bg-accent rounded px-1.5 transition-colors" title="Imagen"></button>
              <button class="ql-clean hover:bg-accent rounded px-1.5 transition-colors" title="Limpiar formato"></button>
            </span>
            <!-- Collaboration & Data Helpers (Undo/Redo & Find/Replace & Tables) -->
            <div class="h-5 w-[1px] bg-border mx-1"></div>
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50 gap-1">
              <button (click)="undo()" title="Deshacer" class="hover:bg-accent rounded px-1.5 transition-colors flex items-center justify-center h-6 w-6">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 7v6h6"></path>
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
                </svg>
              </button>
              <button (click)="redo()" title="Rehacer" class="hover:bg-accent rounded px-1.5 transition-colors flex items-center justify-center h-6 w-6">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 7v6h-6"></path>
                  <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
                </svg>
              </button>
            </span>
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50 gap-1">
              <button (click)="toggleFindReplace()" title="Buscar y Reemplazar" [class.active]="showFindReplace" class="hover:bg-accent rounded px-1.5 transition-colors flex items-center justify-center h-6 w-6">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
            </span>
            <span class="ql-formats flex items-center bg-muted/50 rounded p-1 border border-border/50 gap-1">
              <button (click)="insertTable()" title="Insertar Tabla" class="hover:bg-accent rounded px-1.5 transition-colors flex items-center justify-center h-6 w-6">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                  <line x1="12" y1="3" x2="12" y2="21"></line>
                </svg>
              </button>
              <select (change)="onTableAction($event)" class="toolbar-select !text-xs font-medium !p-0.5 !h-6" title="Acciones de Tabla">
                <option value="">Tabla</option>
                <option value="row-above">Fila Arriba</option>
                <option value="row-below">Fila Abajo</option>
                <option value="col-left">Columna Izq</option>
                <option value="col-right">Columna Der</option>
                <option value="del-row">Eliminar Fila</option>
                <option value="del-col">Eliminar Columna</option>
                <option value="del-table">Eliminar Tabla</option>
              </select>
            </span>
          </div>

          <!-- Find and Replace Panel -->
          <div *ngIf="showFindReplace" class="bg-white border border-border px-4 py-2 flex flex-wrap items-center gap-3 shadow-sm rounded-md mx-4 mt-2" style="flex-shrink:0;">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-medium text-muted-foreground">Buscar:</span>
              <input type="text" [(ngModel)]="findQuery" (input)="onFindQueryChange()" class="toolbar-select !h-7 !py-0.5 !px-2" placeholder="Texto a buscar..." />
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-medium text-muted-foreground">Reemplazar:</span>
              <input type="text" [(ngModel)]="replaceQuery" class="toolbar-select !h-7 !py-0.5 !px-2" placeholder="Reemplazo..." />
            </div>
            <button (click)="findNext()" class="inline-flex items-center px-2 py-1 text-xs font-medium text-foreground bg-secondary border border-border rounded hover:bg-accent transition-colors" title="Buscar Siguiente">Siguiente</button>
            <button (click)="replace()" class="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 transition-colors shadow-sm" title="Reemplazar">Reemplazar</button>
            <button (click)="replaceAll()" class="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-emerald-600 border border-transparent rounded hover:bg-emerald-700 transition-colors shadow-sm" title="Reemplazar Todo">Reemplazar Todo</button>
            <span class="text-xs text-muted-foreground ml-2" *ngIf="findMatchesCount !== null">
              {{ findMatchesCount > 0 ? currentMatchIndex + 1 : 0 }} de {{ findMatchesCount }} coincidencias
            </span>
            <button (click)="toggleFindReplace()" class="ml-auto text-muted-foreground hover:text-foreground">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <quill-editor 
            [hidden]="isConverting || !!conversionError"
            class="flex-1 overflow-hidden flex flex-col mx-4 mb-4 bg-white shadow-sm rounded-b-md border border-t-0 border-border relative"
            [modules]="quillModules"
            (onEditorCreated)="onEditorCreated($event)">
          </quill-editor>
        </div>

        <!-- Excel Spreadsheet Editor -->
        <div *ngIf="fileType === 'xlsx' && fileUrl" class="w-full h-full">
          <app-spreadsheet-editor
            #spreadsheetEditor
            [fileUrl]="fileUrl"
            [fileName]="fileName"
            [uuid]="uuid"
            (dataChanged)="onSpreadsheetChanged()"
          ></app-spreadsheet-editor>
        </div>

        <!-- Image Editor -->
        <div *ngIf="fileType === 'image'" class="w-full h-full">
          <app-image-editor
            #imageEditor
            [fileUrl]="fileUrl"
            (imageModified)="onImageModified($event)"
          ></app-image-editor>
        </div>

        <!-- Video Viewer -->
        <div *ngIf="fileType === 'video'" class="w-full h-full flex flex-col bg-background">
          <div class="flex-1 flex items-center justify-center p-4">
            <video #videoPlayer [src]="fileUrl" controls class="max-w-full max-h-full rounded-lg shadow-xl" style="outline: none;">
              Tu navegador no soporta el elemento de video.
            </video>
          </div>
          <div class="bg-card border-t border-border px-4 py-3 flex items-center gap-4 flex-shrink-0">
            <button (click)="togglePlayPause()" class="text-foreground hover:text-primary transition-colors">
              <lucide-icon [name]="isVideoPlaying ? 'pause' : 'play'" class="h-5 w-5"></lucide-icon>
            </button>
            <button (click)="skipVideo(-10)" class="text-foreground hover:text-primary transition-colors" title="Retroceder 10s">
              <lucide-icon name="rewind" class="h-4 w-4"></lucide-icon>
            </button>
            <button (click)="skipVideo(10)" class="text-foreground hover:text-primary transition-colors" title="Avanzar 10s">
              <lucide-icon name="fast-forward" class="h-4 w-4"></lucide-icon>
            </button>
            <span class="text-xs text-muted-foreground">{{ videoCurrentTime }} / {{ videoDuration }}</span>
            <div class="flex-1"></div>
            <select (change)="setPlaybackRate($event)" class="bg-muted text-foreground text-xs border border-border rounded px-2 py-1">
              <option value="0.5">0.5x</option>
              <option value="1" selected>1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
            <button (click)="toggleFullscreen()" class="text-foreground hover:text-primary transition-colors">
              <lucide-icon name="maximize" class="h-4 w-4"></lucide-icon>
            </button>
          </div>
        </div>

        <!-- Unsupported -->
        <div *ngIf="fileType === 'unknown'" class="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
          <lucide-icon name="file-question" class="h-16 w-16 mb-4 text-muted-foreground/50"></lucide-icon>
          <p class="text-lg font-medium text-foreground mb-1">Formato no soportado para vista previa</p>
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
  private presenceUsersMap = new Map<string, string>(); // userId -> userName

  // ViewChild references for sub-editors
  @ViewChild('spreadsheetEditor') spreadsheetEditor!: SpreadsheetEditorComponent;
  @ViewChild('imageEditor') imageEditor!: ImageEditorComponent;
  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;

  // Video player state
  isVideoPlaying = false;
  videoCurrentTime = '0:00';
  videoDuration = '0:00';
  private videoTimeInterval: any;

  // Quill Modules configuration
  quillModules = {
    cursors: {
      hideDelayMs: 3000,
      hideSpeedMs: 0,
      selectionChangeSource: null
    },
    table: true,
    toolbar: '#custom-toolbar'
  };

  wordCount = 0;
  charCount = 0;

  showFindReplace = false;
  findQuery = '';
  replaceQuery = '';
  findMatchesCount: number | null = null;
  currentMatchIndex = 0;
  private matches: { index: number; length: number; }[] = [];

  private presenceSubscription: any;
  private editSubscription: any;
  private awarenessSubscription: any;

  private quillInstance: any;
  private scrollContainer: HTMLElement | null = null;
  private scrollHandler: (() => void) | null = null;

  private ydoc!: Y.Doc;
  private ytext!: Y.Text;
  private awareness!: Awareness;
  private binding: any;
  private hasBoundQuill = false;
  private initTimeout: any;
  private s3LoadPromise!: Promise<any>;

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
    if (this.videoTimeInterval) clearInterval(this.videoTimeInterval);
    if (this.scrollContainer && this.scrollHandler) {
      this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
    }

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

    // Register table module if available in Quill 2.0
    try {
      const table = this.quillInstance.getModule('table');
      if (!table) this.quillInstance.addContainer('table');
    } catch (e) {
      // Ignore if table module is not fully supported
    }

    // Load initial DOCX content asynchronously to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      // Setup Yjs structure immediately
      this.ydoc = new Y.Doc();
      this.ytext = this.ydoc.getText('quill');
      this.awareness = new Awareness(this.ydoc);
      
      this.loadStatus = 'Conectando y sincronizando con otros usuarios...';

      // Start S3 fetch in parallel without putting it in Quill yet
      this.s3LoadPromise = this.fetchAndConvertS3Doc();

      // Start collaboration
      this.setupCollaborativeEditing();
    }, 0);
  }

  private updateWordCount() {
    if (!this.quillInstance) return;
    const text = this.quillInstance.getText() || '';
    this.charCount = Math.max(0, text.length - 1); // Quill adds trailing newline
    const words = text.trim().split(/\s+/);
    this.wordCount = text.trim().length > 0 ? words.length : 0;
  }

  private async fetchAndConvertS3Doc(): Promise<any> {
    this.conversionError = '';
    try {
      console.log('[DocViewer] Fetching DOCX from:', this.fileUrl);
      const response = await fetch(this.fileUrl);
      if (!response.ok) throw new Error('S3 fetch failed: ' + response.status);

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      
      console.log('[DocViewer] Converting DOCX to HTML via mammoth...');
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;
      
      const delta = this.quillInstance.clipboard.convert({ html: html });
      console.log('[DocViewer] DOCX fallback content converted successfully');
      return delta;
    } catch (err: any) {
      console.error('[DocViewer] Error loading DOCX:', err);
      this.conversionError = err.message || 'Error desconocido';
      this.isConverting = false;
      throw err;
    }
  }

  private setupCollaborativeEditing() {
    const user = this.authService.currentUser();
    if (!user) return;

    const stompClient = this.wsService.getStompClient();

    // Set local awareness state
    this.awareness.setLocalStateField('user', {
      id: user.uuid,
      name: user.name || user.email,
      color: this.getUserColor(user.uuid)
    });

    // Handle Yjs document updates locally -> broadcast to peers
    this.ydoc.on('update', (update: Uint8Array, origin: any) => {
      if (origin === 'stomp') return;

      stompClient.publish({
        destination: `/app/document/${this.uuid}/edit`,
        body: JSON.stringify({ senderId: user.uuid, type: 'YJS_UPDATE', delta: base64js.fromByteArray(update) })
      });
      this.updateWordCount();
    });

    // Handle Yjs awareness updates locally -> broadcast to peers
    this.awareness.on('update', (changes: any, origin: any) => {
      if (origin === 'stomp') return;

      const update = encodeAwarenessUpdate(this.awareness, changes.added.concat(changes.updated, changes.removed));
      stompClient.publish({
        destination: `/app/document/${this.uuid}/awareness`,
        body: JSON.stringify({ senderId: user.uuid, awareness: base64js.fromByteArray(update) })
      });
      
      this.updateActiveUsersList();
    });

    // Listen for incoming Yjs document updates
    this.editSubscription = stompClient.watch(`/topic/document/${this.uuid}/edits`).subscribe((message) => {
      try {
        const payload = JSON.parse(message.body);
        if (payload.senderId === user.uuid) return;

        if (payload.type === 'REQUEST_STATE') {
          // A new peer joined, send our full Yjs state
          const update = Y.encodeStateAsUpdate(this.ydoc);
          stompClient.publish({
            destination: `/app/document/${this.uuid}/edit`,
            body: JSON.stringify({ senderId: user.uuid, type: 'FULL_STATE', delta: base64js.fromByteArray(update) })
          });
          
          // Send our awareness state so the new peer sees our cursor immediately
          const clients = Array.from(this.awareness.getStates().keys());
          if (clients.length > 0) {
            const awUpdate = encodeAwarenessUpdate(this.awareness, clients);
            stompClient.publish({
              destination: `/app/document/${this.uuid}/awareness`,
              body: JSON.stringify({ senderId: user.uuid, awareness: base64js.fromByteArray(awUpdate) })
            });
          }
          return;
        }

        if (payload.type === 'FULL_STATE' || payload.type === 'YJS_UPDATE') {
          const update = base64js.toByteArray(payload.delta);
          
          if (payload.type === 'FULL_STATE' && this.hasBoundQuill) {
             // We received FULL_STATE after we already initialized our own document (timeout was too short).
             // To prevent duplicates, we must reset our state to match the remote state exactly.
             if (this.binding) {
               this.binding.destroy();
             }
             // CRITICAL: Clear Quill before re-binding so y-quill doesn't collide with stale content
             this.quillInstance.setContents([], 'silent');
             
             const oldClientId = this.ydoc.clientID;
             const oldClients = Array.from(this.awareness.getStates().keys());
             const oldAwUpdate = oldClients.length > 0 ? encodeAwarenessUpdate(this.awareness, oldClients) : null;

             this.ydoc = new Y.Doc();
             this.ytext = this.ydoc.getText('quill');
             
             // Must also recreate awareness because it's bound to the old ydoc's clientID
             this.awareness = new Awareness(this.ydoc);
             
             // Restore old remote states so we don't lose cursors of people already connected
             if (oldAwUpdate) {
               applyAwarenessUpdate(this.awareness, oldAwUpdate, 'local-restore');
               // Remove our old client ID so we don't leave a ghost cursor
               removeAwarenessStates(this.awareness, [oldClientId], 'local-restore');
             }

             this.awareness.setLocalStateField('user', {
               id: user.uuid,
               name: user.name || user.email,
               color: this.getUserColor(user.uuid)
             });
             
             this.awareness.on('update', (changes: any, origin: any) => {
               if (origin === 'stomp' || origin === 'local-restore') return;
               const awUpdate = encodeAwarenessUpdate(this.awareness, changes.added.concat(changes.updated, changes.removed));
               stompClient.publish({
                 destination: `/app/document/${this.uuid}/awareness`,
                 body: JSON.stringify({ senderId: user.uuid, awareness: base64js.fromByteArray(awUpdate) })
               });
               this.updateActiveUsersList();
             });

             Y.applyUpdate(this.ydoc, update, 'stomp');
             this.binding = new QuillBinding(this.ytext, this.quillInstance, this.awareness);
             
             // Reattach local ydoc listener
             this.ydoc.on('update', (upd: Uint8Array, origin: any) => {
               if (origin === 'stomp') return;
               stompClient.publish({
                 destination: `/app/document/${this.uuid}/edit`,
                 body: JSON.stringify({ senderId: user.uuid, type: 'YJS_UPDATE', delta: base64js.fromByteArray(upd) })
               });
               this.updateWordCount();
             });
          } else {
             Y.applyUpdate(this.ydoc, update, 'stomp');
             
             // If this was a FULL_STATE and we haven't bound yet, bind immediately instead of waiting for timeout
             if (payload.type === 'FULL_STATE' && !this.hasBoundQuill) {
               if (this.initTimeout) clearTimeout(this.initTimeout);
                this.binding = new QuillBinding(this.ytext, this.quillInstance, this.awareness);
                this.hasBoundQuill = true;
                this.isConverting = false; // Hide loader
                this.loadStatus = 'Editor listo. Colaboración Yjs activa.';
                this.setupCursorScrollListener();
              }
           }
           this.updateWordCount();
        }
      } catch (err) {
        console.error('[DocViewer] Error applying Yjs update:', err);
      }
    });

    // Listen for incoming Yjs awareness updates
    this.awarenessSubscription = stompClient.watch(`/topic/document/${this.uuid}/awareness`).subscribe((message) => {
      try {
        const payload = JSON.parse(message.body);
        if (payload.senderId === user.uuid || !payload.awareness) return;

        const update = base64js.toByteArray(payload.awareness);
        applyAwarenessUpdate(this.awareness, update, 'stomp');
        this.updateActiveUsersList();
      } catch (err) {
        console.error('[DocViewer] Error applying Awareness update:', err);
      }
    });

    // Request full state from peers before binding Quill
    stompClient.publish({
      destination: `/app/document/${this.uuid}/edit`,
      body: JSON.stringify({ senderId: user.uuid, type: 'REQUEST_STATE' })
    });

    // Wait a brief moment to receive FULL_STATE from an existing peer
    this.initTimeout = setTimeout(async () => {
      if (this.hasBoundQuill) return; // Already bound because FULL_STATE arrived fast
      
      // If we didn't receive a FULL_STATE from anyone, our Yjs text is empty.
      // We must be the first user, so we populate Yjs from the Mammoth fallback.
      try {
        const delta = await this.s3LoadPromise;
        if (delta && this.ytext.length === 0) {
          this.ytext.applyDelta(delta.ops);
        }
      } catch (e: any) {
        console.error('[DocViewer] Error applying initial S3 delta:', e);
        this.conversionError = e.message || 'Error al procesar el documento';
      }

      if (!this.conversionError) {
        // Bind Yjs to Quill
        this.binding = new QuillBinding(this.ytext, this.quillInstance, this.awareness);
        this.hasBoundQuill = true;
        this.isConverting = false; // Hide loader
        this.loadStatus = 'Editor listo. Colaboración Yjs activa.';
        this.setupCursorScrollListener();
        console.log('[DocViewer] Collaborative editing (Yjs) initialized as first user');
      }
    }, 3500);
  }

  private setupCursorScrollListener() {
    if (!this.quillInstance?.container) return;
    const container = this.quillInstance.container;
    this.scrollContainer = container;
    this.scrollHandler = () => {
      const cursors = this.quillInstance?.getModule('cursors');
      if (cursors) {
        cursors.update();
      }
      
      // Keep .ql-cursors aligned with the viewport of the scroll container
      const cursorsEl = container.querySelector('.ql-cursors') as HTMLElement;
      if (cursorsEl) {
        const scrollTop = container.scrollTop;
        const scrollLeft = container.scrollLeft;
        cursorsEl.style.transform = `translate(${scrollLeft}px, ${scrollTop}px)`;
      }
    };
    container.addEventListener('scroll', this.scrollHandler, { passive: true });
    
    // Run once initially to align the container if scrolled
    setTimeout(() => {
      if (this.scrollHandler) {
        this.scrollHandler();
      }
    }, 100);
  }

  private updateActiveUsersList() {
    if (this.awareness) {
      const states = Array.from(this.awareness.getStates().values());
      const uniqueNames = new Set(states.map((s: any) => s.user?.name).filter(Boolean));
      this.activeUsers = Array.from(uniqueNames);
    } else {
      const uniqueNames = new Set(this.presenceUsersMap.values());
      this.activeUsers = Array.from(uniqueNames);
    }
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
    this.isSaving = true;

    try {
      let file: File;

      if (this.fileType === 'docx') {
        if (!this.quillInstance) { this.isSaving = false; return; }
        const delta = this.quillInstance.getContents();
        const docxBlob = await quillToWord.generateWord(delta, { exportAs: 'blob' });
        file = new File([docxBlob as Blob], this.fileName, {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
      } else if (this.fileType === 'xlsx') {
        if (!this.spreadsheetEditor) { this.isSaving = false; return; }
        const xlsxBlob = this.spreadsheetEditor.getWorkbookBlob();
        file = new File([xlsxBlob], this.fileName, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
      } else if (this.fileType === 'image') {
        if (!this.imageEditor) { this.isSaving = false; return; }
        const imgBlob = await this.imageEditor.getImageBlob();
        file = new File([imgBlob], this.fileName, { type: 'image/png' });
      } else {
        this.isSaving = false;
        return;
      }

      this.documentService.upload(file, this.policyId).subscribe({
        next: (res) => {
          this.isSaving = false;
          console.log('[DocViewer] Version saved:', res);
          this.loadDocument();
        },
        error: (err) => {
          console.error('[DocViewer] Error saving version:', err);
          this.isSaving = false;
        }
      });
    } catch (err) {
      console.error('[DocViewer] Error saving:', err);
      this.isSaving = false;
    }
  }

  onSpreadsheetChanged() {
    console.log('[DocViewer] Spreadsheet data changed');
  }

  onImageModified(blob: Blob) {
    console.log('[DocViewer] Image modified, blob size:', blob.size);
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

    // Initialize list with ourselves
    this.presenceUsersMap.clear();
    this.presenceUsersMap.set(user.uuid, user.name || user.email);
    this.updateActiveUsersList();

    this.presenceSubscription = stompClient.watch(`/topic/document/${this.uuid}/presence`).subscribe((message) => {
      try {
        const presenceEvent = JSON.parse(message.body);

        if (presenceEvent.action === 'JOIN') {
          if (presenceEvent.userId !== user.uuid) {
            this.presenceUsersMap.set(presenceEvent.userId, presenceEvent.userName);
            this.updateActiveUsersList();

            // Reply with our presence so the joining user knows we are here
            stompClient.publish({
              destination: `/topic/document/${this.uuid}/presence`,
              body: JSON.stringify({
                userId: user.uuid,
                userName: user.name || user.email,
                action: 'PRESENCE_REPLY'
              })
            });
          }
        } else if (presenceEvent.action === 'PRESENCE_REPLY') {
          if (presenceEvent.userId !== user.uuid) {
            this.presenceUsersMap.set(presenceEvent.userId, presenceEvent.userName);
            this.updateActiveUsersList();
          }
        } else if (presenceEvent.action === 'LEAVE') {
          this.presenceUsersMap.delete(presenceEvent.userId);
          this.updateActiveUsersList();

          if (this.quillInstance) {
            const cursors = this.quillInstance.getModule('cursors');
            if (cursors) {
              cursors.removeCursor(presenceEvent.userId);
            }
            if (this.awareness) {
              Array.from(this.awareness.getStates().entries()).forEach(([clientId, state]) => {
                if (state['user']?.id === presenceEvent.userId || state['user']?.name === presenceEvent.userName) {
                  removeAwarenessStates(this.awareness, [clientId], 'stomp');
                }
              });
            }
          }
        }
      } catch (err) {
        console.error('[DocViewer] Error processing presence WS event:', err);
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

  // --- Video Controls ---
  private getVideoEl(): HTMLVideoElement | null {
    return this.videoPlayerRef?.nativeElement || null;
  }

  togglePlayPause() {
    const v = this.getVideoEl();
    if (!v) return;
    if (v.paused) {
      v.play();
      this.isVideoPlaying = true;
      this.startVideoTimeTracking();
    } else {
      v.pause();
      this.isVideoPlaying = false;
    }
  }

  skipVideo(seconds: number) {
    const v = this.getVideoEl();
    if (v) v.currentTime += seconds;
  }

  setPlaybackRate(event: Event) {
    const v = this.getVideoEl();
    if (v) v.playbackRate = parseFloat((event.target as HTMLSelectElement).value);
  }

  toggleFullscreen() {
    const v = this.getVideoEl();
    if (v) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        v.requestFullscreen();
      }
    }
  }

  private startVideoTimeTracking() {
    if (this.videoTimeInterval) clearInterval(this.videoTimeInterval);
    this.videoTimeInterval = setInterval(() => {
      const v = this.getVideoEl();
      if (!v) return;
      this.videoCurrentTime = this.formatTime(v.currentTime);
      this.videoDuration = this.formatTime(v.duration);
      if (v.paused || v.ended) {
        this.isVideoPlaying = false;
        clearInterval(this.videoTimeInterval);
      }
    }, 250);
  }

  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  undo() {
    if (this.quillInstance && this.quillInstance.history) {
      this.quillInstance.history.undo();
    }
  }

  redo() {
    if (this.quillInstance && this.quillInstance.history) {
      this.quillInstance.history.redo();
    }
  }

  toggleFindReplace() {
    this.showFindReplace = !this.showFindReplace;
    if (!this.showFindReplace) {
      this.findQuery = '';
      this.replaceQuery = '';
      this.findMatchesCount = null;
      this.matches = [];
    }
  }

  onFindQueryChange() {
    if (!this.findQuery || !this.quillInstance) {
      this.findMatchesCount = null;
      this.matches = [];
      return;
    }

    const text = this.quillInstance.getText() || '';
    const query = this.findQuery.toLowerCase();
    this.matches = [];
    let idx = text.toLowerCase().indexOf(query);
    while (idx !== -1) {
      this.matches.push({ index: idx, length: query.length });
      idx = text.toLowerCase().indexOf(query, idx + query.length);
    }

    this.findMatchesCount = this.matches.length;
    this.currentMatchIndex = 0;
    
    if (this.findMatchesCount > 0) {
      this.highlightMatch(0);
    }
  }

  findNext() {
    if (this.matches.length === 0 || !this.quillInstance) return;
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
    this.highlightMatch(this.currentMatchIndex);
  }

  private highlightMatch(matchIdx: number) {
    if (!this.quillInstance || !this.matches[matchIdx]) return;
    const match = this.matches[matchIdx];
    this.quillInstance.setSelection(match.index, match.length);
  }

  replace() {
    if (!this.quillInstance || this.matches.length === 0) return;
    const match = this.matches[this.currentMatchIndex];
    if (!match) return;

    this.quillInstance.insertText(match.index, this.replaceQuery, 'user');
    this.quillInstance.deleteText(match.index + this.replaceQuery.length, match.length, 'user');

    this.onFindQueryChange();
  }

  replaceAll() {
    if (!this.quillInstance || !this.findQuery) return;
    const text = this.quillInstance.getText() || '';
    const query = this.findQuery;
    const replacement = this.replaceQuery;
    
    let idx = text.toLowerCase().lastIndexOf(query.toLowerCase());
    if (idx === -1) return;

    let count = 0;
    while (idx !== -1) {
      this.quillInstance.insertText(idx, replacement, 'user');
      this.quillInstance.deleteText(idx + replacement.length, query.length, 'user');
      idx = text.toLowerCase().lastIndexOf(query.toLowerCase(), idx - 1);
      count++;
    }

    console.log(`[DocViewer] Replaced ${count} occurrences`);
    this.onFindQueryChange();
  }

  insertTable() {
    if (this.quillInstance) {
      const tableModule = this.quillInstance.getModule('table');
      if (tableModule) {
        tableModule.insertTable(3, 3);
      }
    }
  }

  onTableAction(event: any) {
    const action = event.target.value;
    if (!action || !this.quillInstance) return;
    const tableModule = this.quillInstance.getModule('table');
    if (tableModule) {
      if (action === 'row-above') tableModule.insertRowAbove();
      else if (action === 'row-below') tableModule.insertRowBelow();
      else if (action === 'col-left') tableModule.insertColumnLeft();
      else if (action === 'col-right') tableModule.insertColumnRight();
      else if (action === 'del-row') tableModule.deleteRow();
      else if (action === 'del-col') tableModule.deleteColumn();
      else if (action === 'del-table') tableModule.deleteTable();
    }
    event.target.value = '';
  }
}
