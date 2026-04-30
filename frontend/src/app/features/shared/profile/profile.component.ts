import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import {
  LucideAngularModule, User, Lock, Save, Eye, EyeOff, ArrowLeft,
} from 'lucide-angular';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, LoaderComponent],
  template: `
    <div class="p-6 max-w-2xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-foreground">Mi Perfil</h1>
        <p class="mt-1 text-sm text-muted-foreground">Gestiona tu información personal y contraseña</p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 border-b border-border">
        <button
          (click)="activeTab.set('info')"
          class="px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg"
          [class.border-b-2]="activeTab() === 'info'"
          [class.border-primary]="activeTab() === 'info'"
          [class.text-primary]="activeTab() === 'info'"
          [class.text-muted-foreground]="activeTab() !== 'info'"
        >
          <span class="flex items-center gap-2">
            <lucide-icon [img]="UserIcon" [size]="16" /> Información Personal
          </span>
        </button>
        <button
          (click)="activeTab.set('password')"
          class="px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg"
          [class.border-b-2]="activeTab() === 'password'"
          [class.border-primary]="activeTab() === 'password'"
          [class.text-primary]="activeTab() === 'password'"
          [class.text-muted-foreground]="activeTab() !== 'password'"
        >
          <span class="flex items-center gap-2">
            <lucide-icon [img]="LockIcon" [size]="16" /> Seguridad
          </span>
        </button>
      </div>

      <!-- Tab: Información Personal -->
      @if (activeTab() === 'info') {
        <div class="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Correo electrónico</label>
            <input type="email" [value]="authService.currentUser()?.email || ''" disabled
              class="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed" />
            <p class="mt-1 text-xs text-muted-foreground">El correo no puede modificarse.</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
              <input type="text" [(ngModel)]="profileForm.name"
                class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Apellido</label>
              <input type="text" [(ngModel)]="profileForm.lastname"
                class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div class="flex justify-end pt-2">
            <button (click)="saveProfile()" [disabled]="savingProfile()"
              class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              @if (savingProfile()) {
                <app-loader text="" />
              } @else {
                <lucide-icon [img]="SaveIcon" [size]="16" />
              }
              Guardar cambios
            </button>
          </div>
        </div>
      }

      <!-- Tab: Seguridad -->
      @if (activeTab() === 'password') {
        <div class="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Contraseña actual</label>
            <div class="relative">
              <input [type]="showOld() ? 'text' : 'password'" [(ngModel)]="passwordForm.oldPassword"
                class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" (click)="toggleShowOld()"
                class="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground">
                <lucide-icon [img]="showOld() ? EyeOffIcon : EyeIcon" [size]="16" />
              </button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Nueva contraseña</label>
            <div class="relative">
              <input [type]="showNew() ? 'text' : 'password'" [(ngModel)]="passwordForm.newPassword"
                class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" (click)="toggleShowNew()"
                class="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground">
                <lucide-icon [img]="showNew() ? EyeOffIcon : EyeIcon" [size]="16" />
              </button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Confirmar nueva contraseña</label>
            <div class="relative">
              <input [type]="showConfirm() ? 'text' : 'password'" [(ngModel)]="passwordForm.confirmPassword"
                class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" (click)="toggleShowConfirm()"
                class="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground">
                <lucide-icon [img]="showConfirm() ? EyeOffIcon : EyeIcon" [size]="16" />
              </button>
            </div>
          </div>
          @if (passwordError()) {
            <p class="text-sm text-destructive">{{ passwordError() }}</p>
          }
          <div class="flex justify-end pt-2">
            <button (click)="savePassword()" [disabled]="savingPassword()"
              class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              <lucide-icon [img]="LockIcon" [size]="16" />
              Actualizar contraseña
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  readonly UserIcon = User;
  readonly LockIcon = Lock;
  readonly SaveIcon = Save;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;

  private readonly profileService = inject(ProfileService);
  readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  activeTab = signal<'info' | 'password'>('info');
  savingProfile = signal(false);
  savingPassword = signal(false);
  passwordError = signal('');
  showOld = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);

  profileForm = { name: '', lastname: '' };
  passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.profileForm.name = user?.name || '';
    this.profileForm.lastname = (user as any)?.lastname || '';
  }

  toggleShowOld(): void { this.showOld.update(v => !v); }
  toggleShowNew(): void { this.showNew.update(v => !v); }
  toggleShowConfirm(): void { this.showConfirm.update(v => !v); }

  saveProfile(): void {
    if (!this.profileForm.name.trim() || !this.profileForm.lastname.trim()) {
      this.toast.error('El nombre y apellido son obligatorios');
      return;
    }
    this.savingProfile.set(true);
    this.profileService.updateProfile(this.profileForm).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.toast.success('Perfil actualizado correctamente');
      },
      error: () => {
        this.savingProfile.set(false);
        this.toast.error('Error al actualizar el perfil');
      },
    });
  }

  savePassword(): void {
    this.passwordError.set('');
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError.set('Las contraseñas no coinciden');
      return;
    }
    if (this.passwordForm.newPassword.length < 6) {
      this.passwordError.set('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    this.savingPassword.set(true);
    this.profileService.changePassword({
      oldPassword: this.passwordForm.oldPassword,
      newPassword: this.passwordForm.newPassword,
    }).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
        this.toast.success('Contraseña actualizada correctamente');
      },
      error: (err) => {
        this.savingPassword.set(false);
        this.passwordError.set(err.error?.message || 'La contraseña actual es incorrecta');
      },
    });
  }
}
