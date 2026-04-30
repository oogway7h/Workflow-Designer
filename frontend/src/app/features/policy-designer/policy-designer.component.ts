import {
  Component,
  inject,
  signal,
  OnInit,
  computed,
  NgZone,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
import { PolicyService } from '../../core/services/policy.service';
import { DesignerPolicyService } from '../../core/services/designer-policy.service';
import { AiChatService } from '../../core/services/ai-chat.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { WebsocketService } from '../../core/services/websocket.service';
import { VoiceContextService } from '../../core/services/voice-context.service';
import { PolicyActionsService } from '../../core/services/policy-actions.service';
import { Subscription } from 'rxjs';
import { Policy, Department, FormField, User } from '../../core/models';

export interface FormSchema {
  fields: FormField[];
}

export interface ActivityNode {
  uuid: string;
  name?: string;
  description: string;
  state: string;
  formSchemaJson?: FormSchema;
  x?: number;
  y?: number;
  laneId?: string;
}

export interface Transition {
  sourceActivityId: string;
  targetActivityId: string;
  condition?: string;
  conditionDescription?: string;
  sourceAnchor?: 'top' | 'bottom' | 'left' | 'right';
  targetAnchor?: 'top' | 'bottom' | 'left' | 'right';
  cpOffsetX?: number;
  cpOffsetY?: number;
  /** true = flujo de objeto (línea punteada UML 2.5) */
  dashed?: boolean;
}
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import {
  LucideAngularModule,Plus,Trash2,X,Play,Square,Save,ChevronLeft,FileText,MousePointer2,Cable,Columns3,XCircle,Share2
} from 'lucide-angular';

import { Role } from '../../core/models';
import { RoleService } from '../../core/services/role.service';

// --- Node type enum for UML shapes ---
export type UmlNodeType = 'INITIAL' | 'FINAL' | 'ACTIVITY' | 'DECISION' | 'FORK' | 'OBJECT' | 'SIGNAL';

export interface CanvasNode {
  uuid: string;
  name?: string;
  description: string;
  state: string;
  formSchemaJson?: FormSchema;
  x: number;
  y: number;
  laneId: string;
}

export interface Lane {
  id: string;
  name: string;
  x: number;
  width: number;
}

interface ConnLine {
  id: string;
  path: string;
  labelX: number;
  labelY: number;
  condition: string;
  midX: number;
  midY: number;
  sourceNodeId: string;
  targetNodeId: string;
  dashed: boolean;
}

type EditorTool = 'select' | 'connect';

/** UUID fallback for non-HTTPS / older browsers where crypto.randomUUID may be absent */
function genUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Helpers for per-type dimensions
function nodeDims(state: string): { w: number; h: number } {
  switch (state) {
    case 'INITIAL': return { w: 32, h: 32 };
    case 'FINAL':   return { w: 32, h: 32 };
    case 'DECISION': return { w: 90, h: 70 };
    case 'FORK':    return { w: 160, h: 12 };
    case 'CONNECT' :return {w: 32,h:32};
    case 'OBJECT':  return { w: 140, h: 50 };
    case 'SIGNAL':  return { w: 160, h: 50 };
    default:        return { w: 176, h: 64 }; // ACTIVITY / APPROVAL
  }
}

function anchorPoints(node: CanvasNode): { top: {x:number,y:number}; bottom: {x:number,y:number}; left: {x:number,y:number}; right: {x:number,y:number} } {
  const d = nodeDims(node.state);
  const cx = node.x + d.w / 2;
  const cy = node.y + d.h / 2;
  return {
    top:    { x: cx, y: node.y },
    bottom: { x: cx, y: node.y + d.h },
    left:   { x: node.x, y: cy },
    right:  { x: node.x + d.w, y: cy },
  };
}

function bestAnchors(
  src: CanvasNode,
  tgt: CanvasNode,
  forceFrom?: 'top' | 'bottom' | 'left' | 'right',
  forceTo?: 'top' | 'bottom' | 'left' | 'right'
): { from: {x:number,y:number}; to: {x:number,y:number} } {
  const sa = anchorPoints(src);
  const ta = anchorPoints(tgt);
  if (forceFrom && forceTo) return { from: sa[forceFrom], to: ta[forceTo] };
  if (forceFrom) {
    const ds = nodeDims(src.state);
    const dt = nodeDims(tgt.state);
    const sCx = src.x + ds.w / 2; const sCy = src.y + ds.h / 2;
    const tCx = tgt.x + dt.w / 2; const tCy = tgt.y + dt.h / 2;
    const dx = tCx - sCx; const dy = tCy - sCy;
    let to: {x:number,y:number};
    if (Math.abs(dy) >= Math.abs(dx)) to = dy > 0 ? ta.top : ta.bottom;
    else to = dx > 0 ? ta.left : ta.right;
    return { from: sa[forceFrom], to };
  }
  if (forceTo) {
    const ds = nodeDims(src.state);
    const dt = nodeDims(tgt.state);
    const sCx = src.x + ds.w / 2; const sCy = src.y + ds.h / 2;
    const tCx = tgt.x + dt.w / 2; const tCy = tgt.y + dt.h / 2;
    const dx = tCx - sCx; const dy = tCy - sCy;
    let from: {x:number,y:number};
    if (Math.abs(dy) >= Math.abs(dx)) from = dy > 0 ? sa.bottom : sa.top;
    else from = dx > 0 ? sa.right : sa.left;
    return { from, to: ta[forceTo] };
  }
  const ds = nodeDims(src.state);
  const dt = nodeDims(tgt.state);
  const sCx = src.x + ds.w / 2; const sCy = src.y + ds.h / 2;
  const tCx = tgt.x + dt.w / 2; const tCy = tgt.y + dt.h / 2;
  const dx = tCx - sCx; const dy = tCy - sCy;
  let from: {x:number,y:number}; let to: {x:number,y:number};
  if (Math.abs(dy) >= Math.abs(dx)) {
    if (dy > 0) { from = sa.bottom; to = ta.top; }
    else        { from = sa.top;    to = ta.bottom; }
  } else {
    if (dx > 0) { from = sa.right; to = ta.left; }
    else        { from = sa.left;  to = ta.right; }
  }
  return { from, to };
}

import { LoaderComponent } from '../../shared/components/loader/loader.component';

@Component({
  selector: 'app-policy-designer',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, CdkDrag, LoaderComponent],
  template: `
    <div class="flex h-full flex-col">
      @if (!selectedPolicy()) {
        <!-- ============ POLICY LIST VIEW ============ -->
        <div class="p-6">
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-semibold text-foreground">Politicas</h1>
              <p class="mt-1 text-sm text-muted-foreground">Define los procesos de negocio como diagramas de actividades UML</p>
            </div>
            <button (click)="openCreatePolicy()"
              class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <lucide-icon [img]="Plus" [size]="16" /> Nueva Politica
            </button>
          </div>
          
          @if (isLoading()) {
            <div class="flex items-center justify-center py-10">
               <app-loader text="Cargando diagramas..."></app-loader>
            </div>
          } @else {
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (policy of policies(); track policy.uuid) {
              <div class="group cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
                (click)="selectPolicy(policy)">
                <div class="mb-3 flex items-start justify-between">
                  <lucide-icon [img]="FileText" [size]="20" class="text-primary" />
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" [class]="getStateBadgeClass(policy.state)">{{ policy.state }}</span>
                </div>
                <h3 class="mb-1 text-sm font-semibold text-foreground line-clamp-2">{{ policy.name || policy.description }}</h3>
                <p class="text-xs text-muted-foreground mb-1">{{ policy.activityNodes.length }} nodos &middot; {{ policy.transitions.length }} transiciones</p>
                <p class="text-xs text-muted-foreground">Gestor: {{ getManagerName(policy.managerId) }}</p>
                <div class="mt-3 flex gap-1">
                  @if (policy.ownerId === authService.currentUser()?.uuid) {
                    <button (click)="deletePolicy(policy.uuid); $event.stopPropagation()"
                      class="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar">
                      <lucide-icon [img]="Trash2" [size]="14" />
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <div class="col-span-full rounded-xl border-2 border-dashed border-border py-16 text-center">
                <lucide-icon [img]="FileText" [size]="40" class="mx-auto mb-3 text-muted-foreground/50" />
                <p class="text-sm text-muted-foreground">No hay politicas. Crea la primera.</p>
              </div>
            }
          </div>
          }

          <!-- ============ SHARED WITH ME ============ -->
          @if (sharedPolicies().length > 0) {
            <div class="mt-8 mb-4">
              <h2 class="text-xl font-semibold text-foreground">Compartidos conmigo</h2>
              <p class="mt-1 text-sm text-muted-foreground">Politiicas donde has sido agregado como colaborador</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (policy of sharedPolicies(); track policy.uuid) {
                <div class="group cursor-pointer rounded-xl border border-border bg-muted/30 p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
                  (click)="selectPolicy(policy)">
                  <div class="mb-3 flex items-start justify-between">
                    <lucide-icon [img]="FileText" [size]="20" class="text-primary" />
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" [class]="getStateBadgeClass(policy.state)">{{ policy.state }}</span>
                  </div>
                  <h3 class="mb-1 text-sm font-semibold text-foreground line-clamp-2">{{ policy.name || policy.description }}</h3>
                  <p class="text-xs text-muted-foreground mb-1">{{ policy.activityNodes.length }} nodos &middot; {{ policy.transitions.length }} transiciones</p>
                  <p class="text-xs text-muted-foreground">Gestor: {{ getManagerName(policy.managerId) }}</p>
                  <p class="text-[10px] text-primary mt-2 font-medium">Solo lectura / Colaborador</p>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <!-- ============ CANVAS EDITOR VIEW ============ -->
        <div class="flex flex-1 flex-col overflow-hidden">
          <!-- Top Toolbar -->
          <div class="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
            <button (click)="backToList()" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground" title="Volver">
              <lucide-icon [img]="ChevronLeft" [size]="18" />
            </button>
            <div class="mr-2 border-r border-border pr-3">
              <h2 class="text-sm font-semibold text-foreground truncate max-w-[200px]">{{ selectedPolicy()!.name || selectedPolicy()!.description }}</h2>
              <div class="flex items-center gap-2">
                <span class="text-[10px] rounded-full px-1.5 py-0.5 font-semibold uppercase" [class]="getStateBadgeClass(selectedPolicy()!.state)">{{ selectedPolicy()!.state }}</span>
                <span class="text-[10px] text-muted-foreground">Gestor: {{ getManagerName(selectedPolicy()!.managerId) }}</span>
              </div>
            </div>

            @if (selectedPolicy()?.ownerId === authService.currentUser()?.uuid) {
              <button (click)="openShareModal()" class="inline-flex h-8 items-center gap-2 rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground hover:bg-accent hover:text-foreground mr-2">
                <lucide-icon [img]="Share2" [size]="14" /> Compartir
              </button>
            }

            <!-- Tool toggle -->
            <div class="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
              <button (click)="activeTool.set('select')"
                class="inline-flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors"
                [class.bg-background]="activeTool() === 'select'" [class.shadow-sm]="activeTool() === 'select'"
                [class.text-foreground]="activeTool() === 'select'" [class.text-muted-foreground]="activeTool() !== 'select'"
                title="Seleccionar / Mover">
                <lucide-icon [img]="MousePointer2" [size]="15" />
              </button>
              <button (click)="activeTool.set('connect')"
                class="inline-flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors"
                [class.bg-background]="activeTool() === 'connect'" [class.shadow-sm]="activeTool() === 'connect'"
                [class.text-foreground]="activeTool() === 'connect'" [class.text-muted-foreground]="activeTool() !== 'connect'"
                title="Conectar nodos">
                <lucide-icon [img]="Cable" [size]="15" />
              </button>
            </div>

            <div class="h-5 w-px bg-border"></div>
            <button (click)="addLane()" class="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
              <lucide-icon [img]="Columns3" [size]="14" /> Calle
            </button>

            <div class="flex-1"></div>

            @if (selectedPolicy()!.state === 'DRAFT') {
              <button (click)="changeState('ACTIVE')" class="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">
                <lucide-icon [img]="Play" [size]="12" /> Publicar
              </button>
            }
            @if (selectedPolicy()!.state === 'ACTIVE') {
              <button (click)="changeState('INACTIVE')" class="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 transition-colors">
                <lucide-icon [img]="SquareIcon" [size]="12" /> Desactivar
              </button>
            }
            @if (selectedPolicy()!.state === 'INACTIVE') {
              <button (click)="changeState('ACTIVE')" class="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">
                <lucide-icon [img]="Play" [size]="12" /> Activar
              </button>
            }
            <button (click)="createForm() " class="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
              <lucide-icon [img]="FileText" [size]="14" /> Crear formulario
            </button>
            <button (click)="saveDiagram()" class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <lucide-icon [img]="Save" [size]="14" /> Guardar
            </button>
          </div>

          <!-- Editor body: palette + canvas -->
          <div class="flex flex-1 overflow-hidden">
            <!-- ===== Component Palette (left sidebar) ===== -->
            <div class="w-48 shrink-0 border-r border-border bg-card overflow-y-auto">
              <div class="px-3 py-2 border-b border-border">
                <span class="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Componentes UML</span>
              </div>
              <div class="p-2 space-y-1.5">
                <!-- Inicio -->
                <button (click)="addNodeOfType('INITIAL')"
                  class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent transition-colors group">
                  <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor" class="text-foreground"/></svg>
                  <div>
                    <div class="font-semibold text-foreground">Inicio</div>
                    <div class="text-[10px] text-muted-foreground">Nodo inicial</div>
                  </div>
                </button>
                <!-- Actividad -->
                <button (click)="addNodeOfType('ACTIVITY')"
                  class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent transition-colors group">
                  <svg width="24" height="24" viewBox="0 0 40 28"><rect x="1" y="1" width="38" height="26" rx="6" fill="#FEF9C3" stroke="#CA8A04" stroke-width="2"/></svg>
                  <div>
                    <div class="font-semibold text-foreground">Actividad</div>
                    <div class="text-[10px] text-muted-foreground">Accion del proceso</div>
                  </div>
                </button>
                <!-- Decision -->
                <button (click)="addNodeOfType('DECISION')"
                  class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent transition-colors group">
                  <svg width="24" height="24" viewBox="0 0 28 28"><polygon points="14,2 26,14 14,26 2,14" fill="#FEF9C3" stroke="#CA8A04" stroke-width="2"/></svg>
                  <div>
                    <div class="font-semibold text-foreground">Decision</div>
                    <div class="text-[10px] text-muted-foreground">Bifurcacion condicional</div>
                  </div>
                </button>
                <!-- Fork / Join -->
                <button (click)="addNodeOfType('FORK')"
                  class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent transition-colors group">
                  <svg width="24" height="24" viewBox="0 0 40 12"><rect x="1" y="2" width="38" height="8" rx="2" fill="currentColor" class="text-foreground"/></svg>
                  <div>
                    <div class="font-semibold text-foreground">Fork / Join</div>
                    <div class="text-[10px] text-muted-foreground">Barra de sincronizacion</div>
                  </div>
                </button>
                <!-- Estado (Object Node) -->
                <button (click)="addNodeOfType('OBJECT')"
                  class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent transition-colors group">
                  <svg width="24" height="24" viewBox="0 0 40 28"><rect x="1" y="1" width="38" height="26" rx="6" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                  <div>
                    <div class="font-semibold text-foreground">Estado</div>
                    <div class="text-[10px] text-muted-foreground">Nodo de objeto / estado</div>
                  </div>
                </button>
                <!-- Enviar señal -->
                <button (click)="addNodeOfType('SIGNAL')"
                  class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent transition-colors group">
                  <svg width="24" height="24" viewBox="0 0 44 28"><polygon points="1,1 35,1 43,14 35,27 1,27" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                  <div>
                    <div class="font-semibold text-foreground">Enviar Señal</div>
                    <div class="text-[10px] text-muted-foreground">Enviar objeto o señal</div>
                  </div>
                </button>
                <!-- Fin -->
                <button (click)="addNodeOfType('FINAL')"
                  class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent transition-colors group">
                  <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" class="text-foreground"/><circle cx="12" cy="12" r="6" fill="currentColor" class="text-foreground"/></svg>
                  <div>
                    <div class="font-semibold text-foreground">Fin</div>
                    <div class="text-[10px] text-muted-foreground">Nodo final</div>
                  </div>
                </button>
                <!-- Lines section -->
                <div class="mt-1 pt-2 border-t border-border">
                  <span class="text-[10px] font-bold uppercase text-muted-foreground tracking-wider px-1">Líneas</span>
                  <button (click)="activeTool.set('connect'); connectionDashed = false"
                    class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent transition-colors mt-1"
                    [class.bg-accent]="activeTool() === 'connect' && !connectionDashed">
                    <svg width="24" height="12" viewBox="0 0 40 12">
                      <line x1="2" y1="6" x2="38" y2="6" stroke="currentColor" stroke-width="2"
                        marker-end="url(#ah-sidebar)" />
                      <defs><marker id="ah-sidebar" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor"/></marker></defs>
                    </svg>
                    <div>
                      <div class="font-semibold text-foreground">Flujo de control</div>
                      <div class="text-[10px] text-muted-foreground">Línea sólida</div>
                    </div>
                  </button>
                  <button (click)="activeTool.set('connect'); connectionDashed = true"
                    class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent transition-colors"
                    [class.bg-accent]="activeTool() === 'connect' && connectionDashed">
                    <svg width="24" height="12" viewBox="0 0 40 12">
                      <line x1="2" y1="6" x2="38" y2="6" stroke="currentColor" stroke-width="2" stroke-dasharray="6,3"
                        marker-end="url(#ah-sidebar-d)" />
                      <defs><marker id="ah-sidebar-d" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor"/></marker></defs>
                    </svg>
                    <div>
                      <div class="font-semibold text-foreground">Flujo de objeto</div>
                      <div class="text-[10px] text-muted-foreground">Línea punteada</div>
                    </div>
                  </button>
                </div>
              </div>
              <div class="px-3 py-2 border-t border-border mt-2">
                <span class="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Ayuda</span>
              </div>
              <div class="px-3 py-1 text-[10px] text-muted-foreground space-y-1">
                <p><strong>Doble clic</strong> en nodo para editar</p>
                <p><strong>Herramienta Conectar</strong>: clic origen → clic destino</p>
                <p><strong>Clic en flecha</strong> para seleccionarla</p>
                <p><strong>Arrastra el punto morado</strong> para curvar la línea</p>
                <p><strong>Puntos morados/verdes</strong> en nodos cambian el ancla</p>
                <p><strong>Botón rojo ×</strong> elimina con confirmación</p>
                <p><strong>Arrastra</strong> para mover nodos</p>
              </div>
            </div>

            <!-- ===== Canvas ===== -->
            <div class="flex-1 overflow-auto relative"
              style="background-color: hsl(var(--muted) / 0.3); background-image: radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px); background-size: 20px 20px;"
              (click)="onCanvasClick($event)"
              (mousemove)="onGlobalMouseMove($event)"
              (mouseup)="endCpDrag()">

              <!-- ===== Collaborator Cursors ===== -->
              @for (cursor of getActiveCursors(); track cursor.id) {
                <div class="absolute pointer-events-none z-[100] flex flex-col items-start transition-all duration-100 ease-linear"
                  [style.left.px]="cursor.x" [style.top.px]="cursor.y">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5" class="text-blue-500 drop-shadow-md -ml-1 -mt-1 transform -rotate-12">
                    <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
                  </svg>
                  <span class="rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm whitespace-nowrap">
                    {{ cursor.name }}
                  </span>
                </div>
              }

              <!-- SVG layer -->
              <svg class="absolute inset-0 pointer-events-none" [attr.width]="canvasWidth()" [attr.height]="canvasHeight()" style="z-index: 1;">
                <defs>
                  <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#333" class="dark:fill-gray-300" />
                  </marker>
                </defs>
              <!-- Connections -->
                @for (conn of connectionLines(); track conn.id) {
                  <g>
                    <!-- Invisible wider hitbox -->
                    <path [attr.d]="conn.path" stroke="transparent" stroke-width="14" fill="none"
                      class="pointer-events-auto cursor-pointer" (click)="selectConnection(conn.id); $event.stopPropagation()" />
                    <!-- Visible arrow -->
                    <path [attr.d]="conn.path"
                      [attr.stroke]="selectedConnId() === conn.id ? '#6366f1' : (conn.dashed ? 'currentColor' : '#555')"
                      [attr.stroke-width]="selectedConnId() === conn.id ? 2.5 : 2"
                      [attr.stroke-dasharray]="conn.dashed ? '8,4' : null"
                      fill="none" marker-end="url(#arrowhead)"
                      class="pointer-events-none dark:stroke-gray-400" />
                    @if (conn.condition) {
                      <rect [attr.x]="conn.labelX - 4" [attr.y]="conn.labelY - 12" [attr.width]="conn.condition.length * 6.5 + 16" height="16" rx="3" fill="white" stroke="#ddd" stroke-width="1"
                        class="pointer-events-none dark:fill-gray-800 dark:stroke-gray-600" />
                      <text [attr.x]="conn.labelX + 4" [attr.y]="conn.labelY - 1" font-size="10" font-family="monospace" fill="#666"
                        class="pointer-events-none dark:fill-gray-300">[{{ conn.condition }}]</text>
                    }
                  </g>
                }
                <!-- Preview line while connecting -->
                @if (connectingFrom() && connectPreview()) {
                  <line [attr.x1]="getNodeCenter(connectingFrom()!).x" [attr.y1]="getNodeCenter(connectingFrom()!).y"
                    [attr.x2]="connectPreview()!.x" [attr.y2]="connectPreview()!.y"
                    stroke="#888" stroke-width="1.5" stroke-dasharray="6 3" class="pointer-events-none" />
                }
              </svg>

              <!-- Swim Lanes -->
              @for (lane of canvasLanes(); track lane.id) {
                <div class="absolute top-0 border-r-2 border-primary/40"
                  [style.left.px]="lane.x" [style.width.px]="lane.width" [style.height.px]="canvasHeight()" style="z-index: 0; background: linear-gradient(to bottom, rgba(99,102,241,0.04) 0%, transparent 60px);">
                  <div class="sticky top-0 flex items-center justify-between border-b-2 border-primary/30 bg-primary/10 px-3 py-2 z-10 backdrop-blur-sm shadow-sm">
                    <span class="text-xs font-bold uppercase tracking-wide text-primary truncate">{{ lane.name }}</span>
                    <button (click)="removeLane(lane.id); $event.stopPropagation()"
                      class="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors">
                      <lucide-icon [img]="XCircle" [size]="13" />
                    </button>
                  </div>
                </div>
              }

              <!-- ===== Draggable Nodes ===== -->
              @for (node of canvasNodes(); track node.uuid) {
                <div cdkDrag [cdkDragFreeDragPosition]="{ x: node.x, y: node.y }"
                  (cdkDragEnded)="onNodeDragEnd($event, node)" 
                  (cdkDragMoved)="onNodeDragMoved($event, node)"
                  (click)="onNodeClick(node, $event)"
                  (dblclick)="editNode(node); $event.stopPropagation()"
                  class="absolute cursor-grab active:cursor-grabbing select-none group" [style.z-index]="2" style="top:0;left:0;">

                  @switch (node.state) {
                    <!-- ● INITIAL: filled black circle -->
                    @case ('INITIAL') {
                      <div class="relative flex items-center justify-center" style="width:32px;height:32px;">
                        <svg width="32" height="32" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="currentColor" class="text-foreground" />
                        </svg>
                        <button (click)="removeNode(node.uuid); $event.stopPropagation()"
                          class="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                      </div>
                    }

                    <!-- ◉ FINAL: circle with inner dot -->
                    @case ('FINAL') {
                      <div class="relative flex items-center justify-center" style="width:32px;height:32px;">
                        <svg width="32" height="32" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="3" class="text-foreground" />
                          <circle cx="16" cy="16" r="7" fill="currentColor" class="text-foreground" />
                        </svg>
                        <button (click)="removeNode(node.uuid); $event.stopPropagation()"
                          class="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                      </div>
                    }

                    <!-- ◇ DECISION: diamond -->
                    @case ('DECISION') {
                      <div class="relative" style="width:90px;height:70px;">
                        <svg width="90" height="70" viewBox="0 0 90 70">
                          <polygon points="45,4 86,35 45,66 4,35" fill="#FEF9C3" stroke="#CA8A04" stroke-width="2" class="dark:fill-yellow-900/40 dark:stroke-yellow-600" />
                          <text x="45" y="39" text-anchor="middle" font-size="10" font-weight="600" fill="#713F12" class="dark:fill-yellow-300">{{ truncate(node.name || node.description, 12) }}</text>
                        </svg>
                        <button (click)="removeNode(node.uuid); $event.stopPropagation()"
                          class="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                      </div>
                    }

                    <!-- □ OBJECT: plain rounded rectangle (object/state node) -->
                    @case ('OBJECT') {
                      <div class="relative" style="width:140px;height:50px;">
                        <svg width="140" height="50" viewBox="0 0 140 50">
                          <rect x="2" y="2" width="136" height="46" rx="8" fill="none" stroke="currentColor" stroke-width="2" class="text-foreground" />
                          <text x="70" y="31" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor" class="text-foreground">{{ truncate(node.name || node.description, 16) }}</text>
                        </svg>
                        <button (click)="removeNode(node.uuid); $event.stopPropagation()"
                          class="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                      </div>
                    }

                    <!-- ⬠ SIGNAL: pentagon send-signal shape -->
                    @case ('SIGNAL') {
                      <div class="relative" style="width:160px;height:50px;">
                        <svg width="160" height="50" viewBox="0 0 160 50">
                          <polygon points="2,2 130,2 158,25 130,48 2,48" fill="#EFF6FF" stroke="#3B82F6" stroke-width="2" class="dark:fill-blue-900/30 dark:stroke-blue-400" />
                          <text x="66" y="30" text-anchor="middle" font-size="11" font-weight="600" fill="#1D4ED8" class="dark:fill-blue-300">{{ truncate(node.name || node.description, 14) }}</text>
                        </svg>
                        <button (click)="removeNode(node.uuid); $event.stopPropagation()"
                          class="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                      </div>
                    }

                    <!-- ═══ FORK/JOIN: thick bar -->
                    @case ('FORK') {
                      <div class="relative" style="width:160px;height:12px;">
                        <svg width="160" height="12" viewBox="0 0 160 12">
                          <rect x="0" y="1" width="160" height="10" rx="3" fill="currentColor" class="text-foreground" />
                        </svg>
                        <button (click)="removeNode(node.uuid); $event.stopPropagation()"
                          class="absolute -top-3 -right-2 h-4 w-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                      </div>
                    }

                    <!--ACTIVITY / APPROVAL: rounded rectangle (default) -->
                    @default {
                      <div class="relative w-44 rounded-xl border-2 bg-yellow-50 px-3 py-2.5 shadow-md transition-shadow hover:shadow-lg dark:bg-yellow-900/20"
                        [class]="getActivityBorderClass(node.state)"
                        [class.ring-2]="connectingFrom()?.uuid === node.uuid" [class.ring-primary]="connectingFrom()?.uuid === node.uuid">
                        <div class="flex items-center justify-between mb-1">
                          <span class="text-[9px] font-bold uppercase text-yellow-700 dark:text-yellow-400">{{ node.state }}</span>
                          <button (click)="removeNode(node.uuid); $event.stopPropagation()"
                            class="h-4 w-4 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">
                            <lucide-icon [img]="Trash2" [size]="11" />
                          </button>
                        </div>
                        <p class="text-xs font-semibold text-foreground leading-tight">{{ node.name || node.description }}</p>
                        @if (node.formSchemaJson?.fields?.length) {
                          <div class="mt-1.5 border-t border-yellow-200 dark:border-yellow-700 pt-1 space-y-0.5">
                            @for (field of node.formSchemaJson?.fields; track field.name) {
                              <div class="text-[9px] text-muted-foreground"><span class="font-mono">{{ field.name }}</span>: <span class="italic">{{ field.type }}</span></div>
                            }
                          </div>
                        }
                      </div>
                    }
                  }
                </div>
              }

              <!-- SVG overlay — handles and anchor dots (above nodes, rendered last) -->
              @if (selectedConnId()) {
                @for (conn of connectionLines(); track conn.id) {
                  @if (conn.id === selectedConnId()) {
                    <svg class="absolute inset-0 pointer-events-none" [attr.width]="canvasWidth()" [attr.height]="canvasHeight()" style="z-index: 10;">
                      <!-- Midpoint drag handle -->
                      <circle [attr.cx]="conn.midX" [attr.cy]="conn.midY" r="7"
                        fill="#6366f1" stroke="white" stroke-width="2"
                        class="pointer-events-auto cursor-move"
                        (mousedown)="startCpDrag(conn.id, $event); $event.stopPropagation()" />
                      <!-- Delete button -->
                      <g class="pointer-events-auto cursor-pointer"
                        (click)="confirmRemoveTransition(conn.id); $event.stopPropagation()">
                        <circle [attr.cx]="conn.midX + 18" [attr.cy]="conn.midY - 18" r="9"
                          fill="#ef4444" stroke="white" stroke-width="1.5" />
                        <text [attr.x]="conn.midX + 18" [attr.y]="conn.midY - 13"
                          text-anchor="middle" font-size="13" font-weight="bold" fill="white"
                          class="pointer-events-none">×</text>
                      </g>
                      <!-- Toggle dashed button -->
                      <g class="pointer-events-auto cursor-pointer"
                        (click)="toggleTransitionDashed(conn.id); $event.stopPropagation()"
                        title="Cambiar a flujo de objeto (línea punteada)">
                        <circle [attr.cx]="conn.midX - 18" [attr.cy]="conn.midY - 18" r="9"
                          [attr.fill]="conn.dashed ? '#3B82F6' : '#e5e7eb'" stroke="white" stroke-width="1.5" />
                        <text [attr.x]="conn.midX - 18" [attr.y]="conn.midY - 13"
                          text-anchor="middle" font-size="9" font-weight="bold" fill="white"
                          class="pointer-events-none">- -</text>
                      </g>
                      <!-- Anchor selectors on source node (indigo) -->
                      @for (ap of getNodeAnchors(conn.sourceNodeId); track ap.name) {
                        <circle [attr.cx]="ap.x" [attr.cy]="ap.y" r="6"
                          [attr.fill]="getTransitionSourceAnchor(conn.id) === ap.name ? '#6366f1' : 'white'"
                          stroke="#6366f1" stroke-width="2.5"
                          class="pointer-events-auto cursor-pointer"
                          (click)="setAnchor(conn.id, 'source', ap.name); $event.stopPropagation()" />
                      }
                      <!-- Anchor selectors on target node (emerald) -->
                      @for (ap of getNodeAnchors(conn.targetNodeId); track ap.name) {
                        <circle [attr.cx]="ap.x" [attr.cy]="ap.y" r="6"
                          [attr.fill]="getTransitionTargetAnchor(conn.id) === ap.name ? '#10b981' : 'white'"
                          stroke="#10b981" stroke-width="2.5"
                          class="pointer-events-auto cursor-pointer"
                          (click)="setAnchor(conn.id, 'target', ap.name); $event.stopPropagation()" />
                      }
                    </svg>
                  }
                }
              }
            </div>
          </div>
        </div>
      }

      <!-- ============ Create Policy Modal ============ -->
      @if (showCreateModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" (click)="closeCreateModal()">
          <div class="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg" (click)="$event.stopPropagation()">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-foreground">Nueva Politica</h2>
              <button (click)="closeCreateModal()" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                <lucide-icon [img]="XIcon" [size]="18" />
              </button>
            </div>
            <form (ngSubmit)="createPolicy()">
              <div class="space-y-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-foreground">Nombre</label>
                  <input type="text" [(ngModel)]="newPolicyName" name="name"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Nombre de la politica..." required />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-foreground">Descripcion</label>
                  <input type="text" [(ngModel)]="newPolicyDesc" name="description"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Proceso de aprobacion de compras..." required />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-foreground">Gestor Responsable</label>
                  <select [(ngModel)]="selectedManagerId" name="managerId"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" required>
                    <option value="" disabled>Selecciona un gestor...</option>
                    @if (managerUsers().length === 0) {
                      <option value="" disabled>Cargando gestores...</option>
                    }
                    @for (user of managerUsers(); track user.uuid) {
                      <option [value]="user.uuid">{{ user.name }} {{ user.lastname }} ({{ user.email }})</option>
                    }
                  </select>
                </div>
              </div>
              <div class="mt-4 flex justify-end gap-2">
                <button type="button" (click)="closeCreateModal()" class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Cancelar</button>
                <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Crear</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ============ Share Policy Modal ============ -->
      @if (showShareModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" (click)="showShareModal.set(false)">
          <div class="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg" (click)="$event.stopPropagation()">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-foreground">Compartir Politica</h2>
              <button (click)="showShareModal.set(false)" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                <lucide-icon [img]="XIcon" [size]="18" />
              </button>
            </div>
            <div class="space-y-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-foreground">Seleccionar Colaboradores</label>
                <select multiple [(ngModel)]="selectedCollaborators" name="collaborators"
                  class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" style="min-height: 120px">
                  @for (user of users(); track user.uuid) {
                    @if (user.uuid !== authService.currentUser()?.uuid) {
                      <option [value]="user.uuid">{{ user.name }} {{ user.lastname }} ({{ user.email }})</option>
                    }
                  }
                </select>
                <p class="text-[10px] text-muted-foreground mt-1">Usa Ctrl / Cmd para seleccionar varios</p>
              </div>
            </div>
            <div class="mt-4 flex justify-end gap-2">
              <button type="button" (click)="showShareModal.set(false)" class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Cancelar</button>
              <button type="button" (click)="sharePolicyConfirm()" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Guardar</button>
            </div>
          </div>
        </div>
      }

      <!-- ============ Node Editor Modal ============ -->
      @if (showNodeModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" (click)="showNodeModal.set(false)">
          <div class="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg" (click)="$event.stopPropagation()">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-foreground">{{ editingNodeUuid ? 'Editar' : 'Nuevo' }} Nodo</h2>
              <button (click)="showNodeModal.set(false)" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                <lucide-icon [img]="XIcon" [size]="18" />
              </button>
            </div>
            <form (ngSubmit)="saveNode()">
              <div class="space-y-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-foreground">Nombre de la Tarea/Actividad</label>
                  <input type="text" [(ngModel)]="nodeForm.name" name="name"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" required />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-foreground">Descripcion</label>
                  <input type="text" [(ngModel)]="nodeForm.description" name="description"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" required />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-foreground">Tipo de Nodo</label>
                  <select [(ngModel)]="nodeForm.state" name="state"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="INITIAL">Inicio (circulo negro)</option>
                    <option value="ACTIVITY">Actividad (rectangulo)</option>
                    <option value="APPROVAL">Aprobacion (rectangulo)</option>
                    <option value="DECISION">Decision (diamante)</option>
                    <option value="FORK">Fork / Join (barra)</option>
                    <option value="OBJECT">Estado (rectangulo vacio)</option>
                    <option value="SIGNAL">Enviar Señal (pentagono)</option>
                    <option value="FINAL">Fin (circulo con punto)</option>
                  </select>
                </div>
                @if (nodeForm.state === 'ACTIVITY' || nodeForm.state === 'APPROVAL') {
                  <div>
                    <label class="mb-1 block text-sm font-medium text-foreground">Campos del Formulario
                      <span class="font-normal text-muted-foreground">(uno por linea: nombre:tipo)</span></label>
                    <textarea [(ngModel)]="nodeForm.fieldsText" name="fields" rows="3"
                      class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="monto:number&#10;justificacion:text"></textarea>
                  </div>
                }
              </div>
              <div class="mt-4 flex justify-end gap-2">
                <button type="button" (click)="showNodeModal.set(false)" class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Cancelar</button>
                <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">{{ editingNodeUuid ? 'Actualizar' : 'Agregar' }}</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ============ Lane Modal ============ -->
      @if (showLaneModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" (click)="showLaneModal.set(false)">
          <div class="w-full max-w-xs rounded-xl border border-border bg-card p-6 shadow-lg" (click)="$event.stopPropagation()">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-foreground">Nueva Calle</h2>
              <button (click)="showLaneModal.set(false)" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                <lucide-icon [img]="XIcon" [size]="18" />
              </button>
            </div>
            <form (ngSubmit)="saveLane()">
              <label class="mb-1 block text-sm font-medium text-foreground">Nombre</label>
              <input type="text" [(ngModel)]="newLaneName" name="laneName"
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Gerencia, RRHH..." required />
              <div class="mt-4 flex justify-end gap-2">
                <button type="button" (click)="showLaneModal.set(false)" class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Cancelar</button>
                <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Crear</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ============ Form Designer Modal ============ -->
      @if (showFormDesigner()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" (click)="showFormDesigner.set(false)">
          <div class="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-card shadow-lg" (click)="$event.stopPropagation()">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 class="text-lg font-semibold text-foreground">Diseñar Formulario</h2>
                <p class="text-xs text-muted-foreground mt-0.5">Configura los campos que el usuario debera completar al ejecutar la tarea</p>
              </div>
              <button (click)="showFormDesigner.set(false)" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                <lucide-icon [img]="XIcon" [size]="18" />
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              <!-- Activity selector -->
              <div>
                <label class="mb-1 block text-sm font-medium text-foreground">Actividad / Tarea</label>
                <select [(ngModel)]="formDesignerNodeUuid" (ngModelChange)="onFormDesignerNodeChange($event)"
                  class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="" disabled>Selecciona una actividad...</option>
                  @for (node of formDesignerNodes(); track node.uuid) {
                    <option [value]="node.uuid">{{ node.name || node.description }} ({{ node.state }})</option>
                  }
                </select>
              </div>

              @if (formDesignerNodeUuid) {
                <!-- Fields list -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-sm font-medium text-foreground">Campos del formulario</label>
                    <button (click)="addFormField()" type="button"
                      class="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                      <lucide-icon [img]="Plus" [size]="12" /> Agregar campo
                    </button>
                  </div>

                  @if (formDesignerFields().length === 0) {
                    <div class="rounded-lg border-2 border-dashed border-border py-8 text-center">
                      <p class="text-sm text-muted-foreground">Sin campos. Agrega campos para construir el formulario.</p>
                    </div>
                  } @else {
                    <!-- Column headers -->
                    <div class="grid grid-cols-[1fr_140px_60px_40px] gap-2 mb-1.5 px-1">
                      <span class="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Nombre</span>
                      <span class="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Tipo</span>
                      <span class="text-[10px] font-bold uppercase text-muted-foreground tracking-wider text-center">Req.</span>
                      <span></span>
                    </div>
                    <div class="space-y-2">
                      @for (field of formDesignerFields(); track $index) {
                        <div class="grid grid-cols-[1fr_140px_60px_40px] gap-2 items-center rounded-lg border border-border bg-muted/30 p-2">
                          <input type="text" [ngModel]="field.name" (ngModelChange)="updateFormField($index, 'name', $event)"
                            class="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="nombre_campo" />
                          <select [ngModel]="field.type" (ngModelChange)="updateFormField($index, 'type', $event)"
                            class="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                            <option value="string">Texto</option>
                            <option value="number">Numero</option>
                            <option value="boolean">Si / No</option>
                            <option value="date">Fecha</option>
                            <option value="text">Texto largo</option>
                          </select>
                          <div class="flex items-center justify-center">
                            <input type="checkbox" [ngModel]="field.required" (ngModelChange)="updateFormField($index, 'required', $event)"
                              class="h-4 w-4 rounded border-input text-primary focus:ring-ring cursor-pointer" />
                          </div>
                          <button (click)="removeFormField($index)" type="button"
                            class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <lucide-icon [img]="Trash2" [size]="14" />
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button (click)="showFormDesigner.set(false)" type="button"
                class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Cancelar</button>
              <button (click)="saveFormDesigner()" type="button" [disabled]="!formDesignerNodeUuid"
                class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Guardar formulario
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ============ Transition Condition Modal ============ -->
      @if (showConditionModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" (click)="cancelConnection()">
          <div class="w-full max-w-xs rounded-xl border border-border bg-card p-6 shadow-lg" (click)="$event.stopPropagation()">
            <div class="mb-4">
              <h2 class="text-lg font-semibold text-foreground">Transicion</h2>
              <p class="text-xs text-muted-foreground mt-1">{{ getNodeDesc(pendingConnection()?.sourceId || '') }} -> {{ getNodeDesc(pendingConnection()?.targetId || '') }}</p>
            </div>
            <form (ngSubmit)="saveConnection()">
              <label class="mb-1 block text-sm font-medium text-foreground">Condicion <span class="font-normal text-muted-foreground">(opcional, ej: monto > 5000)</span></label>
              <input type="text" [(ngModel)]="connectionCondition" name="condition"
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Si hay, No hay..." />
              <label class="mt-3 flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="connectionDashed" name="dashed" class="rounded border-input" />
                <span class="text-sm text-foreground">Flujo de objeto <span class="text-xs text-muted-foreground">(línea punteada - UML object flow)</span></span>
              </label>
              <div class="mt-4 flex justify-end gap-2">
                <button type="button" (click)="cancelConnection()" class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Cancelar</button>
                <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Conectar</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class PolicyDesignerComponent implements OnInit {
  private readonly policyService = inject(PolicyService);
  private readonly designerPolicyService = inject(DesignerPolicyService);
  private readonly departmentService = inject(DepartmentService);
  private readonly aiChatService = inject(AiChatService);
  private readonly userService = inject(UserService);
  private readonly wsService = inject(WebsocketService);
  private stompSub?: Subscription;
  public readonly authService = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly ngZone = inject(NgZone);
  private readonly voiceContextService = inject(VoiceContextService);
  private readonly policyActionsService = inject(PolicyActionsService);

  constructor() {
    // Voice widget triggers "open create modal"
    effect(() => {
      if (this.policyActionsService.openCreateModal()) {
        this.policyActionsService.openCreateModal.set(false);
        this.openCreatePolicy();
      }
    });
  }

  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly XIcon = X;
  readonly Play = Play;
  readonly SquareIcon = Square;
  readonly Save = Save;
  readonly ChevronLeft = ChevronLeft;
  readonly FileText = FileText;

  isLoading = signal<boolean>(false);
  readonly MousePointer2 = MousePointer2;
  readonly Cable = Cable;
  readonly Columns3 = Columns3;
  readonly XCircle = XCircle;
  readonly Share2 = Share2;

  policies = signal<Policy[]>([]);
  sharedPolicies = signal<Policy[]>([]);
  selectedPolicy = signal<Policy | null>(null);
  departments = signal<Department[]>([]);

  canvasNodes = signal<CanvasNode[]>([]);
  canvasLanes = signal<Lane[]>([]);
  diagramTransitions = signal<Transition[]>([]);
  activeTool = signal<EditorTool>('select');

  connectingFrom = signal<CanvasNode | null>(null);
  connectPreview = signal<{ x: number; y: number } | null>(null);
  showConditionModal = signal(false);
  pendingConnection = signal<{ sourceId: string; targetId: string } | null>(null);
  connectionCondition = '';
  connectionDashed = false;

  selectedConnId = signal<string | null>(null);
  private draggingCpId: string | null = null;
  private cpDragStartClientXY: { x: number; y: number } | null = null;
  private cpDragStartOffset: { x: number; y: number } = { x: 0, y: 0 };

  collaboratorCursors = signal<{ [uuid: string]: { x: number; y: number; name: string; lastUpdate: number } }>({});
  private lastCursorPublish = 0;

  showCreateModal = signal(false);
  showNodeModal = signal(false);
  selectedCollaborators = signal<string[]>([]);
  showLaneModal = signal(false);
  showShareModal = signal(false);
  showFormDesigner = signal(false);

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  managerUsers = computed(() => {
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const managerRole = this.roles().find(r =>
      normalize(r.roleName).includes('manager') || normalize(r.roleName).includes('gestor')
    );
    const filtered = managerRole ? this.users().filter(u => u.roleId === managerRole.uuid) : [];
    console.log('[managerUsers] rol gestor uuid:', managerRole?.uuid, '| usuarios totales:', this.users().length, '| roleIds de usuarios:', this.users().map(u => u.roleId), '| gestores filtrados:', filtered.length);
    return filtered;
  });
  selectedManagerId = '';

  formDesignerNodeUuid = '';
  formDesignerFields = signal<FormField[]>([]);

  // Only ACTIVITY / APPROVAL nodes are eligible for forms
  formDesignerNodes = computed(() =>
    this.canvasNodes().filter((n) => n.state === 'ACTIVITY' || n.state === 'APPROVAL')
  );

  formDesignerPreview = computed(() => {
    const fields = this.formDesignerFields();
    return JSON.stringify({ fields }, null, 2);
  });

  newPolicyName = '';
  newPolicyDesc = '';
  newLaneName = '';
  editingNodeUuid = '';

  nodeForm = { name: '', description: '', state: 'ACTIVITY', fieldsText: '' };

  canvasWidth = computed(() => {
    const lanes = this.canvasLanes();
    if (lanes.length === 0) return 2000;
    const last = lanes[lanes.length - 1];
    return Math.max(last.x + last.width + 100, 2000);
  });
  canvasHeight = () => 1500;

  // Compute SVG paths for connections with proper anchor points
  connectionLines = computed((): ConnLine[] => {
    const nodes = this.canvasNodes();
    const transitions = this.diagramTransitions();
    return transitions.map((t): ConnLine => {
      const src = nodes.find((n) => n.uuid === t.sourceActivityId);
      const tgt = nodes.find((n) => n.uuid === t.targetActivityId);
      const id = t.sourceActivityId + '::' + t.targetActivityId;
      if (!src || !tgt) {
        return { id, path: '', labelX: 0, labelY: 0, condition: t.condition || '', midX: 0, midY: 0, sourceNodeId: t.sourceActivityId, targetNodeId: t.targetActivityId, dashed: !!t.dashed };
      }
      const anchors = bestAnchors(src, tgt, t.sourceAnchor, t.targetAnchor);
      const f = anchors.from;
      const to = anchors.to;
      const dx = to.x - f.x;
      const dy = to.y - f.y;
      const offsetX = t.cpOffsetX ?? 0;
      const offsetY = t.cpOffsetY ?? 0;
      let cp1x: number, cp1y: number, cp2x: number, cp2y: number;
      if (Math.abs(dy) >= Math.abs(dx)) {
        cp1x = f.x + offsetX; cp1y = f.y + dy * 0.4 + offsetY;
        cp2x = to.x + offsetX; cp2y = to.y - dy * 0.4 + offsetY;
      } else {
        cp1x = f.x + dx * 0.4 + offsetX; cp1y = f.y + offsetY;
        cp2x = to.x - dx * 0.4 + offsetX; cp2y = to.y + offsetY;
      }
      const path = 'M' + f.x + ',' + f.y + ' C' + cp1x + ',' + cp1y + ' ' + cp2x + ',' + cp2y + ' ' + to.x + ',' + to.y;
      // Bezier midpoint at t=0.5: B(0.5) = (1/8)(P0+P3) + (3/8)(P1+P2)
      const midX = 0.125 * (f.x + to.x) + 0.375 * (cp1x + cp2x);
      const midY = 0.125 * (f.y + to.y) + 0.375 * (cp1y + cp2y);
      // Auto-dashed when connecting to/from OBJECT or SIGNAL nodes (UML object flow)
      const objectFlowStates = ['OBJECT', 'SIGNAL'];
      const autoDashed = !!(src && objectFlowStates.includes(src.state)) || !!(tgt && objectFlowStates.includes(tgt.state));
      return {
        id,
        path,
        labelX: midX,
        labelY: midY,
        condition: t.condition || '',
        midX,
        midY,
        sourceNodeId: t.sourceActivityId,
        targetNodeId: t.targetActivityId,
        dashed: t.dashed === true || autoDashed,
      };
    });
  });


  ngOnInit(): void {
    this.loadDesignerPolicies();
    this.departmentService.getAll().subscribe((data) => this.departments.set(data));
    this.userService.getAll().subscribe((data) => this.users.set(data));
    this.roleService.getAll().subscribe((roles) => this.roles.set(roles));
  }

  /**
   * Carga solo las políticas del diseñador autenticado (desde el backend, usando JWT)
   */
  loadDesignerPolicies(): void {
    this.isLoading.set(true);
    setTimeout(() => {
      this.designerPolicyService.getMyPolicies().subscribe((data) => this.policies.set(data));
      this.designerPolicyService.getSharedWithMe().subscribe((data) => {
         this.sharedPolicies.set(data);
         this.isLoading.set(false);
      });
    }, 1500);
  }

  getStateBadgeClass(state: string): string {
    switch (state) {
      case 'ACTIVE': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'INACTIVE': return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-muted text-muted-foreground';
    }
  }

  getActivityBorderClass(state: string): string {
    return state === 'APPROVAL' ? 'border-blue-400 dark:border-blue-500' : 'border-yellow-400 dark:border-yellow-600';
  }

  // Helper to get manager name
  getManagerName(managerId: string): string {
    const user = this.users().find(u => u.uuid === managerId);
    return user ? `${user.name} ${user.lastname}` : 'Sin asignar';
  }

  truncate(text: string, max: number): string {
    return text.length > max ? text.substring(0, max) + '...' : text;
  }

  // --- Policy CRUD ---
  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.voiceContextService.clearForm();
  }

  openCreatePolicy(): void {
    this.newPolicyName = '';
    this.newPolicyDesc = '';
    this.selectedManagerId = '';
    this.showCreateModal.set(true);

    // Register the form with VoiceContextService so the voice widget can fill fields
    this.voiceContextService.registerForm({
      schema: {
        nombre: 'Nombre de la política',
        descripcion: 'Descripción del proceso',
        gestor: 'Nombre del gestor responsable',
      },
      onFilled: (values) => {
        if (values['nombre']) this.newPolicyName = values['nombre'];
        if (values['descripcion']) this.newPolicyDesc = values['descripcion'];
        if (values['gestor']) {
          // Fuzzy-match manager name to UUID
          const query = values['gestor'].toLowerCase().trim();
          const match = this.managerUsers().find(u =>
            `${u.name} ${u.lastname}`.toLowerCase().includes(query) ||
            query.includes(u.name.toLowerCase())
          );
          if (match) this.selectedManagerId = match.uuid;
        }
      },
    });
  }

  openShareModal(): void {
    const policy = this.selectedPolicy();
    if (!policy) return;
    this.selectedCollaborators.set(policy.collaboratorIds || []);
    this.showShareModal.set(true);
  }

  sharePolicyConfirm(): void {
    const policy = this.selectedPolicy();
    if (!policy) return;
    this.policyService.share(policy.uuid, this.selectedCollaborators()).subscribe({
      next: (updatedPolicy) => {
        this.selectedPolicy.set(updatedPolicy);
        this.showShareModal.set(false);
        this.toast.success('Colaboradores actualizados exitosamente');
        this.loadDesignerPolicies();
      },
      error: () => this.toast.error('Error al compartir politica')
    });
  }

  createPolicy(): void {
    if (!this.newPolicyName.trim()) {
      this.toast.error('El nombre es obligatorio');
      return;
    }
    if (!this.newPolicyDesc.trim()) {
      this.toast.error('La descripcion es obligatoria');
      return;
    }
    if (!this.selectedManagerId) {
      this.toast.error('Debes seleccionar un gestor responsable');
      return;
    }
    const ownerId = this.authService.currentUser()?.uuid;
    if (!ownerId) {
      this.toast.error('No se pudo obtener el usuario autenticado');
      return;
    }
    const payload = {
      name: this.newPolicyName.trim(),
      description: this.newPolicyDesc.trim(),
      managerId: this.selectedManagerId,
      ownerId,
      activityNodes: [],
      transitions: [],
      lanes: []
    };
    console.log('[createPolicy] payload enviado al backend:', JSON.stringify(payload, null, 2));
    this.policyService.create(payload).subscribe({
      next: (policy) => {
        this.showCreateModal.set(false);
        this.voiceContextService.clearForm();
        this.toast.success('Politica creada exitosamente');
        this.loadDesignerPolicies();
        this.selectPolicy(policy);
      },
      error: () => {
        this.toast.error('Error al crear la politica');
      },
    });
  }

  selectPolicy(policy: Policy): void {
    const openEditor = (full: Policy) => {
      this.selectedPolicy.set(full);
      
      let lanes: Lane[] = [];
      if (full.lanes && full.lanes.length > 0) {
        lanes = full.lanes.map(l => ({ ...l }));
      } else {
        const depts = this.departments();
        lanes = depts.map((d, i) => ({ id: d.uuid, name: d.name, x: i * 220, width: 220 }));
      }
      this.canvasLanes.set(lanes);
      
      const laneNodeCounts: Record<number, number> = {};
      const nodes: CanvasNode[] = full.activityNodes.map((n, i) => {
      if (n.x !== undefined && n.y !== undefined) {
        return { 
          uuid: n.uuid,
          name: n.name,
          description: n.description,
          state: n.state,
          formSchemaJson: n.formSchemaJson,
          x: n.x, 
          y: n.y, 
          laneId: n.laneId || '' 
        };
      }
        const laneIdx = i % Math.max(lanes.length, 1);
        const count = laneNodeCounts[laneIdx] || 0;
        laneNodeCounts[laneIdx] = count + 1;
        const lane = lanes[laneIdx];
        const canvasNode: CanvasNode = {
          uuid: n.uuid,
          name: n.name,
          description: n.description,
          state: n.state,
          formSchemaJson: n.formSchemaJson,
          x: lane ? lane.x + 30 : 50 + i * 200,
          y: 50 + count * 120,
          laneId: lane?.id || ''
        };
        return canvasNode;
      });
      this.canvasNodes.set(nodes);
      this.diagramTransitions.set([...full.transitions]);
    };

    this.policyService.getByUuid(policy.uuid).subscribe({
      next: (full) => { 
        this.aiChatService.activePolicyId = full.uuid;
        openEditor(full); 
        this.connectWebSocket(full.uuid); 
      },
      error: () => { 
        this.aiChatService.activePolicyId = policy.uuid;
        openEditor(policy); 
        this.connectWebSocket(policy.uuid); 
      },
    });
  }

  connectWebSocket(policyId: string): void {
    const rxStomp = this.wsService.getStompClient();
    this.stompSub = rxStomp.watch(`/topic/policy/${policyId}`).subscribe((message) => {
      try {
        const event = JSON.parse(message.body);
        this.ngZone.run(() => {
          this.handleWebSocketEvent(event);
        });
      } catch (err) {
        console.error('Error parsing WS message', err);
      }
    });
  }

  handleWebSocketEvent(message: any): void {
    // Si el mensaje viene del controlador backend, la data está en message.payload
    const event = message.payload ? message.payload : message;
    const type = message.type || event.type;

    // Si fuimos nosotros los autores del evento, lo ignoramos para evitar loops
    if (event.authorId === this.authService.currentUser()?.uuid) return;

    switch (type) {
      case 'CURSOR_MOVED': {
        this.collaboratorCursors.update(cursors => {
          return {
            ...cursors,
            [event.authorId]: {
              x: event.x,
              y: event.y,
              name: event.authorName || 'Colaborador',
              lastUpdate: Date.now()
            }
          };
        });
        break;
      }
      case 'NODE_ADDED': {
        const found = this.canvasNodes().find(n => n.uuid === event.node.uuid);
        if (!found) {
          this.canvasNodes.update(nodes => [...nodes, event.node]);
        }
        break;
      }
      case 'NODE_MOVED': {
        this.canvasNodes.update(nodes => nodes.map(n =>
          n.uuid === event.nodeId ? { ...n, x: event.x, y: event.y } : n
        ));
        break;
      }
      case 'NODE_DELETED': {
        this.canvasNodes.update(nodes => nodes.filter(n => n.uuid !== event.nodeId));
        this.diagramTransitions.update(trans =>
          trans.filter(t => t.sourceActivityId !== event.nodeId && t.targetActivityId !== event.nodeId)
        );
        break;
      }
      case 'TRANSITION_ADDED': {
        const exists = this.diagramTransitions().find(t =>
          t.sourceActivityId === event.transition.sourceActivityId &&
          t.targetActivityId === event.transition.targetActivityId
        );
        if (!exists) {
          this.diagramTransitions.update(trans => [...trans, event.transition]);
        }
        break;
      }
      case 'TRANSITION_DELETED': {
        this.diagramTransitions.update(trans => trans.filter(t => t.sourceActivityId !== event.sourceId || t.targetActivityId !== event.targetId));
        break;
      }
      case 'DIAGRAM_UPDATED': {
        if (event.lanes) {
          this.canvasLanes.set(event.lanes);
        }
        if (event.activityNodes) {
          this.canvasNodes.set(event.activityNodes);
        }
        if (event.transitions) {
          this.diagramTransitions.set(event.transitions);
        }
        break;
      }
    }
  }

  publishEvent(eventType: string, payload: any): void {
    const rxStomp = this.wsService.getStompClient();
    const policy = this.selectedPolicy();
    const currentUser = this.authService.currentUser();
    if (!policy || !currentUser) return;
    
    // Mapear el tipo de evento al endpoint del controlador (ej: NODE_MOVED -> node.moved)
    const endpoint = eventType.toLowerCase().replace('_', '.');
    
    rxStomp.publish({
      destination: `/app/policy/${policy.uuid}/${endpoint}`,
      body: JSON.stringify({
        ...payload,
        authorId: currentUser.uuid,
        authorName: currentUser.name || 'Colaborador'
      })
    });
  }

  backToList(): void {
    if (this.stompSub) {
      this.stompSub.unsubscribe();
      this.stompSub = undefined;
    }
    this.selectedPolicy.set(null);
    this.aiChatService.activePolicyId = null;
    this.canvasNodes.set([]);
    this.canvasLanes.set([]);
    this.diagramTransitions.set([]);
    this.connectingFrom.set(null);
    this.loadDesignerPolicies();
  }

  async deletePolicy(uuid: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar politica', message: 'Esta seguro? Esta accion no se puede deshacer.',
      confirmLabel: 'Eliminar', variant: 'danger',
    });
    if (ok) {
      this.policyService.delete(uuid).subscribe(() => { this.loadDesignerPolicies(); this.toast.success('Politica eliminada'); });
    }
  }

  changeState(state: 'ACTIVE' | 'INACTIVE' | 'DRAFT'): void {
    const policy = this.selectedPolicy();
    if (!policy) return;
    this.policyService.updateState(policy.uuid, { state }).subscribe((updated) => {
      this.selectedPolicy.set(updated);
      this.toast.success('Estado cambiado a ' + state);
    });
  }

  // --- Lanes ---
  addLane(): void { this.newLaneName = ''; this.showLaneModal.set(true); }

  saveLane(): void {
    const lanes = this.canvasLanes();
    const lastX = lanes.length > 0 ? lanes[lanes.length - 1].x + lanes[lanes.length - 1].width : 0;
    this.canvasLanes.update((l) => [...l, { id: genUUID(), name: this.newLaneName, x: lastX, width: 220 }]);
    this.showLaneModal.set(false);
    this.toast.info('Calle "' + this.newLaneName + '" agregada');
  }

  removeLane(laneId: string): void {
    this.canvasLanes.update((l) => l.filter((lane) => lane.id !== laneId).map((lane, i) => ({ ...lane, x: i * 220 })));
    this.toast.info('Calle eliminada');
  }

  // --- Nodes ---
  addNodeOfType(type: UmlNodeType): void {
    const d = nodeDims(type);
    const existingCount = this.canvasNodes().filter((n) => n.state === type).length;
    let desc = '';
    switch (type) {
      case 'INITIAL': desc = 'Inicio'; break;
      case 'FINAL': desc = 'Fin'; break;
      case 'DECISION': desc = 'Decision'; break;
      case 'FORK': desc = 'Fork'; break;
      case 'OBJECT': desc = 'Estado'; break;
      case 'SIGNAL': desc = 'Enviar Señal'; break;
      default: desc = 'Nueva Actividad'; break;
    }
    const lanes = this.canvasLanes();
    const baseX = lanes.length > 0 ? lanes[0].x + (lanes[0].width - d.w) / 2 : 80;
    const newNode: CanvasNode = {
      uuid: genUUID(),
      name: desc,
      description: desc,
      state: type,
      formSchemaJson: { fields: [] },
      x: baseX,
      y: 50 + existingCount * (d.h + 40) + this.canvasNodes().length * 20,
      laneId: lanes.length > 0 ? lanes[0].id : '',
    };
    this.canvasNodes.update((nodes) => [...nodes, newNode]);
    this.publishEvent('NODE_ADDED', { node: newNode });
    this.toast.success('Nodo ' + type + ' agregado');
  }

  addNode(): void {
    this.editingNodeUuid = '';
    this.nodeForm = { name: '', description: '', state: 'ACTIVITY', fieldsText: '' };
    this.showNodeModal.set(true);
  }

  editNode(node: CanvasNode): void {
    this.editingNodeUuid = node.uuid;
    this.nodeForm = {
      name: node.name || '',
      description: node.description,
      state: node.state,
      fieldsText: node.formSchemaJson?.fields?.map((f) => f.name + ':' + f.type).join('\n') || '',
    };
    this.showNodeModal.set(true);
  }

  saveNode(): void {
    const fields: FormField[] = this.nodeForm.fieldsText
      .split('\n').map((l) => l.trim()).filter((l) => l.includes(':'))
      .map((l) => { const p = l.split(':').map((s) => s.trim()); return { name: p[0], type: p[1] }; });

    if (this.editingNodeUuid) {
      this.canvasNodes.update((nodes) => nodes.map((n) =>
        n.uuid === this.editingNodeUuid
          ? { ...n, name: this.nodeForm.name, description: this.nodeForm.description, state: this.nodeForm.state, formSchemaJson: { fields } }
          : n
      ));
      const updatedNode = this.canvasNodes().find(n => n.uuid === this.editingNodeUuid);
      if (updatedNode) this.publishEvent('NODE_ADDED', { node: updatedNode });
      this.toast.info('Nodo actualizado');
    } else {
      const d = nodeDims(this.nodeForm.state);
      const lanes = this.canvasLanes();
      const baseX = lanes.length > 0 ? lanes[0].x + 30 : 80;
      const newNode: CanvasNode = {
        uuid: genUUID(),
        name: this.nodeForm.name,
        description: this.nodeForm.description,
        state: this.nodeForm.state,
        formSchemaJson: { fields },
        x: baseX,
        y: 50 + this.canvasNodes().length * 100,
        laneId: lanes.length > 0 ? lanes[0].id : '',
      };
      this.canvasNodes.update((nodes) => [...nodes, newNode]);
      this.publishEvent('NODE_ADDED', { node: newNode });
      this.toast.success('Nodo agregado');
    }
    this.showNodeModal.set(false);
  }

  async removeNode(uuid: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar nodo', message: 'Se eliminaran tambien las transiciones conectadas.',
      confirmLabel: 'Eliminar', variant: 'danger',
    });
    if (ok) {
      this.canvasNodes.update((nodes) => nodes.filter((n) => n.uuid !== uuid));
      this.diagramTransitions.update((t) => t.filter((tr) => tr.sourceActivityId !== uuid && tr.targetActivityId !== uuid));
      this.publishEvent('NODE_DELETED', { nodeId: uuid });
      this.toast.info('Nodo eliminado');
    }
  }

  private lastNodeMovePublish = 0;

  onNodeDragMoved(event: CdkDragMove, node: CanvasNode): void {
    const now = Date.now();
    if (now - this.lastNodeMovePublish > 80) { // Limit broadcast rate to ~12fps
      this.lastNodeMovePublish = now;
      const pos = event.source.getFreeDragPosition();
      this.publishEvent('NODE_MOVED', { nodeId: node.uuid, x: pos.x, y: pos.y });
    }
  }

  onNodeDragEnd(event: CdkDragEnd, node: CanvasNode): void {
    const pos = event.source.getFreeDragPosition();
    this.canvasNodes.update((nodes) => nodes.map((n) => (n.uuid === node.uuid ? { ...n, x: pos.x, y: pos.y } : n)));
    this.publishEvent('NODE_MOVED', { nodeId: node.uuid, x: pos.x, y: pos.y });
  }

  // --- Connections ---
  onNodeClick(node: CanvasNode, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeTool() !== 'connect') return;
    const from = this.connectingFrom();
    if (!from) {
      this.connectingFrom.set(node);
      this.toast.info('Ahora haz clic en el nodo destino');
    } else if (from.uuid !== node.uuid) {
      this.pendingConnection.set({ sourceId: from.uuid, targetId: node.uuid });
      this.connectionCondition = '';
      this.showConditionModal.set(true);
      this.connectingFrom.set(null);
      this.connectPreview.set(null);
    }
  }

  onCanvasClick(event: MouseEvent): void {
    if (this.connectingFrom()) { this.connectingFrom.set(null); this.connectPreview.set(null); }
    this.selectedConnId.set(null);
  }

  onGlobalMouseMove(event: MouseEvent): void {
    if (!this.selectedPolicy()) return;

    const target = event.currentTarget as HTMLElement;
    let x = event.clientX;
    let y = event.clientY;
    if (target) {
      const rect = target.getBoundingClientRect();
      x = event.clientX - rect.left + target.scrollLeft;
      y = event.clientY - rect.top + target.scrollTop;
    }

    // Handle CP drag
    if (this.draggingCpId && this.cpDragStartClientXY) {
      const dx = event.clientX - this.cpDragStartClientXY.x;
      const dy = event.clientY - this.cpDragStartClientXY.y;
      const newOffsetX = this.cpDragStartOffset.x + dx;
      const newOffsetY = this.cpDragStartOffset.y + dy;
      this.diagramTransitions.update((transitions) =>
        transitions.map((t) => {
          const id = t.sourceActivityId + '::' + t.targetActivityId;
          if (id !== this.draggingCpId) return t;
          return { ...t, cpOffsetX: newOffsetX, cpOffsetY: newOffsetY };
        })
      );
    }

    const now = Date.now();
    if (now - this.lastCursorPublish > 80) { // Throttle to ~12fps for fluidity
      this.lastCursorPublish = now;
      const currentUser = this.authService.currentUser();
      this.publishEvent('CURSOR_MOVED', { 
        x, 
        y, 
        authorName: currentUser ? currentUser.name : 'Colaborador'
      });
    }
  }

  getActiveCursors() {
    const now = Date.now();
    return Object.entries(this.collaboratorCursors())
      .filter(([id, cursor]) => now - cursor.lastUpdate < 3000) // fade out after 3s of inactivity
      .map(([id, cursor]) => ({ id, ...cursor }));
  }

  saveConnection(): void {
    const conn = this.pendingConnection();
    if (!conn) return;
    const transition = { sourceActivityId: conn.sourceId, targetActivityId: conn.targetId, condition: this.connectionCondition, dashed: this.connectionDashed };
    this.diagramTransitions.update((t) => [...t, transition]);
    this.publishEvent('TRANSITION_ADDED', { transition });
    this.showConditionModal.set(false);
    this.pendingConnection.set(null);
    this.activeTool.set('select');
    this.connectionDashed = false;
    this.toast.success('Transicion creada');
  }

  cancelConnection(): void {
    this.showConditionModal.set(false);
    this.pendingConnection.set(null);
    this.connectingFrom.set(null);
  }

  removeTransition(id: string): void {
    const parts = id.split('::');
    if (parts.length < 2) return;
    const sourceId = parts[0];
    const targetId = parts[1];
    this.diagramTransitions.update((t) => t.filter((tr) => !(tr.sourceActivityId === sourceId && tr.targetActivityId === targetId)));
    this.publishEvent('TRANSITION_DELETED', { sourceId, targetId });
    this.selectedConnId.set(null);
    this.toast.info('Transicion eliminada');
  }

  async confirmRemoveTransition(id: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar conexión',
      message: '¿Estás seguro de que deseas eliminar esta transición?',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (ok) this.removeTransition(id);
  }

  selectConnection(id: string): void {
    if (this.activeTool() === 'connect') return;
    this.selectedConnId.set(this.selectedConnId() === id ? null : id);
  }

  toggleTransitionDashed(connId: string): void {
    const [sourceId, targetId] = connId.split('::');
    this.diagramTransitions.update((ts) =>
      ts.map((t) =>
        t.sourceActivityId === sourceId && t.targetActivityId === targetId
          ? { ...t, dashed: !t.dashed }
          : t
      )
    );
  }

  startCpDrag(id: string, event: MouseEvent): void {
    this.draggingCpId = id;
    this.cpDragStartClientXY = { x: event.clientX, y: event.clientY };
    const t = this.diagramTransitions().find(
      (tr) => tr.sourceActivityId + '::' + tr.targetActivityId === id
    );
    this.cpDragStartOffset = { x: t?.cpOffsetX ?? 0, y: t?.cpOffsetY ?? 0 };
  }

  endCpDrag(): void {
    this.draggingCpId = null;
    this.cpDragStartClientXY = null;
  }

  setAnchor(connId: string, end: 'source' | 'target', anchor: 'top' | 'bottom' | 'left' | 'right'): void {
    this.diagramTransitions.update((transitions) =>
      transitions.map((t) => {
        const id = t.sourceActivityId + '::' + t.targetActivityId;
        if (id !== connId) return t;
        return end === 'source' ? { ...t, sourceAnchor: anchor } : { ...t, targetAnchor: anchor };
      })
    );
  }

  getNodeAnchors(nodeId: string): { name: 'top' | 'bottom' | 'left' | 'right'; x: number; y: number }[] {
    const node = this.canvasNodes().find((n) => n.uuid === nodeId);
    if (!node) return [];
    const ap = anchorPoints(node);
    return [
      { name: 'top', x: ap.top.x, y: ap.top.y },
      { name: 'bottom', x: ap.bottom.x, y: ap.bottom.y },
      { name: 'left', x: ap.left.x, y: ap.left.y },
      { name: 'right', x: ap.right.x, y: ap.right.y },
    ];
  }

  getTransitionSourceAnchor(connId: string): string {
    const t = this.diagramTransitions().find(
      (tr) => tr.sourceActivityId + '::' + tr.targetActivityId === connId
    );
    return t?.sourceAnchor ?? 'auto';
  }

  getTransitionTargetAnchor(connId: string): string {
    const t = this.diagramTransitions().find(
      (tr) => tr.sourceActivityId + '::' + tr.targetActivityId === connId
    );
    return t?.targetAnchor ?? 'auto';
  }

  getNodeCenter(node: CanvasNode): { x: number; y: number } {
    const d = nodeDims(node.state);
    return { x: node.x + d.w / 2, y: node.y + d.h / 2 };
  }

  getNodeDesc(uuid: string): string {
    const n = this.canvasNodes().find((node) => node.uuid === uuid);
    return n ? (n.name || n.description) : '?';
  }

  // --- Save ---
  saveDiagram(): void {
    const policy = this.selectedPolicy();
    if (!policy) return;
    const activityNodes = this.canvasNodes().map((n) => ({
      uuid: n.uuid, name: n.name, description: n.description, state: n.state, formSchemaJson: n.formSchemaJson,
      x: n.x || 0, y: n.y || 0, laneId: n.laneId || ''
    }));
    
    const lanes = this.canvasLanes().map(l => ({ ...l }));
    
    this.policyService.updateDiagram(policy.uuid, { activityNodes, transitions: this.diagramTransitions(), lanes }).subscribe({
      next: (updated) => { this.selectedPolicy.set(updated); this.toast.success('Diagrama guardado exitosamente'); },
      error: () => { this.toast.error('Error al guardar el diagrama'); },
    });
  }


  createForm(): void {
    const nodes = this.formDesignerNodes();
    if (nodes.length === 0) {
      this.toast.error('Agrega al menos una actividad o aprobacion al diagrama antes de crear un formulario');
      return;
    }
    this.formDesignerNodeUuid = '';
    this.formDesignerFields.set([]);
    this.showFormDesigner.set(true);
  }

  onFormDesignerNodeChange(uuid: string): void {
    const node = this.canvasNodes().find((n) => n.uuid === uuid);
    if (node?.formSchemaJson?.fields?.length) {
      this.formDesignerFields.set(node.formSchemaJson.fields.map((f) => ({ ...f })));
    } else {
      this.formDesignerFields.set([]);
    }
  }

  addFormField(): void {
    this.formDesignerFields.update((fields) => [...fields, { name: '', type: 'string', required: false }]);
  }

  removeFormField(index: number): void {
    this.formDesignerFields.update((fields) => fields.filter((_, i) => i !== index));
  }

  updateFormField(index: number, prop: keyof FormField, value: any): void {
    this.formDesignerFields.update((fields) =>
      fields.map((f, i) => (i === index ? { ...f, [prop]: value } : f))
    );
  }

  saveFormDesigner(): void {
    const uuid = this.formDesignerNodeUuid;
    if (!uuid) return;
    const fields = this.formDesignerFields();
    const invalid = fields.some((f) => !f.name.trim());
    if (invalid) {
      this.toast.error('Todos los campos deben tener un nombre');
      return;
    }
    this.canvasNodes.update((nodes) =>
      nodes.map((n) => (n.uuid === uuid ? { ...n, formSchemaJson: { fields: fields.map((f) => ({ ...f })) } } : n))
    );
    this.showFormDesigner.set(false);
    this.toast.success('Formulario guardado para la actividad');
  }
}
