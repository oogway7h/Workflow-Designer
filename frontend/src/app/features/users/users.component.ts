import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { RoleService } from '../../core/services/role.service';
import { DepartmentService } from '../../core/services/department.service';
import { User, CreateUserRequest, Role, Department } from '../../core/models';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService } from '../../shared/services/toast.service';
import {
  LucideAngularModule,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
} from 'lucide-angular';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-foreground">Usuarios</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <button
          (click)="openModal()"
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <lucide-icon [img]="Plus" [size]="16" />
          Nuevo Usuario
        </button>
      </div>

      <!-- Search -->
      <div class="relative mb-4 max-w-sm">
        <div
          class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
        >
          <lucide-icon [img]="Search" class="text-muted-foreground" [size]="16" />
        </div>
        <input
          type="text"
          [(ngModel)]="searchTerm"
          placeholder="Buscar usuario..."
          class="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <!-- Table -->
      <div class="rounded-lg border border-border overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border bg-muted/50">
            <tr>
              <th class="px-4 py-3 font-medium text-muted-foreground">Nombre</th>
              <th class="px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th class="px-4 py-3 font-medium text-muted-foreground">Rol</th>
              <th class="px-4 py-3 font-medium text-muted-foreground">
                Departamento
              </th>
              <th class="px-4 py-3 font-medium text-muted-foreground text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            @for (user of filteredUsers(); track user.uuid) {
              <tr class="border-b border-border last:border-0 hover:bg-muted/30">
                <td class="px-4 py-3 text-foreground font-medium">
                  {{ user.name }} {{ user.lastname }}
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ user.email }}</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {{ getRoleName(user.roleId) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-muted-foreground">
                  {{ getDepartmentName(user.departmentId) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="inline-flex gap-1">
                    <button
                      (click)="editUser(user)"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      title="Editar"
                    >
                      <lucide-icon [img]="Pencil" [size]="15" />
                    </button>
                    <button
                      (click)="deleteUser(user.uuid)"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Eliminar"
                    >
                      <lucide-icon [img]="Trash2" [size]="15" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td
                  colspan="5"
                  class="px-4 py-8 text-center text-muted-foreground"
                >
                  No hay usuarios registrados
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Modal -->
      @if (showModal()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          (click)="closeModal()"
        >
          <div
            class="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
            (click)="$event.stopPropagation()"
          >
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-foreground">
                {{ editingUser() ? 'Editar Usuario' : 'Nuevo Usuario' }}
              </h2>
              <button
                (click)="closeModal()"
                class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <lucide-icon [img]="XIcon" [size]="18" />
              </button>
            </div>

            <form (ngSubmit)="onSave()">
              <div class="space-y-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-foreground"
                    >Nombre</label
                  >
                  <input
                    type="text"
                    [(ngModel)]="form.name"
                    name="name"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-foreground"
                    >Apellido</label
                  >
                  <input
                    type="text"
                    [(ngModel)]="form.lastname"
                    name="lastname"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-foreground"
                    >Email</label
                  >
                  <input
                    type="email"
                    [(ngModel)]="form.email"
                    name="email"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                @if (!editingUser()) {
                  <div>
                    <label class="mb-1 block text-sm font-medium text-foreground"
                      >Contraseña</label
                    >
                    <input
                      type="password"
                      [(ngModel)]="form.password"
                      name="password"
                      class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>
                }
                <div>
                  <label class="mb-1 block text-sm font-medium text-foreground"
                    >Rol</label
                  >
                  <select
                    [(ngModel)]="form.roleId"
                    name="roleId"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Seleccionar rol...</option>
                    @for (role of roles(); track role.uuid) {
                      <option [value]="role.uuid">{{ role.roleName }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-foreground"
                    >Departamento</label
                  >
                  <select
                    [(ngModel)]="form.departmentId"
                    name="departmentId"
                    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Seleccionar departamento...</option>
                    @for (dept of departments(); track dept.uuid) {
                      <option [value]="dept.uuid">{{ dept.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {{ editingUser() ? 'Actualizar' : 'Crear' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly departmentService = inject(DepartmentService);
  private readonly confirmSvc = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly Plus = Plus;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;
  readonly XIcon = X;
  readonly Search = Search;

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  departments = signal<Department[]>([]);
  showModal = signal(false);
  editingUser = signal<User | null>(null);
  searchTerm = '';

  form = {
    name: '',
    lastname: '',
    email: '',
    password: '',
    roleId: '',
    departmentId: '',
  };

  filteredUsers = () => {
    const term = this.searchTerm.toLowerCase();
    if (!term) return this.users();
    return this.users().filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.lastname.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
    );
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.userService.getAll().subscribe((data) => this.users.set(data));
    this.roleService.getAll().subscribe((data) => this.roles.set(data));
    this.departmentService
      .getAll()
      .subscribe((data) => this.departments.set(data));
  }

  getRoleName(roleId: string): string {
    return this.roles().find((r) => r.uuid === roleId)?.roleName || '—';
  }

  getDepartmentName(deptId: string): string {
    return this.departments().find((d) => d.uuid === deptId)?.name || '—';
  }

  openModal(): void {
    this.editingUser.set(null);
    this.resetForm();
    this.showModal.set(true);
  }

  editUser(user: User): void {
    this.editingUser.set(user);
    this.form = {
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      password: '',
      roleId: user.roleId,
      departmentId: user.departmentId,
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingUser.set(null);
    this.resetForm();
  }

  onSave(): void {
    const editing = this.editingUser();
    if (editing) {
      this.userService
        .update(editing.uuid, {
          name: this.form.name,
          lastname: this.form.lastname,
          email: this.form.email,
          roleId: this.form.roleId,
          departmentId: this.form.departmentId,
        })
        .subscribe(() => {
          this.loadData();
          this.closeModal();
        });
    } else {
      const req: CreateUserRequest = { ...this.form };
      this.userService.create(req).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    }
  }

  async deleteUser(uuid: string): Promise<void> {
    const ok = await this.confirmSvc.confirm({
      title: 'Eliminar usuario',
      message: '¿Estás seguro de eliminar este usuario?',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (ok) {
      this.userService.delete(uuid).subscribe(() => {
        this.loadData();
        this.toast.success('Usuario eliminado');
      });
    }
  }

  private resetForm(): void {
    this.form = {
      name: '',
      lastname: '',
      email: '',
      password: '',
      roleId: '',
      departmentId: '',
    };
  }
}
