import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { LucideAngularModule, Mail, ArrowLeft, CheckCircle } from 'lucide-angular';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background px-4">
      <div class="w-full max-w-sm -translate-y-16">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <lucide-icon [img]="MailIcon" class="h-6 w-6 text-primary" [size]="24" />
          </div>
          <h1 class="text-2xl font-semibold tracking-tight text-foreground">Recuperar contraseña</h1>
          <p class="mt-1 text-sm text-muted-foreground">Ingresa tu correo y te enviaremos un enlace</p>
        </div>

        <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
          @if (sent()) {
            <div class="flex flex-col items-center text-center gap-3 py-4">
              <lucide-icon [img]="CheckCircleIcon" [size]="40" class="text-green-500" />
              <p class="text-sm font-medium text-foreground">¡Enlace enviado!</p>
              <p class="text-xs text-muted-foreground">
                Si tu correo está registrado, recibirás el enlace de recuperación en breve.
              </p>
            </div>
          } @else {
            @if (errorMessage()) {
              <div class="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {{ errorMessage() }}
              </div>
            }
            <div class="mb-5">
              <label class="mb-1.5 block text-sm font-medium text-foreground" for="email">
                Correo electrónico
              </label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <lucide-icon [img]="MailIcon" class="text-muted-foreground" [size]="16" />
                </div>
                <input id="email" type="email" [(ngModel)]="email"
                  class="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow"
                  placeholder="tu@correo.com" autocomplete="email" />
              </div>
            </div>
            <button (click)="submit()" [disabled]="loading()"
              class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none disabled:opacity-50 transition-colors">
              @if (loading()) { Enviando... } @else { Enviar enlace de recuperación }
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
export class ForgotPasswordComponent {
  readonly MailIcon = Mail;
  readonly ArrowLeftIcon = ArrowLeft;
  readonly CheckCircleIcon = CheckCircle;

  private readonly profileService = inject(ProfileService);

  email = '';
  loading = signal(false);
  sent = signal(false);
  errorMessage = signal('');

  submit(): void {
    if (!this.email.trim()) {
      this.errorMessage.set('Ingresa tu correo electrónico.');
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.profileService.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: () => {
        this.loading.set(false);
        // Para seguridad: siempre mostrar éxito
        this.sent.set(true);
      },
    });
  }
}
