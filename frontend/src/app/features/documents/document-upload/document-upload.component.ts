import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, UploadCloud, X, File, FileText, FileSpreadsheet, FileImage } from 'lucide-angular';
import { DocumentService } from '../../../core/services/document.service';
import { PolicyService } from '../../../core/services/policy.service';
import { Policy } from '../../../core/models';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-card text-foreground rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-border">
        <div class="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 class="text-lg font-semibold text-foreground">Subir Documento</h2>
          <button (click)="close.emit()" class="text-gray-400 hover:text-gray-600 transition-colors">
            <lucide-icon name="x" [size]="20"></lucide-icon>
          </button>
        </div>

        <div class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-medium text-foreground mb-1">Repositorio (Opcional)</label>
            <select
              [(ngModel)]="selectedPolicyId"
              class="w-full bg-background text-foreground rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option [ngValue]="undefined">Repositorio Global</option>
              <option *ngFor="let policy of policies" [value]="policy.uuid">{{ policy.name }}</option>
            </select>
          </div>

          <div
            class="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
            [class.border-primary]="isDragging"
            [ngClass]="{'bg-primary/5': isDragging}"
            [class.border-border]="!isDragging"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
          >
            <div *ngIf="!selectedFile; else filePreview">
              <lucide-icon name="upload-cloud" class="mx-auto text-muted-foreground mb-4" [size]="48"></lucide-icon>
              <p class="text-sm text-foreground mb-2">
                Arrastra un archivo aquí o
                <label class="text-primary hover:text-primary/80 font-medium cursor-pointer">
                  explora
                  <input type="file" class="hidden" (change)="onFileSelected($event)" />
                </label>
              </p>
              <p class="text-xs text-muted-foreground">PDF, DOCX, XLSX, MP4, JPEG hasta 50MB</p>
            </div>

            <ng-template #filePreview>
              <div class="flex flex-col items-center">
                <lucide-icon [name]="getFileIcon(selectedFile!.name)" class="text-blue-500 mb-3" [size]="40"></lucide-icon>
                <p class="text-sm font-medium text-foreground mb-1">{{ selectedFile!.name }}</p>
                <p class="text-xs text-muted-foreground mb-4">{{ (selectedFile!.size / 1024 / 1024).toFixed(2) }} MB</p>
                
                <div class="flex space-x-3">
                  <button
                    (click)="selectedFile = null"
                    class="px-3 py-1.5 text-sm font-medium text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
                  >
                    Quitar
                  </button>
                  <button
                    (click)="upload()"
                    [disabled]="isUploading"
                    class="px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <span *ngIf="isUploading" class="mr-2">
                      <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                    {{ isUploading ? 'Subiendo...' : 'Subir' }}
                  </button>
                </div>
              </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DocumentUploadComponent {
  @Output() close = new EventEmitter<void>();
  @Output() uploadSuccess = new EventEmitter<void>();

  private readonly documentService = inject(DocumentService);
  private readonly policyService = inject(PolicyService);

  readonly UploadCloud = UploadCloud;
  readonly X = X;

  isDragging = false;
  isUploading = false;
  selectedFile: File | null = null;
  
  policies: Policy[] = [];
  selectedPolicyId?: string;

  ngOnInit() {
    this.policyService.getAll().subscribe({
      next: (policies) => this.policies = policies,
      error: (err) => console.error('Error fetching policies', err)
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    
    if (event.dataTransfer?.files.length) {
      this.selectedFile = event.dataTransfer.files[0];
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
    }
  }

  upload() {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.documentService.upload(this.selectedFile, this.selectedPolicyId).subscribe({
      next: () => {
        this.isUploading = false;
        this.uploadSuccess.emit();
        this.close.emit();
      },
      error: (err) => {
        console.error('Error uploading file', err);
        this.isUploading = false;
        alert('Error al subir el archivo');
      }
    });
  }

  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return 'file-text';
    if (['doc', 'docx'].includes(ext || '')) return 'file-text';
    if (['xls', 'xlsx'].includes(ext || '')) return 'file-spreadsheet';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'file-image';
    return 'file';
  }
}
