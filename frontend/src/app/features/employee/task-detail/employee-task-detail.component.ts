import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, CheckCircle, FileText, User, Clock, Save, AlertTriangle, WandSparkles, Mic, Loader, Trash2, Plus } from 'lucide-angular';
import { PolicyService } from '../../../core/services/policy.service';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ToastService } from '../../../shared/services/toast.service';
import { AiChatService } from '../../../core/services/ai-chat.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-employee-task-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, KeyValuePipe, LoaderComponent],
  template: `
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <button (click)="goBack()" class="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <lucide-icon [img]="ArrowLeft" [size]="14" />
            Volver a la Bandeja de Entrada
          </button>
          <h1 class="text-2xl font-semibold text-foreground">Completar Actividad</h1>
          <p class="mt-1 text-sm text-muted-foreground">{{ taskDetails()?.policyName || 'Cargando información...' }}</p>
        </div>
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-sm"
             [ngClass]="{'bg-green-100 text-green-700': taskDetails()?.status === 'COMPLETED', 'bg-blue-100 text-blue-700': taskDetails()?.status === 'ACTIVE' || taskDetails()?.status === 'PENDING', 'bg-gray-100 text-gray-700': !taskDetails()}">
          <lucide-icon [img]="taskDetails()?.status === 'COMPLETED' ? CheckCircle : Clock" [size]="16" />
          {{ getStatusText(taskDetails()?.status) }}
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex justify-center items-center py-12">
           <app-loader text="Cargando detalles..."></app-loader>
        </div>
      } @else if (error()) {
        <div class="flex justify-center items-center py-12">
           <div class="flex flex-col items-center">
              <lucide-icon [img]="AlertTriangle" [size]="32" class="text-red-500 mb-4" />
              <p class="text-red-500 font-medium">{{ error() }}</p>
           </div>
        </div>
      } @else if (taskDetails()) {
        <div class="grid gap-6 md:grid-cols-3">
          <!-- Main details -->
          <div class="col-span-2 space-y-6">
            
            <!-- Historical Data (instanceData) -->
            @if (taskDetails()?.instanceData && hasKeys(taskDetails()?.instanceData)) {
              <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
                 <h3 class="text-lg font-medium border-b pb-2 mb-4 flex items-center gap-2">
                   <lucide-icon [img]="FileText" [size]="20" class="text-muted-foreground"/> Datos Recolectados
                 </h3>
                 <div class="grid grid-cols-2 gap-4">
                    @for (item of taskDetails()?.instanceData | keyvalue; track item.key) {
                      <div class="space-y-1">
                        <label class="text-sm font-medium text-muted-foreground capitalize">{{ item.key }}</label>
                        <div class="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-foreground">
                           {{ item.value }}
                        </div>
                      </div>
                    }
                 </div>
              </div>
            }

            <!-- Current Task Form -->
            <div class="rounded-xl border border-primary/20 bg-card p-6 shadow-sm">
               <h3 class="text-lg font-medium border-b pb-2 mb-4 flex items-center gap-2 text-primary">
                 <lucide-icon [img]="FileText" [size]="20" /> Tarea Actual: {{ taskDetails()?.currentTaskName || 'Formulario' }}
               </h3>
               
               <div class="space-y-4">
                  @if (taskDetails()?.formSchemaJson?.fields?.length > 0) {
                     <!-- AI Autofill Section -->
                     @if (isTaskPending()) {
                       <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                         <div class="flex items-center justify-between">
                           <span class="text-xs font-semibold text-primary uppercase tracking-wider">🪄 Rellenar con IA</span>
                           <div class="flex items-center gap-2">
                             <button (click)="startNlpVoice()" [disabled]="isListeningNlp() || isNlpLoading()"
                               class="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                               title="Dictar descripción por voz">
                               <lucide-icon [img]="MicIcon" [size]="13" [class.animate-pulse]="isListeningNlp()" [class.text-primary]="isListeningNlp()" />
                               {{ isListeningNlp() ? 'Escuchando...' : 'Dictar' }}
                             </button>
                             <button (click)="aiAutofill()" [disabled]="isAiLoading()"
                               class="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                               title="Sugerir valores automáticamente">
                               <lucide-icon [img]="Wand2" [size]="13" [class.animate-spin]="isAiLoading()" />
                               {{ isAiLoading() ? 'Analizando...' : 'Auto-sugerir' }}
                             </button>
                           </div>
                         </div>
                         <div class="flex gap-2">
                           <textarea
                             [ngModel]="nlpText()"
                             (ngModelChange)="nlpText.set($event)"
                             rows="2"
                             placeholder="Describe el trámite en lenguaje natural y presiona Rellenar... Ej: El solicitante Juan Pérez pide una licencia de 5 días desde el 01/05."
                             class="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                           ></textarea>
                           <button (click)="nlpAutofill()" [disabled]="isNlpLoading() || !nlpText().trim()"
                             class="shrink-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                             @if (isNlpLoading()) {
                               <lucide-icon [img]="LoaderIcon" [size]="16" class="animate-spin" />
                             } @else {
                               <lucide-icon [img]="Wand2" [size]="16" />
                             }
                             Rellenar
                           </button>
                         </div>
                       </div>
                     }
                     @for (field of taskDetails()?.formSchemaJson?.fields; track field.name) {
                        <div class="space-y-2">
                           <div class="flex items-center justify-between">
                             <label class="text-sm font-medium text-foreground">{{ field.label || field.name }}</label>
                             @if (isTaskPending() && field.type !== 'boolean') {
                               <button (click)="startVoiceForField(field.name)"
                                 [disabled]="listeningField() === field.name"
                                 class="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                                 title="Dictar valor por voz">
                                 <lucide-icon [img]="MicIcon" [size]="13" [class.animate-pulse]="listeningField() === field.name" [class.text-primary]="listeningField() === field.name" />
                                 {{ listeningField() === field.name ? 'Escuchando...' : 'Dictar' }}
                               </button>
                             }
                           </div>
                           
                           @if (field.type === 'boolean') {
                             <div class="flex items-center gap-4 mt-2">
                               <label class="flex items-center gap-2 cursor-pointer p-3 border rounded-lg transition-colors hover:bg-green-50 dark:hover:bg-green-950/20"
                                 [class.border-green-500]="formData[field.name] === true"
                                 [class.bg-green-500]="formData[field.name] === true"
                                 [class.!text-white]="formData[field.name] === true">
                                 <input type="radio" [disabled]="!isTaskPending()" [name]="field.name" [value]="true" [(ngModel)]="formData[field.name]" class="sr-only">
                                 <lucide-icon [img]="CheckCircle" [size]="18" class="shrink-0"
                                   [class.text-white]="formData[field.name] === true"
                                   [class.text-green-500]="formData[field.name] !== true"
                                   [class.text-muted-foreground]="formData[field.name] !== true"></lucide-icon>
                                 <span class="text-sm font-medium"
                                   [class.text-white]="formData[field.name] === true"
                                   [class.text-green-600]="formData[field.name] !== true">CONFIRMADO</span>
                               </label>
                               <label class="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-accent focus-within:ring-2" [class.border-red-500]="formData[field.name] === false" [class.bg-red-500]="formData[field.name] === false" [class.bg-opacity-10]="formData[field.name] === false">
                                 <input type="radio" [disabled]="!isTaskPending()" [name]="field.name" [value]="false" [(ngModel)]="formData[field.name]" class="sr-only">
                                 <lucide-icon [img]="AlertTriangle" [size]="18" [class.text-red-500]="formData[field.name] === false" class="text-muted-foreground"></lucide-icon>
                                 <span class="text-sm font-medium" [class.text-red-500]="formData[field.name] === false">NEGADO</span>
                               </label>
                             </div>
                           } @else if (field.type === 'number') {
                             <input type="number" [disabled]="!isTaskPending()" [(ngModel)]="formData[field.name]" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" [class.ring-2]="listeningField() === field.name" [class.ring-primary]="listeningField() === field.name">
                           } @else if (field.type === 'grid') {
                             <div class="space-y-2 mt-1">
                               <div class="overflow-x-auto rounded-lg border border-border">
                                 <table class="w-full text-sm">
                                   <thead class="bg-muted/50">
                                     <tr>
                                       @for (col of (field.columns || []); track col) {
                                         <th class="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">{{ col }}</th>
                                       }
                                       @if (isTaskPending()) {
                                         <th class="w-10 border-b border-border"></th>
                                       }
                                     </tr>
                                   </thead>
                                   <tbody>
                                     @for (row of (formData[field.name] || []); track ri; let ri = $index) {
                                       <tr class="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                                         @for (col of (field.columns || []); track col) {
                                           <td class="px-2 py-1.5">
                                             <input type="text" [disabled]="!isTaskPending()"
                                               [(ngModel)]="formData[field.name][ri][col]"
                                               class="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:bg-muted/30 disabled:cursor-not-allowed" />
                                           </td>
                                         }
                                         @if (isTaskPending()) {
                                           <td class="px-1 py-1.5 text-center">
                                             <button type="button" (click)="removeGridRow(field.name, ri)"
                                               class="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                               <lucide-icon [img]="TrashIcon" [size]="13" />
                                             </button>
                                           </td>
                                         }
                                       </tr>
                                     }
                                     @if ((formData[field.name] || []).length === 0) {
                                       <tr>
                                         <td [attr.colspan]="(field.columns?.length || 1) + 1" class="px-3 py-4 text-center text-sm text-muted-foreground italic">Sin filas. Agrega una fila para comenzar.</td>
                                       </tr>
                                     }
                                   </tbody>
                                 </table>
                               </div>
                               @if (isTaskPending()) {
                                 <button type="button" (click)="addGridRow(field.name, field.columns || [])"
                                   class="inline-flex items-center gap-1 rounded-lg border border-dashed border-primary/50 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors">
                                   <lucide-icon [img]="PlusIcon" [size]="13" /> Agregar fila
                                 </button>
                               }
                             </div>
                           } @else {
                             <textarea [disabled]="!isTaskPending()" [(ngModel)]="formData[field.name]" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" rows="4" [class.ring-2]="listeningField() === field.name" [class.ring-primary]="listeningField() === field.name"></textarea>
                           }
                        </div>
                     }
                     
                     <!-- Acción -->
                     @if (isTaskPending()) {
                       <div class="pt-4 border-t mt-6 flex justify-end">
                          <button (click)="submitTask()" [disabled]="isSubmitting()" class="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                            @if (isSubmitting()) {
                              <lucide-icon [img]="Clock" [size]="18" class="animate-spin" /> Procesando...
                            } @else {
                              <lucide-icon [img]="Save" [size]="18" /> Completar Tarea
                            }
                          </button>
                       </div>
                     }
                  } @else {
                     <p class="text-sm text-muted-foreground italic">No hay campos configurados para esta tarea.</p>
                     @if (isTaskPending()) {
                       <div class="pt-4 flex justify-end mt-4 border-t">
                          <button (click)="submitTask()" [disabled]="isSubmitting()" class="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                            <lucide-icon [img]="CheckCircle" [size]="18" /> Marcar como Completado
                          </button>
                       </div>
                     }
                  }
               </div>
            </div>
          </div>

          <!-- Sidebar Activity Info -->
          <div class="space-y-6">
             <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 class="text-lg font-medium border-b pb-2 mb-4 flex items-center gap-2">
                   <lucide-icon [img]="Clock" [size]="20" class="text-primary" /> Detalles
                </h3>
                <div class="space-y-3 text-sm">
                   <div class="flex justify-between">
                     <span class="text-muted-foreground">Iniciado:</span>
                     <span class="font-medium">{{ taskDetails()?.startedAt | date:'short' }}</span>
                   </div>
                   <div class="flex justify-between">
                     <span class="text-muted-foreground">Última act.:</span>
                     <span class="font-medium">{{ taskDetails()?.updatedAt | date:'short' }}</span>
                   </div>
                </div>
             </div>
             
             <!-- Mostrar historial si existe -->
             @if (history() && history().length > 0) {
               <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <h3 class="text-lg font-medium border-b pb-2 mb-4 flex items-center gap-2">
                     <lucide-icon [img]="FileText" [size]="20" /> Historial de Avance
                  </h3>
                  <div class="space-y-4">
                     @for (event of history(); track event.id) {
                       <div class="flex gap-3 text-sm text-muted-foreground">
                         <div class="flex-shrink-0 mt-1">
                           <lucide-icon [img]="CheckCircle" [size]="14" class="text-green-500" />
                         </div>
                         <div>
                           <p class="text-foreground font-medium">{{ event.activityName }}</p>
                           <p class="text-xs">Completado por {{ event.completedBy || 'Usuario' }}</p>
                           <p class="text-xs">{{ event.timestamp | date:'short' }}</p>
                         </div>
                       </div>
                     }
                  </div>
               </div>
             }
          </div>
        </div>
      }

      <!-- Modal Tarea Completada -->
      @if (showTaskCompletedModal()) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="closeModal()">
          <div class="flex flex-col items-center justify-center p-8 rounded-2xl bg-card shadow-2xl animate-in zoom-in-95 duration-200" (click)="$event.stopPropagation()">
            <lucide-icon [img]="CheckCircle" [size]="80" class="text-green-500 mb-4" />
            <h2 class="text-2xl font-bold text-foreground mb-2">Tarea Completada</h2>
            <p class="text-muted-foreground mb-6">La tarea se completó correctamente.</p>
            <button (click)="closeModal()" class="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Aceptar
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class EmployeeTaskDetailComponent implements OnInit {
  readonly ArrowLeft = ArrowLeft;
  readonly FileText = FileText;
  readonly CheckCircle = CheckCircle;
  readonly UserIcon = User;
  readonly Clock = Clock;
  readonly Save = Save;
  readonly AlertTriangle = AlertTriangle;
  readonly Wand2 = WandSparkles;
  readonly MicIcon = Mic;
  readonly LoaderIcon = Loader;
  readonly TrashIcon = Trash2;
  readonly PlusIcon = Plus;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly policyService = inject(PolicyService);
  private readonly toast = inject(ToastService);
  private readonly aiChatService = inject(AiChatService);
  private readonly authService = inject(AuthService);

  instanceId = signal<string>('');
  
  taskDetails = signal<any | null>(null);
  history = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string>('');
  isSubmitting = signal<boolean>(false);
  showTaskCompletedModal = signal(false);
  isAiLoading = signal<boolean>(false);
  nlpText = signal<string>('');
  isNlpLoading = signal<boolean>(false);
  isListeningNlp = signal<boolean>(false);
  listeningField = signal<string | null>(null);

  formData: Record<string, any> = {};

  ngOnInit(): void {
    this.instanceId.set(this.route.snapshot.paramMap.get('id') || '');

    if (this.instanceId()) {
      this.loadDetails(this.instanceId());
      this.loadHistory(this.instanceId());
    } else {
      this.error.set('No se especificó ningún ID de instancia válido.');
      this.isLoading.set(false);
    }
  }

  loadDetails(uuid: string): void {
    this.isLoading.set(true);
    this.error.set('');
    
    setTimeout(() => {
      this.policyService.getInstanceDetails(uuid).subscribe({
        next: (data) => {
          this.taskDetails.set(data);
          this.isLoading.set(false);
          
          if (data.formSchemaJson?.fields) {
             data.formSchemaJson.fields.forEach((field: any) => {
                if (field.type === 'boolean') {
                   this.formData[field.name] = false;
                } else if (field.type === 'number') {
                   this.formData[field.name] = 0;
                } else if (field.type === 'grid') {
                   this.formData[field.name] = [];
                } else {
                   this.formData[field.name] = '';
                }
             });
          }
        },
        error: (err) => {
          console.error('Error fetching task details', err);
          this.error.set('Error al cargar los detalles de la tarea.');
          this.isLoading.set(false);
        }
      });
    }, 1500);
  }

  loadHistory(uuid: string): void {
    setTimeout(() => {
      this.policyService.getInstanceHistory(uuid).subscribe({
        next: (data) => {
          this.history.set(data.timeline || data || []);
        },
        error: (err) => {
          console.error('Error fetching history', err);
        }
      });
    }, 1500);
  }

  submitTask(): void {
    if (!this.instanceId() || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    
    setTimeout(() => {
      this.policyService.completeTask(this.instanceId(), { taskData: this.formData }).subscribe({
        next: () => {
           this.isSubmitting.set(false);
           this.showTaskCompletedModal.set(true);
        },
        error: (err: any) => {
           console.error('Error completing task', err);
           this.isSubmitting.set(false);
           this.toast.error('Hubo un error al completar la tarea.');
        }
      });
    }, 1500);
  }

  closeModal(): void {
    this.showTaskCompletedModal.set(false);
    this.goBack();
  }

  isTaskPending(): boolean {
    const details = this.taskDetails();
    if (!details) return false;
    return details.status === 'ACTIVE' || details.status === 'PENDING';
  }

  aiAutofill(): void {
    const details = this.taskDetails();
    if (!details) return;

    const fields: any[] = details.formSchemaJson?.fields ?? [];
    if (fields.length === 0) { this.toast.error('El formulario no tiene campos definidos.'); return; }

    const fieldDescriptions = fields.map((f: any) => `- ${f.name} (${f.label || f.name}, tipo: ${f.type || 'texto'})`).join('\n');
    const existingData = details.instanceData && Object.keys(details.instanceData).length > 0
      ? JSON.stringify(details.instanceData)
      : 'Ninguno';

    const prompt = `Eres un asistente que ayuda a completar formularios de gestión de trámites.\n` +
      `Trámite: ${details.policyName || 'Desconocido'}\n` +
      `Tarea actual: ${details.currentTaskName || 'Desconocida'}\n` +
      `Datos previos del trámite: ${existingData}\n\n` +
      `Campos del formulario a completar:\n${fieldDescriptions}\n\n` +
      `Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones) donde las claves sean los nombres exactos de los campos y los valores sean sugerencias apropiadas. ` +
      `Para campos booleanos usa true o false. Para campos numéricos usa números. Para textos usa strings cortos y descriptivos.`;

    const userRole = this.authService.getCurrentUserRole() || 'employee';
    this.isAiLoading.set(true);

    this.aiChatService.getChatResponse({
      user_role: userRole,
      current_screen: 'employee-task-detail',
      user_message: prompt,
      screen_data: JSON.stringify({ instanceId: this.instanceId(), fields: fields.map((f: any) => f.name) })
    }).subscribe({
      next: (res) => {
        try {
          const jsonMatch = res.reply.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON found');
          const filled: Record<string, any> = JSON.parse(jsonMatch[0]);
          fields.forEach((f: any) => {
            if (f.name in filled) {
              if (f.type === 'boolean') {
                const v = String(filled[f.name]).toLowerCase();
                this.formData[f.name] = v === 'true' || v === 'sí' || v === 'si' || v === 'confirmado' || v === 'aprobado';
              } else if (f.type === 'number') {
                this.formData[f.name] = Number(filled[f.name]) || 0;
              } else if (f.type === 'grid') {
                this.formData[f.name] = this.normalizeGridRows(filled[f.name], f.columns || []);
              } else {
                this.formData[f.name] = String(filled[f.name]);
              }
            }
          });
          this.toast.success('Sugerencias de IA aplicadas al formulario');
        } catch {
          this.toast.error('La IA no devolvió un formato válido. Intenta de nuevo.');
        }
        this.isAiLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al consultar la IA. Intenta de nuevo.');
        this.isAiLoading.set(false);
      }
    });
  }

  nlpAutofill(): void {
    const text = this.nlpText().trim();
    if (!text) return;
    const details = this.taskDetails();
    if (!details) return;
    const fields: any[] = details.formSchemaJson?.fields ?? [];
    if (fields.length === 0) { this.toast.error('El formulario no tiene campos definidos.'); return; }

    const fieldDescriptions = fields.map((f: any) => {
      if (f.type === 'grid' && f.columns?.length) {
        return `- ${f.name} (tipo: grid, array de objetos, las claves de cada objeto deben ser EXACTAMENTE: ${f.columns.map((c: string) => '"' + c.trim() + '"').join(', ')})`;
      }
      return `- ${f.name} (tipo: ${f.type || 'texto'})`;
    }).join('\n');
    const prompt = `Extrae información del siguiente texto para completar un formulario de gestión.\n\n` +
      `Texto del usuario: "${text}"\n\n` +
      `Campos a completar:\n${fieldDescriptions}\n\n` +
      `Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones) donde las claves sean los nombres exactos de los campos y los valores correspondan a la información extraída del texto. ` +
      `Para campos de tipo 'grid', el valor debe ser un array de objetos donde las claves de cada objeto sean EXACTAMENTE los nombres de columna indicados. ` +
      `Para campos booleanos usa true o false. Para campos numéricos usa números.`;

    const userRole = this.authService.getCurrentUserRole() || 'employee';
    this.isNlpLoading.set(true);

    this.aiChatService.getChatResponse({
      user_role: userRole,
      current_screen: 'employee-task-detail',
      user_message: prompt,
      screen_data: JSON.stringify({ instanceId: this.instanceId(), fields: fields.map((f: any) => f.name) })
    }).subscribe({
      next: (res) => {
        try {
          const jsonMatch = res.reply.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON found');
          const filled: Record<string, any> = JSON.parse(jsonMatch[0]);
          fields.forEach((f: any) => {
            if (f.name in filled) {
              if (f.type === 'boolean') {
                const v = String(filled[f.name]).toLowerCase();
                this.formData[f.name] = v === 'true' || v === 'sí' || v === 'si' || v === 'confirmado' || v === 'aprobado';
              } else if (f.type === 'number') {
                this.formData[f.name] = Number(filled[f.name]) || 0;
              } else if (f.type === 'grid') {
                this.formData[f.name] = this.normalizeGridRows(filled[f.name], f.columns || []);
              } else {
                this.formData[f.name] = String(filled[f.name]);
              }
            }
          });
          this.nlpText.set('');
          this.toast.success('Formulario rellenado a partir del texto');
        } catch {
          this.toast.error('La IA no pudo interpretar el texto. Intenta ser más específico.');
        }
        this.isNlpLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al consultar la IA. Intenta de nuevo.');
        this.isNlpLoading.set(false);
      }
    });
  }

  startNlpVoice(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { this.toast.error('Tu navegador no soporta reconocimiento de voz.'); return; }
    if (this.isListeningNlp()) return;

    const rec = new SR();
    rec.lang = 'es-ES';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    this.isListeningNlp.set(true);

    rec.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      this.nlpText.set(transcript);
      this.isListeningNlp.set(false);
      this.nlpAutofill();
    };
    rec.onerror = () => { this.isListeningNlp.set(false); this.toast.error('Error al capturar audio.'); };
    rec.onend = () => { this.isListeningNlp.set(false); };
    rec.start();
  }

  startVoiceForField(fieldName: string): void {    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { this.toast.error('Tu navegador no soporta reconocimiento de voz.'); return; }
    if (this.listeningField() === fieldName) return;

    const fields: any[] = this.taskDetails()?.formSchemaJson?.fields ?? [];
    const fieldDef = fields.find((f: any) => f.name === fieldName);
    const fieldType: string = fieldDef?.type || 'text';

    const rec = new SR();
    rec.lang = 'es-ES';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    this.listeningField.set(fieldName);

    rec.onresult = (event: any) => {
      const text: string = event.results[0][0].transcript;
      this.listeningField.set(null);

      if (fieldType === 'number') {
        const num = parseFloat(text.replace(/[^0-9.,]/g, '').replace(',', '.'));
        this.formData[fieldName] = isNaN(num) ? 0 : num;
      } else {
        this.formData[fieldName] = text;
      }
      this.toast.success(`Campo rellenado: "${text}"`);
    };
    rec.onerror = () => { this.listeningField.set(null); this.toast.error('Error al capturar audio.'); };
    rec.onend = () => { this.listeningField.set(null); };
    rec.start();
  }

  getStatusText(status: string): string {
    if (!status) return 'Desconocido';
    if (status === 'COMPLETED') return 'Completado';
    if (status === 'ACTIVE' || status === 'PENDING') return 'Esperando Acción';
    return status;
  }

  hasKeys(obj: any): boolean {
    return obj && Object.keys(obj).length > 0;
  }

  goBack(): void {
    this.router.navigate(['/app/employee/inbox']);
  }

  private normalizeGridRows(aiValue: any, schemaColumns: string[]): Record<string, string>[] {
    const rawRows = Array.isArray(aiValue) ? aiValue : [];
    const cols = schemaColumns.map((c: string) => c.trim());
    return rawRows.map((row: any) => {
      const normalized: Record<string, string> = {};
      // Start with all schema columns, try to find matching AI key (case-insensitive)
      cols.forEach(col => {
        const aiKey = Object.keys(row).find(k => k.trim().toLowerCase() === col.toLowerCase());
        normalized[col] = aiKey !== undefined ? String(row[aiKey] ?? '') : '';
      });
      // Also include any AI keys that didn't match any schema column (preserves extra data)
      Object.keys(row).forEach(aiKey => {
        const alreadyMapped = cols.some(col => aiKey.trim().toLowerCase() === col.toLowerCase());
        if (!alreadyMapped) {
          normalized[aiKey.trim()] = String(row[aiKey] ?? '');
        }
      });
      return normalized;
    });
  }

  addGridRow(fieldName: string, columns: string[]): void {
    if (!this.formData[fieldName]) this.formData[fieldName] = [];
    const emptyRow: Record<string, string> = {};
    columns.forEach(col => emptyRow[col] = '');
    this.formData[fieldName] = [...this.formData[fieldName], emptyRow];
  }

  removeGridRow(fieldName: string, rowIndex: number): void {
    this.formData[fieldName] = (this.formData[fieldName] as any[]).filter((_, i) => i !== rowIndex);
  }
}
