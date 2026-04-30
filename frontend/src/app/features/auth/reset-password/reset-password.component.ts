import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { LucideAngularModule, Lock, Eye, EyeOff, CheckCircle, ArrowLeft, AlertTriangle } from 'lucide-angular';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background px-4">
      <div class="w-full max-w-sm -translate-y-16">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <lucide-icon [img]="LockIcon" class="h-6 w-6 text-primary" [size]="24" />
          </div>
          <h1 class="text-2xl font-semibold tracking-tight text-foreground">Nueva contraseña</h1>
          <p class="mt-1 text-sm text-muted-foreground">Ingresa y confirma tu nueva contraseña</p>
        </div>

        <div class="rounded-xl border border-border bg-card p-6 shadow-sm">

          @if (!token()) {
            <div class="flex flex-col items-center gap-3 py-4 text-center">
              <lucide-icon [img]="AlertIcon" [size]="36" class="text-destructive" />
              <p class="text-sm font-medium text-foreground">Enlace inválido</p>
              <p class="text-xs text-muted-foreground">Este enlace no es válido o ha expirado.</p>
            </div>
          } @else if (done()) {
            <div class="flex flex-col items-center gap-3 py-4 text-center">
              <lucide-icon [img]="CheckCircleIcon" [size]="40" class="text-green-500" />
              <p class="text-sm font-medium text-foreground">¡Contraseña actualizada!</p>
              <p class="text-xs text-muted-foreground">Ya puedes iniciar sesión con tu nueva contraseña.</p>
            </div>
          } @else {
            @if (errorMessage()) {
              <div class="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {{ errorMessage() }}
              </div>
            }

            <!-- Nueva contraseña -->
            <div class="mb-4 space-y-1.5">
              <label class="text-sm font-medium text-foreground">Nueva contraseña</label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <lucide-icon [img]="LockIcon" class="text-muted-foreground" [size]="16" />
                </div>
                <input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="newPassword"
                  class="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
                <button type="button" (click)="toggleShowPassword()"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors">
                  @if (showPassword()) {
                    <lucide-icon [img]="EyeOffIcon" [size]="16" />
                  } @else {
                    <lucide-icon [img]="EyeIcon" [size]="16" />
                  }
                </button>
              </div>
            </div>

            <!-- Confirmar contraseña -->
            <div class="mb-5 space-y-1.5">
              <label class="text-sm font-medium text-foreground">Confirmar contraseña</label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <lucide-icon [img]="LockIcon" class="text-muted-foreground" [size]="16" />
                </div>
                <input [type]="showConfirm() ? 'text' : 'password'" [(ngModel)]="confirmPassword"
                  class="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  placeholder="Repite la contraseña" autocomplete="new-password" />
                <button type="button" (click)="toggleShowConfirm()"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors">
                  @if (showConfirm()) {
                    <lucide-icon [img]="EyeOffIcon" [size]="16" />
                  } @else {
                    <lucide-icon [img]="EyeIcon" [size]="16" />
                  }
                </button>
              </div>
            </div>

            <button (click)="submit()" [disabled]="loading()"
              class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none disabled:opacity-50 transition-colors">
              @if (loading()) { Guardando... } @else { Guardar nueva contraseña }
            </button>
          }

          <div class="mt-5 text-center">
            <a routerLink="/auth/login"
              class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <lucide-icon [img]="ArrowLeftIcon" [size]="12" /> Volver al inicio de sesión
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  readonly LockIcon = Lock;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;
  readonly CheckCircleIcon = CheckCircle;
  readonly ArrowLeftIcon = ArrowLeft;
  readonly AlertIcon = AlertTriangle;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);

  token = signal<string>('');
  newPassword = '';
  confirmPassword = '';
  showPassword = signal(false);
  showConfirm = signal(false);
  loading = signal(false);
  done = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token') || '';
    this.token.set(t);
  }

  toggleShowPassword(): void { this.showPassword.update(v => !v); }
  toggleShowConfirm(): void { this.showConfirm.update(v => !v); }

  submit(): void {
    this.errorMessage.set('');
    if (!this.newPassword || this.newPassword.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
    this.profileService.resetPassword(this.token(), this.newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
        setTimeout(() => this.router.navigate(['/auth/login']), 2500);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'El enlace es inválido o ha expirado. Solicita uno nuevo.'
        );
      },
    });
  }
}
