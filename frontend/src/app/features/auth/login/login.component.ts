import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../core/models';
import { LucideAngularModule, LogIn, Eye, EyeOff, Mail, Lock } from 'lucide-angular';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, LoaderComponent, ThemeToggleComponent],
  template: `
    <div class="flex min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      <!-- Theme toggle top-right -->
      <div class="fixed right-4 top-4 z-50">
        <app-theme-toggle />
      </div>
      <!-- Left panel: form -->
      <div class="relative flex w-full flex-col items-center justify-center bg-white dark:bg-gray-900 px-8 md:w-5/12 transition-colors duration-300">
        <!-- Decorative shapes top-left -->
        <div class="pointer-events-none absolute left-0 top-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/60 dark:bg-indigo-900/30"></div>
        <div class="pointer-events-none absolute left-8 top-8 h-20 w-20 rounded-2xl bg-indigo-200/40 dark:bg-indigo-800/20 rotate-12"></div>

        <div class="relative z-10 w-full max-w-sm">
          @if (isLoading()) {
            <div class="absolute inset-0 z-10 rounded-xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm flex items-center justify-center">
              <app-loader text="Verificando credenciales..."></app-loader>
            </div>
          }

          <!-- Header -->
          <div class="mb-8 text-center">
            <h1 class="text-2xl font-semibold text-gray-800 dark:text-gray-100">Iniciar Sesión</h1>
          </div>

          <!-- Error Message -->
          @if (errorMessage()) {
            <div class="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- Email -->
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <lucide-icon [img]="Mail" class="text-gray-400 dark:text-gray-500" [size]="16" />
              </div>
              <input
                id="email"
                type="email"
                [(ngModel)]="email"
                name="email"
                class="w-full rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3 pl-10 pr-4 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                placeholder="usuario"
                required
                autocomplete="email"
              />
            </div>

            <!-- Password -->
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <lucide-icon [img]="Lock" class="text-gray-400 dark:text-gray-500" [size]="16" />
              </div>
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                class="w-full rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3 pl-10 pr-10 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                placeholder="contraseña"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                (click)="togglePasswordVisibility()"
              >
                @if (showPassword()) {
                  <lucide-icon [img]="EyeOff" [size]="16" />
                } @else {
                  <lucide-icon [img]="Eye" [size]="16" />
                }
              </button>
            </div>

            <!-- Forgot Password -->
            <div class="flex justify-end">
              <button
                type="button"
                class="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                (click)="onForgotPassword()"
              >
                ¿Olvidaste tu <span class="font-semibold text-blue-600 dark:text-blue-400">contraseña?</span>
              </button>
            </div>

            <!-- Submit -->
            <button
              type="submit"
              [disabled]="isLoading()"
              class="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-50 transition-colors shadow-md shadow-blue-200 dark:shadow-blue-900/30"
            >
              @if (isLoading()) {
                <svg class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Ingresando…
              } @else {
                Log in
              }
            </button>
          </form>
        </div>

        <!-- Footer -->
        <p class="absolute bottom-6 text-center text-xs text-gray-400 dark:text-gray-600">
          Workflow Designer &copy; {{ currentYear }}
        </p>
      </div>

      <!-- Right panel: blue gradient welcome (igual en ambos modos) -->
      <div class="relative hidden md:flex md:w-7/12 flex-col items-center justify-center overflow-hidden"
           style="background: linear-gradient(135deg, #1a237e 0%, #283593 30%, #3949ab 60%, #5c6bc0 100%);">
        <!-- Decorative shapes -->
        <div class="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-3xl bg-white/5 rotate-12"></div>
        <div class="pointer-events-none absolute top-1/3 -right-8 h-48 w-48 rounded-3xl bg-white/5 rotate-45"></div>
        <div class="pointer-events-none absolute -bottom-20 left-10 h-72 w-72 rounded-full bg-white/5"></div>
        <div class="pointer-events-none absolute bottom-1/4 left-1/3 h-32 w-32 rounded-2xl bg-indigo-400/20 -rotate-12"></div>
        <div class="pointer-events-none absolute top-10 left-10 h-20 w-20 rounded-xl bg-white/5 rotate-6"></div>

        <!-- Text content -->
        <div class="relative z-10 text-center px-12">
          <h2 class="text-5xl font-extrabold tracking-widest text-white uppercase mb-4" style="letter-spacing: 0.15em;">BIENVENIDO !</h2>
          <p class="text-sm font-medium text-blue-200 tracking-widest uppercase" style="letter-spacing: 0.2em;">Inicia sesión para continuar</p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly LogIn = LogIn;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Mail = Mail;
  readonly Lock = Lock;

  email = '';
  password = '';
  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  currentYear = new Date().getFullYear();

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor completa todos los campos.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const credentials: LoginRequest = {
      email: this.email,
      password: this.password,
    };

    this.authService.login(credentials).subscribe({
      next: () => {
        setTimeout(() => {
          this.isLoading.set(false);
          this.router.navigate(['/app']);
        }, 1500);
      },
      error: (err) => {
        setTimeout(() => {
          this.isLoading.set(false);
          if (err.status === 401) {
            this.errorMessage.set('Credenciales inválidas. Intenta de nuevo.');
          } else if (err.status === 0) {
            this.errorMessage.set(
              'No se pudo conectar con el servidor. Verifica tu conexión.'
            );
          } else {
            this.errorMessage.set(
              err.error?.message || 'Ocurrió un error inesperado.'
            );
          }
        }, 1500);
      },
    });
  }

  onForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }
}
