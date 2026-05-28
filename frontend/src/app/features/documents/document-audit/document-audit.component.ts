import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, History, Upload, Download, Eye, Trash2, Edit, Activity } from 'lucide-angular';
import { DocumentService } from '../../../core/services/document.service';
import { DocumentAudit } from '../../../core/models';

@Component({
  selector: 'app-document-audit',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="p-8 max-w-4xl mx-auto">
      <div class="mb-8 flex items-center justify-between">
        <div class="flex items-center">
          <button (click)="goBack()" class="mr-4 text-gray-400 hover:text-gray-600 transition-colors">
            <lucide-icon name="arrow-left" class="h-6 w-6"></lucide-icon>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Bitácora del Documento</h1>
            <p class="text-sm text-gray-500 mt-1">Historial de accesos y modificaciones</p>
          </div>
        </div>
      </div>

      <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6">
        <div *ngIf="isLoading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <div *ngIf="!isLoading && audits.length === 0" class="text-center py-12 text-gray-500">
          <lucide-icon name="history" class="mx-auto h-12 w-12 text-gray-400 mb-3"></lucide-icon>
          <p>No hay registros en la bitácora para este documento.</p>
        </div>

        <div *ngIf="!isLoading && audits.length > 0" class="flow-root">
          <ul role="list" class="-mb-8">
            <li *ngFor="let audit of audits; let last = last">
              <div class="relative pb-8">
                <!-- Line joining nodes -->
                <span *ngIf="!last" class="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                
                <div class="relative flex space-x-3">
                  <div>
                    <span class="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white" [ngClass]="getIconBgColor(audit.action)">
                      <lucide-icon [name]="getActionIcon(audit.action)" class="h-4 w-4 text-white"></lucide-icon>
                    </span>
                  </div>
                  <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p class="text-sm text-gray-500">
                        <span class="font-medium text-gray-900">{{ audit.userName }}</span> {{ getActionText(audit.action) }}
                      </p>
                      <p class="text-sm text-gray-500 mt-1" *ngIf="audit.details">{{ audit.details }}</p>
                    </div>
                    <div class="whitespace-nowrap text-right text-sm text-gray-500">
                      <time [attr.datetime]="audit.timestamp">{{ audit.timestamp | date:'medium' }}</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `
})
export class DocumentAuditComponent implements OnInit {
  uuid = '';
  audits: DocumentAudit[] = [];
  isLoading = true;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documentService = inject(DocumentService);

  ngOnInit() {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || '';
    if (!this.uuid) {
      this.goBack();
      return;
    }
    
    this.loadAudit();
  }

  loadAudit() {
    this.isLoading = true;
    this.documentService.getAudit(this.uuid).subscribe({
      next: (audits) => {
        this.audits = audits;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading audit log', err);
        this.isLoading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/app/documents']);
  }

  getActionIcon(action: string): string {
    switch(action) {
      case 'UPLOAD': return 'upload';
      case 'DOWNLOAD': return 'download';
      case 'VIEW': return 'eye';
      case 'DELETE': return 'trash-2';
      case 'UPDATE': return 'edit';
      default: return 'activity';
    }
  }

  getIconBgColor(action: string): string {
    switch(action) {
      case 'UPLOAD': return 'bg-green-500';
      case 'DOWNLOAD': return 'bg-blue-500';
      case 'VIEW': return 'bg-gray-400';
      case 'DELETE': return 'bg-red-500';
      case 'UPDATE': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  }

  getActionText(action: string): string {
    switch(action) {
      case 'UPLOAD': return 'subió el documento';
      case 'DOWNLOAD': return 'descargó el documento';
      case 'VIEW': return 'visualizó el documento';
      case 'DELETE': return 'eliminó el documento';
      case 'UPDATE': return 'actualizó el documento';
      default: return 'interactuó con el documento';
    }
  }
}
