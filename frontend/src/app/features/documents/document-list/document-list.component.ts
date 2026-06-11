import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Plus, Eye, Download, History, Trash2, FileText, FileSpreadsheet, Image, Video, File, Folder, Users, Shield, ArrowLeft, ChevronRight } from 'lucide-angular';
import { DocumentService } from '../../../core/services/document.service';
import { PolicyService } from '../../../core/services/policy.service';
import { UserService } from '../../../core/services/user.service';
import { RoleService } from '../../../core/services/role.service';
import { Document, Policy, User, Role } from '../../../core/models';
import { DocumentUploadComponent } from '../document-upload/document-upload.component';
import { WebsocketService } from '../../../core/services/websocket.service';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DocumentUploadComponent],
  template: `
    <div class="p-8">
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-foreground">Documentos</h1>
          <p class="text-sm text-muted-foreground mt-1">Gestiona los repositorios por Política o Cliente</p>
        </div>
      </div>

      <!-- TABS -->
      <div class="border-b border-border mb-6">
        <nav class="-mb-px flex space-x-8">
          <button
            (click)="switchTab('policies')"
            [class.border-blue-500]="activeTab === 'policies'"
            [class.text-blue-600]="activeTab === 'policies'"
            [class.border-transparent]="activeTab !== 'policies'"
            [class.text-muted-foreground]="activeTab !== 'policies'"
            class="group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium hover:border-border hover:text-foreground transition-colors"
          >
            <lucide-icon name="shield" class="mr-2 h-5 w-5" [class.text-blue-500]="activeTab === 'policies'"></lucide-icon>
            Políticas
          </button>
          <button
            (click)="switchTab('customers')"
            [class.border-blue-500]="activeTab === 'customers'"
            [class.text-blue-600]="activeTab === 'customers'"
            [class.border-transparent]="activeTab !== 'customers'"
            [class.text-muted-foreground]="activeTab !== 'customers'"
            class="group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium hover:border-border hover:text-foreground transition-colors"
          >
            <lucide-icon name="users" class="mr-2 h-5 w-5" [class.text-blue-500]="activeTab === 'customers'"></lucide-icon>
            Clientes
          </button>
        </nav>
      </div>

      <!-- FOLDERS VIEW -->
      <ng-container *ngIf="viewMode === 'list'">
        <!-- Policies Folders -->
        <div *ngIf="activeTab === 'policies'" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div *ngFor="let policy of policies" 
               (click)="openPolicyFolder(policy.uuid, policy.name || 'Sin nombre')"
               class="bg-card border border-border rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:bg-muted/50 hover:border-blue-500/50 transition-all group">
            <div class="p-2 bg-blue-50/50 dark:bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 transition-colors">
              <lucide-icon name="folder" class="h-8 w-8 fill-blue-500/20"></lucide-icon>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-foreground" [title]="policy.name || 'Sin nombre'">{{ policy.name || 'Sin nombre' }}</h3>
              <p class="text-xs text-muted-foreground mt-1">{{ policy.state }}</p>
            </div>
          </div>
          <div *ngIf="policies.length === 0" class="col-span-full py-8 text-center text-muted-foreground">
            No hay políticas disponibles.
          </div>
        </div>

        <!-- Customers Folders -->
        <div *ngIf="activeTab === 'customers'" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div *ngFor="let customer of customers" 
               (click)="openCustomerFolderDirect(customer.uuid, customer.name + ' ' + customer.lastname)"
               class="bg-card border border-border rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:bg-muted/50 hover:border-blue-500/50 transition-all group">
            <div class="p-2 bg-blue-50/50 dark:bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 transition-colors">
              <lucide-icon name="folder" class="h-8 w-8 fill-blue-500/20"></lucide-icon>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-foreground" [title]="customer.name + ' ' + customer.lastname">{{ customer.name }} {{ customer.lastname }}</h3>
              
            </div>
          </div>
          <div *ngIf="customers.length === 0" class="col-span-full py-8 text-center text-muted-foreground">
            No hay clientes disponibles.
          </div>
        </div>
      </ng-container>

      <!-- SUBFOLDERS VIEW (CUSTOMERS INSIDE A POLICY) -->
      <ng-container *ngIf="viewMode === 'subfolder_list'">
        <div class="mb-6 flex items-center gap-3 bg-muted/30 p-4 rounded-xl border border-border">
          <button (click)="goBack()" class="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
            <lucide-icon name="arrow-left" class="h-5 w-5"></lucide-icon>
          </button>
          <div class="h-8 w-px bg-border"></div>
          <div class="flex items-center gap-2 text-foreground font-medium">
            <lucide-icon name="folder" class="h-5 w-5 text-blue-500 fill-blue-500/20"></lucide-icon>
            {{ selectedPolicyName }}
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div *ngFor="let customer of policyCustomers" 
               (click)="openCustomerSubfolder(customer.uuid, customer.name + ' ' + customer.lastname)"
               class="bg-card border border-border rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:bg-muted/50 hover:border-blue-500/50 transition-all group">
            <div class="p-2 bg-blue-50/50 dark:bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 transition-colors">
              <lucide-icon name="folder" class="h-8 w-8 fill-blue-500/20"></lucide-icon>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-foreground" [title]="customer.name + ' ' + customer.lastname">{{ customer.name }} {{ customer.lastname }}</h3>
            </div>
          </div>
          <div *ngIf="policyCustomers.length === 0" class="col-span-full py-8 text-center text-muted-foreground">
            No hay clientes con documentos en esta política.
          </div>
        </div>
      </ng-container>

      <!-- DOCUMENTS VIEW (INSIDE A FOLDER) -->
      <ng-container *ngIf="viewMode === 'folder'">
        <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border">
          <div class="flex items-center gap-3">
            <button (click)="goBack()" class="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
              <lucide-icon name="arrow-left" class="h-5 w-5"></lucide-icon>
            </button>
            <div class="h-8 w-px bg-border"></div>
            <div class="flex items-center gap-2 text-foreground font-medium" *ngIf="activeTab === 'policies'">
              <lucide-icon name="folder" class="h-5 w-5 text-blue-500 fill-blue-500/20"></lucide-icon>
              {{ selectedPolicyName }}
              <lucide-icon name="chevron-right" class="h-4 w-4 text-muted-foreground mx-1"></lucide-icon>
              <lucide-icon name="folder" class="h-5 w-5 text-blue-500 fill-blue-500/20"></lucide-icon>
              {{ selectedCustomerName }}
            </div>
            <div class="flex items-center gap-2 text-foreground font-medium" *ngIf="activeTab === 'customers'">
              <lucide-icon name="folder" class="h-5 w-5 text-blue-500 fill-blue-500/20"></lucide-icon>
              {{ selectedCustomerName }}
            </div>
          </div>
          <button
            (click)="showUploadModal = true"
            class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500 transition-all"
          >
            <lucide-icon name="plus" class="mr-2 h-4 w-4"></lucide-icon>
            Subir Documento
          </button>
        </div>

        <div class="bg-card shadow-sm ring-1 ring-border rounded-xl overflow-hidden">
          <table class="min-w-full divide-y divide-border">
            <thead class="bg-muted/50">
              <tr>
                <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Nombre</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Tamaño</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Subido por</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Fecha</th>
                <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span class="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border bg-card">
              <tr *ngFor="let doc of documents" class="hover:bg-muted/50 transition-colors">
                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                  <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      <lucide-icon [name]="getFileIcon(doc.fileName)" class="h-5 w-5"></lucide-icon>
                    </div>
                    <div class="ml-4">
                      <div class="font-medium text-foreground cursor-pointer hover:text-blue-600" (click)="viewDocument(doc.uuid)">{{ doc.fileName }}</div>
                      <div class="text-muted-foreground">{{ doc.contentType }}</div>
                    </div>
                  </div>
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                  {{ formatBytes(doc.fileSizeBytes) }}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                  {{ doc.uploaderName }}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                  {{ doc.createdAt | date:'short' }}
                </td>
                <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  <div class="flex justify-end gap-2">
                    <button (click)="viewDocument(doc.uuid)" class="text-muted-foreground hover:text-blue-600 transition-colors" title="Ver">
                      <lucide-icon name="eye" class="h-5 w-5"></lucide-icon>
                    </button>
                    <button (click)="download(doc.uuid, doc.fileName)" class="text-muted-foreground hover:text-blue-600 transition-colors" title="Descargar">
                      <lucide-icon name="download" class="h-5 w-5"></lucide-icon>
                    </button>
                    <button (click)="viewAudit(doc.uuid)" class="text-muted-foreground hover:text-indigo-600 transition-colors" title="Bitácora">
                      <lucide-icon name="history" class="h-5 w-5"></lucide-icon>
                    </button>
                    <button (click)="delete(doc.uuid)" class="text-muted-foreground hover:text-red-600 transition-colors" title="Eliminar">
                      <lucide-icon name="trash-2" class="h-5 w-5"></lucide-icon>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="documents.length === 0">
                <td colspan="5" class="px-3 py-8 text-center text-sm text-muted-foreground">
                  No hay documentos en esta carpeta.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </div>

    <app-document-upload 
      *ngIf="showUploadModal" 
      [policyId]="activeTab === 'policies' ? selectedPolicyId : undefined"
      [customerId]="selectedCustomerId"
      (close)="showUploadModal = false"
      (uploadSuccess)="loadDocumentsForFolder()">
    </app-document-upload>
  `
})
export class DocumentListComponent implements OnInit {
  activeTab: 'policies' | 'customers' = 'policies';
  viewMode: 'list' | 'subfolder_list' | 'folder' = 'list';
  
  selectedPolicyId?: string;
  selectedPolicyName?: string;
  selectedCustomerId?: string;
  selectedCustomerName?: string;

  policies: Policy[] = [];
  customers: User[] = [];
  
  policyCustomers: User[] = [];
  policyDocuments: Document[] = [];
  
  documents: Document[] = [];
  
  showUploadModal = false;

  private readonly documentService = inject(DocumentService);
  private readonly policyService = inject(PolicyService);
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);
  private readonly wsService = inject(WebsocketService);

  ngOnInit() {
    this.loadFolders();

    const stompClient = this.wsService.getStompClient();
    stompClient.watch('/topic/documents/updates').subscribe(() => {
      if (this.viewMode === 'folder') {
        this.loadDocumentsForFolder();
      }
    });
  }

  loadFolders() {
    this.policyService.getAll().subscribe({
      next: (policies) => this.policies = policies,
      error: (err) => console.error('Error fetching policies', err)
    });

    this.roleService.getAll().subscribe({
      next: (roles) => {
        const customerRole = roles.find(r => r.roleName && r.roleName.toUpperCase() === 'CUSTOMER');
        this.userService.getAll().subscribe({
          next: (users) => {
            if (customerRole) {
              this.customers = users.filter(u => u.roleId === customerRole.uuid);
            } else {
              this.customers = users; // Fallback if role is not found
            }
          },
          error: (err) => console.error('Error fetching customers', err)
        });
      },
      error: (err) => console.error('Error fetching roles', err)
    });
  }

  switchTab(tab: 'policies' | 'customers') {
    this.activeTab = tab;
    this.viewMode = 'list';
    this.selectedPolicyId = undefined;
    this.selectedPolicyName = undefined;
    this.selectedCustomerId = undefined;
    this.selectedCustomerName = undefined;
  }

  openPolicyFolder(id: string, name: string) {
    this.selectedPolicyId = id;
    this.selectedPolicyName = name;
    this.viewMode = 'subfolder_list';
    this.loadSubfoldersForPolicy();
  }

  openCustomerSubfolder(id: string, name: string) {
    this.selectedCustomerId = id;
    this.selectedCustomerName = name;
    this.viewMode = 'folder';
    if (this.activeTab === 'policies') {
      this.documents = this.policyDocuments.filter(d => d.customerId === id);
    } else {
      this.loadDocumentsForFolder();
    }
  }

  openCustomerFolderDirect(id: string, name: string) {
    this.selectedCustomerId = id;
    this.selectedCustomerName = name;
    this.viewMode = 'folder';
    this.loadDocumentsForFolder();
  }

  goBack() {
    if (this.viewMode === 'folder') {
      if (this.activeTab === 'policies') {
        this.viewMode = 'subfolder_list';
        this.selectedCustomerId = undefined;
        this.selectedCustomerName = undefined;
      } else {
        this.viewMode = 'list';
        this.selectedCustomerId = undefined;
        this.selectedCustomerName = undefined;
      }
    } else if (this.viewMode === 'subfolder_list') {
      this.viewMode = 'list';
      this.selectedPolicyId = undefined;
      this.selectedPolicyName = undefined;
    }
  }

  loadSubfoldersForPolicy() {
    if (!this.selectedPolicyId) return;
    this.documentService.getByPolicy(this.selectedPolicyId).subscribe({
      next: (docs) => {
        this.policyDocuments = docs;
        const uniqueCustomerIds = [...new Set(docs.map(d => d.customerId).filter(id => !!id))];
        this.policyCustomers = this.customers.filter(c => uniqueCustomerIds.includes(c.uuid));
      },
      error: (err) => console.error('Error loading policy documents', err)
    });
  }

  loadDocumentsForFolder() {
    if (this.activeTab === 'policies') {
      if (!this.selectedPolicyId) return;
      this.documentService.getByPolicy(this.selectedPolicyId).subscribe({
        next: (docs) => {
          this.policyDocuments = docs;
          if (this.selectedCustomerId) {
            this.documents = docs.filter(d => d.customerId === this.selectedCustomerId);
          }
        },
        error: (err) => console.error('Error loading policy documents', err)
      });
    } else {
      if (!this.selectedCustomerId) return;
      this.documentService.getByCustomer(this.selectedCustomerId).subscribe({
        next: (docs) => this.documents = docs,
        error: (err) => console.error('Error loading customer documents', err)
      });
    }
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
        next: () => this.loadDocumentsForFolder(),
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
