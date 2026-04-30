import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DepartmentService } from '../../core/services/department.service';
import { RoleService } from '../../core/services/role.service';
import { Department, Role, CreateRoleRequest } from '../../core/models';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService } from '../../shared/services/toast.service';
import {
  LucideAngularModule,
  Plus,
  Pencil,
  Trash2,
  X,
  Building2,
  Shield,
} from 'lucide-angular';

@Component({
  selector: 'app-empresa',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-semibold text-foreground">Empresa</h1>
      <p class="mt-1 mb-6 text-sm text-muted-foreground">
        Gestiona la estructura organizacional
      </p>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Departamentos -->
        <div class="rounded-xl border border-border bg-card">
          <div
            class="flex items-center justify-between border-b border-border px-5 py-4"
          >
            <div class="flex items-center gap-2">
              <lucide-icon [img]="Building2" [size]="18" class="text-primary" />
              <h2 class="text-base font-semibold text-foreground">
                Departamentos
              </h2>
            </div>
            <button
              (click)="openDeptModal()"
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <lucide-icon [img]="Plus" [size]="14" />
              Nuevo
            </button>
          </div>
          <div class="divide-y divide-border">
            @for (dept of departments(); track dept.uuid) {
              <div
                class="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
              >
                <span class="text-sm text-foreground">{{ dept.name }}</span>
                <div class="inline-flex gap-1">
                  <button
                    (click)="editDept(dept)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <lucide-icon [img]="Pencil" [size]="14" />
                  </button>
                  <button
                    (click)="deleteDept(dept.uuid)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <lucide-icon [img]="Trash2" [size]="14" />
                  </button>
                </div>
              </div>
            } @empty {
              <div class="px-5 py-8 text-center text-sm text-muted-foreground">
                Sin departamentos
              </div>
            }
          </div>
        </div>

        <!-- Roles -->
        <div class="rounded-xl border border-border bg-card">
          <div
            class="flex items-center justify-between border-b border-border px-5 py-4"
          >
            <div class="flex items-center gap-2">
              <lucide-icon [img]="Shield" [size]="18" class="text-primary" />
              <h2 class="text-base font-semibold text-foreground">Roles</h2>
            </div>
            <button
              (click)="openRoleModal()"
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <lucide-icon [img]="Plus" [size]="14" />
              Nuevo
            </button>
          </div>
          <div class="divide-y divide-border">
            @for (role of roles(); track role.uuid) {
              <div
                class="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
              >
                <div>
                  <span class="text-sm font-medium text-foreground">{{
                    role.roleName
                  }}</span>
                  <div class="mt-1 flex flex-wrap gap-1">
                    @for (perm of role.permissions; track perm) {
                      <span
                        class="inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >{{ perm }}</span
                      >
                    }
                  </div>
                </div>
                <div class="inline-flex gap-1 shrink-0 ml-2">
                  <button
                    (click)="editRole(role)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <lucide-icon [img]="Pencil" [size]="14" />
                  </button>
                  <button
                    (click)="deleteRole(role.uuid)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <lucide-icon [img]="Trash2" [size]="14" />
                  </button>
                </div>
              </div>
            } @empty {
              <div class="px-5 py-8 text-center text-sm text-muted-foreground">
                Sin roles
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Dept Modal -->
      @if (showDeptModal()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          (click)="closeDeptModal()"
        >
          <div
            class="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg"
            (click)="$event.stopPropagation()"
          >
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-foreground">
                {{
                  editingDept()
                    ? 'Editar Departamento'
                    : 'Nuevo Departamento'
                }}
              </h2>
              <button
                (click)="closeDeptModal()"
                class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <lucide-icon [img]="XIcon" [size]="18" />
              </button>
            </div>
            <form (ngSubmit)="saveDept()">
              <label class="mb-1 block text-sm font-medium text-foreground"
                >Nombre</label
              >
              <input
                type="text"
                [(ngModel)]="deptForm.name"
                name="name"
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <div class="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  (click)="closeDeptModal()"
                  class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {{ editingDept() ? 'Actualizar' : 'Crear' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Role Modal -->
      @if (showRoleModal()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          (click)="closeRoleModal()"
        >
          <div
            class="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg"
            (click)="$event.stopPropagation()"
          >
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-foreground">
                {{ editingRole() ? 'Editar Rol' : 'Nuevo Rol' }}
              </h2>
              <button
                (click)="closeRoleModal()"
                class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <lucide-icon [img]="XIcon" [size]="18" />
              </button>
            </div>
            <form (ngSubmit)="saveRole()">
              <div class="space-y-3">
                <div>
                  <label
                    class="mb-1 block text-sm font-medium text-foreground"
                    >Nombre del Rol</label
                  >
                  <input
                    type="text"
                    [(ngModel)]="roleForm.roleName"
                    name="roleName"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div>
                  <label
                    class="mb-1 block text-sm font-medium text-foreground"
                    >Permisos
                    <span class="text-muted-foreground font-normal"
                      >(separados por coma)</span
                    ></label
                  >
                  <input
                    type="text"
                    [(ngModel)]="permissionsInput"
                    name="permissions"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="READ_POLICY, WRITE_POLICY"
                  />
                </div>
              </div>
              <div class="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  (click)="closeRoleModal()"
                  class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {{ editingRole() ? 'Actualizar' : 'Crear' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class EmpresaComponent implements OnInit {
  private readonly departmentService = inject(DepartmentService);
  private readonly roleService = inject(RoleService);
  private readonly confirmSvc = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly Plus = Plus;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;
  readonly XIcon = X;
  readonly Building2 = Building2;
  readonly Shield = Shield;

  departments = signal<Department[]>([]);
  roles = signal<Role[]>([]);

  // Dept modal
  showDeptModal = signal(false);
  editingDept = signal<Department | null>(null);
  deptForm = { name: '' };

  // Role modal
  showRoleModal = signal(false);
  editingRole = signal<Role | null>(null);
  roleForm = { roleName: '' };
  permissionsInput = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.departmentService
      .getAll()
      .subscribe((data) => this.departments.set(data));
    this.roleService.getAll().subscribe((data) => this.roles.set(data));
  }

  // --- Departamentos ---
  openDeptModal(): void {
    this.editingDept.set(null);
    this.deptForm = { name: '' };
    this.showDeptModal.set(true);
  }

  editDept(dept: Department): void {
    this.editingDept.set(dept);
    this.deptForm = { name: dept.name };
    this.showDeptModal.set(true);
  }

  closeDeptModal(): void {
    this.showDeptModal.set(false);
    this.editingDept.set(null);
  }

  saveDept(): void {
    const editing = this.editingDept();
    if (editing) {
      this.departmentService
        .update(editing.uuid, { name: this.deptForm.name })
        .subscribe(() => {
          this.loadData();
          this.closeDeptModal();
        });
    } else {
      this.departmentService
        .create({ name: this.deptForm.name })
        .subscribe(() => {
          this.loadData();
          this.closeDeptModal();
        });
    }
  }

  async deleteDept(uuid: string): Promise<void> {
    const ok = await this.confirmSvc.confirm({
      title: 'Eliminar departamento',
      message: '¿Eliminar este departamento?',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (ok) {
      this.departmentService.delete(uuid).subscribe(() => {
        this.loadData();
        this.toast.success('Departamento eliminado');
      });
    }
  }

  // --- Roles ---
  openRoleModal(): void {
    this.editingRole.set(null);
    this.roleForm = { roleName: '' };
    this.permissionsInput = '';
    this.showRoleModal.set(true);
  }

  editRole(role: Role): void {
    this.editingRole.set(role);
    this.roleForm = { roleName: role.roleName };
    this.permissionsInput = role.permissions.join(', ');
    this.showRoleModal.set(true);
  }

  closeRoleModal(): void {
    this.showRoleModal.set(false);
    this.editingRole.set(null);
  }

  saveRole(): void {
    const permissions = this.permissionsInput
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const editing = this.editingRole();
    if (editing) {
      this.roleService
        .update(editing.uuid, {
          roleName: this.roleForm.roleName,
          permissions,
        })
        .subscribe(() => {
          this.loadData();
          this.closeRoleModal();
        });
    } else {
      const req: CreateRoleRequest = {
        roleName: this.roleForm.roleName,
        permissions,
      };
      this.roleService.create(req).subscribe(() => {
        this.loadData();
        this.closeRoleModal();
      });
    }
  }

  async deleteRole(uuid: string): Promise<void> {
    const ok = await this.confirmSvc.confirm({
      title: 'Eliminar rol',
      message: '¿Eliminar este rol?',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (ok) {
      this.roleService.delete(uuid).subscribe(() => {
        this.loadData();
        this.toast.success('Rol eliminado');
      });
    }
  }
}
