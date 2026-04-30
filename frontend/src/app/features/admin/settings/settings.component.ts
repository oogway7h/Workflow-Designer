import { Component, OnInit, inject, signal } from '@angular/core';
import { LucideAngularModule, Settings } from 'lucide-angular';
import { PolicyService } from '../../../core/services/policy.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-foreground">Configuraciones del Sistema</h1>
        <p class="mt-1 text-sm text-muted-foreground">Administra la configuración general del sistema de gestión de políticas</p>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- System Settings -->
        <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div class="flex items-center gap-3 mb-4">
            <lucide-icon [img]="Settings" [size]="24" class="text-primary" />
            <h2 class="text-lg font-semibold text-foreground">Configuración del Sistema</h2>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-2">Tiempo de sesión (minutos)</label>
              <input type="number" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value="60" />
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-2">Límite de archivos (MB)</label>
              <input type="number" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value="10" />
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="notifications" class="rounded border-input" checked />
              <label for="notifications" class="text-sm text-foreground">Notificaciones por email</label>
            </div>
          </div>
        </div>

        <!-- Security Settings -->
        <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div class="flex items-center gap-3 mb-4">
            <lucide-icon [img]="Settings" [size]="24" class="text-primary" />
            <h2 class="text-lg font-semibold text-foreground">Seguridad</h2>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-2">Política de contraseñas</label>
              <select class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option>Básica (8 caracteres)</option>
                <option>Media (8 caracteres + números)</option>
                <option>Alta (12 caracteres + símbolos)</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="twofactor" class="rounded border-input" />
              <label for="twofactor" class="text-sm text-foreground">Autenticación de dos factores</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="audit" class="rounded border-input" checked />
              <label for="audit" class="text-sm text-foreground">Auditoría de acciones</label>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-3">
        <button class="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
          Cancelar
        </button>
        <button class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Guardar cambios
        </button>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  readonly Settings = Settings;
  private readonly policyService = inject(PolicyService);

  allInstances = signal<any[]>([]);

  ngOnInit(): void {
    this.policyService.getAllInstances().subscribe((instances) => {
      this.allInstances.set(instances);
    });
  }
}