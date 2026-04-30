import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PolicyService } from '../../../core/services/policy.service';
import { Policy, ActivityNode, Transition } from '../../../core/models';
import { LucideAngularModule, ChevronLeft, FileText, Eye } from 'lucide-angular';

export interface CanvasNode extends ActivityNode {}

@Component({
  selector: 'app-policy-viewer',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="flex h-full flex-col">
      <!-- Header -->
      <div class="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
        <button (click)="goBack()" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground" title="Volver">
          <lucide-icon [img]="ChevronLeft" [size]="18" />
        </button>
        <div class="mr-2 border-r border-border pr-3">
          <h2 class="text-sm font-semibold text-foreground truncate max-w-[200px]">{{ policy()?.name || policy()?.description }}</h2>
          <div class="flex items-center gap-2">
            <span class="text-[10px] rounded-full px-1.5 py-0.5 font-semibold uppercase" [class]="getStateBadgeClass(policy()?.state || '')">{{ policy()?.state }}</span>
            <span class="text-[10px] text-muted-foreground">Vista de solo lectura</span>
          </div>
        </div>
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <lucide-icon [img]="Eye" [size]="14" />
          <span>Modo observador</span>
        </div>
      </div>

      <!-- Canvas (Read-only) -->
      <div class="flex-1 overflow-auto relative p-4"
        style="background-color: hsl(var(--muted) / 0.3); background-image: radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px); background-size: 20px 20px;">

        @if (policy()) {
          <!-- SVG layer for connections -->
          <svg class="absolute inset-0 pointer-events-none" [attr.width]="canvasWidth()" [attr.height]="canvasHeight()" style="z-index: 1;">
            <defs>
              <marker id="arrowhead-{{policy()?.uuid}}" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#333" class="dark:fill-gray-300" />
              </marker>
            </defs>
            <!-- Connections -->
            @for (conn of connectionLines(); track conn.id) {
              <path [attr.d]="conn.path" stroke="#555" stroke-width="1" fill="none" [attr.marker-end]="'url(#arrowhead-' + policy()?.uuid + ')'"
                class="pointer-events-none dark:stroke-gray-400" />
              @if (conn.condition) {
                <rect [attr.x]="conn.labelX - 4" [attr.y]="conn.labelY - 12" [attr.width]="conn.condition.length * 6.5 + 16" height="16" rx="3" fill="white" stroke="#ddd" stroke-width="1"
                  class="pointer-events-none dark:fill-gray-800 dark:stroke-gray-600" />
                <text [attr.x]="conn.labelX + 4" [attr.y]="conn.labelY - 1" font-size="10" font-family="monospace" fill="#666"
                  class="pointer-events-none dark:fill-gray-300">[{{ conn.condition }}]</text>
              }
            }
          </svg>

          <!-- Swim Lanes -->
          @for (lane of lanes(); track lane.id) {
            <div class="absolute top-0 border-r border-dashed border-border"
              [style.left.px]="lane.x" [style.width.px]="lane.width" [style.height.px]="canvasHeight()" style="z-index: 0;">
              <div class="sticky top-0 flex items-center justify-between border-b border-border bg-primary/5 px-3 py-2 z-10 backdrop-blur-sm">
                <span class="text-xs font-semibold uppercase text-primary truncate">{{ lane.name }}</span>
              </div>
            </div>
          }

          <!-- Nodes (Read-only) -->
          @for (node of nodes(); track node.uuid) {
            <div class="absolute select-none" [style.z-index]="2" style="top:0;left:0;"
              [style.left.px]="node.x" [style.top.px]="node.y">

              @switch (node.state) {
                <!-- INITIAL -->
                @case ('INITIAL') {
                  <div class="relative flex items-center justify-center" style="width:32px;height:32px;">
                    <svg width="32" height="32" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="14" fill="currentColor" class="text-foreground" />
                    </svg>
                  </div>
                }

                <!-- FINAL -->
                @case ('FINAL') {
                  <div class="relative flex items-center justify-center" style="width:32px;height:32px;">
                    <svg width="32" height="32" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="3" class="text-foreground" />
                      <circle cx="16" cy="16" r="7" fill="currentColor" class="text-foreground" />
                    </svg>
                  </div>
                }

                <!-- DECISION -->
                @case ('DECISION') {
                  <div class="relative" style="width:90px;height:70px;">
                    <svg width="90" height="70" viewBox="0 0 90 70">
                      <polygon points="45,4 86,35 45,66 4,35" fill="#FEF9C3" stroke="#CA8A04" stroke-width="2" class="dark:fill-yellow-900/40 dark:stroke-yellow-600" />
                          <text x="45" y="39" text-anchor="middle" font-size="10" font-weight="600" fill="#713F12" class="dark:fill-yellow-300">{{ truncate(node.name || node.description, 12) }}</text>
                    </svg>
                  </div>
                }

                <!-- FORK -->
                @case ('FORK') {
                  <div class="relative" style="width:160px;height:12px;">
                    <svg width="160" height="12" viewBox="0 0 160 12">
                      <rect x="0" y="1" width="160" height="10" rx="3" fill="currentColor" class="text-foreground" />
                    </svg>
                  </div>
                }

                <!-- ACTIVITY / APPROVAL -->
                @default {
                  <div class="relative w-44 rounded-xl border-2 bg-yellow-50 px-3 py-2.5 shadow-md dark:bg-yellow-900/20"
                    [class]="getActivityBorderClass(node.state)">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-[9px] font-bold uppercase text-yellow-700 dark:text-yellow-400">{{ node.state }}</span>
                    </div>
                    <p class="text-xs font-semibold text-foreground leading-tight">{{ node.name || node.description }}</p>
                    @if (node.formSchemaJson?.fields?.length) {
                      <div class="mt-1.5 border-t border-yellow-200 dark:border-yellow-700 pt-1 space-y-0.5">
                        @for (field of node.formSchemaJson.fields; track field.name) {
                          <div class="text-[9px] text-muted-foreground"><span class="font-mono">{{ field.name }}</span>: <span class="italic">{{ field.type }}</span></div>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </div>
          }
        } @else {
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <lucide-icon [img]="FileText" [size]="48" class="mx-auto mb-4 text-muted-foreground/50" />
              <p class="text-muted-foreground">Cargando diagrama...</p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class PolicyViewerComponent implements OnInit {
  private readonly policyService = inject(PolicyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly ChevronLeft = ChevronLeft;
  readonly FileText = FileText;
  readonly Eye = Eye;

  policy = signal<Policy | null>(null);
  nodes = signal<CanvasNode[]>([]);
  transitions = signal<Transition[]>([]);
  lanes = signal<{ id: string; name: string; x: number; width: number }[]>([]);

  canvasWidth = computed(() => {
    const lanes = this.lanes();
    if (lanes.length === 0) return 2000;
    const last = lanes[lanes.length - 1];
    return Math.max(last.x + last.width + 100, 2000);
  });

  canvasHeight = () => 1500;

  // Compute SVG paths for connections
  connectionLines = computed(() => {
    const nodes = this.nodes();
    const transitions = this.transitions();
    
    // Helper to get center coordinates based on node type
    const getCenter = (node: CanvasNode) => {
      let w = 176, h = 64; // Default roughly for ACTIVITY
      switch (node.state) {
        case 'INITIAL':
        case 'FINAL':
          w = 32; h = 32; break;
        case 'DECISION':
          w = 90; h = 70; break;
        case 'FORK':
          w = 160; h = 12; break;
      }
      return { x: node.x + w / 2, y: node.y + h / 2 };
    };

    return transitions.map((t): { id: string; path: string; labelX: number; labelY: number; condition: string } => {
      const src = nodes.find((n) => n.uuid === t.sourceActivityId);
      const tgt = nodes.find((n) => n.uuid === t.targetActivityId);
      if (!src || !tgt) {
        return { id: t.sourceActivityId + '::' + t.targetActivityId, path: '', labelX: 0, labelY: 0, condition: t.condition || '' };
      }

      const srcCenter = getCenter(src);
      const tgtCenter = getCenter(tgt);

      // Simple straight line for read-only view
      const path = `M${srcCenter.x} ${srcCenter.y} L${tgtCenter.x} ${tgtCenter.y}`;
      const labelX = (srcCenter.x + tgtCenter.x) / 2;
      const labelY = (srcCenter.y + tgtCenter.y) / 2;

      return {
        id: t.sourceActivityId + '::' + t.targetActivityId,
        path,
        labelX,
        labelY,
        condition: t.condition || '',
      };
    });
  });

  ngOnInit(): void {
    const policyId = this.route.snapshot.params['id'];
    if (policyId) {
      this.loadPolicy(policyId);
    }
  }

  loadPolicy(policyId: string): void {
    this.policyService.getByUuid(policyId).subscribe((policy) => {
      this.policy.set(policy);

      this.lanes.set(policy.lanes || []);

      const canvasNodes: CanvasNode[] = policy.activityNodes.map((n, i) => {
        return { 
          ...n, 
          x: n.x ?? (50 + i * 200), 
          y: n.y ?? 100, 
          laneId: n.laneId || '' 
        };
      });

      this.nodes.set(canvasNodes);
      this.transitions.set(policy.transitions);
    });
  }

  goBack(): void {
    this.router.navigate(['/app/manager/policies']);
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

  truncate(text: string, max: number): string {
    return text.length > max ? text.substring(0, max) + '...' : text;
  }
}