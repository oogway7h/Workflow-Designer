import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Mic, MicOff, X, Navigation, Speech } from 'lucide-angular';
import { NlpService } from '../../../core/services/nlp.service';
import { AuthService } from '../../../core/services/auth.service';
import { AiChatService } from '../../../core/services/ai-chat.service';
import { VoiceContextService } from '../../../core/services/voice-context.service';
import { PolicyActionsService } from '../../../core/services/policy-actions.service';
import { MENU_CONFIG } from '../../../core/config/menu.config';

type WidgetState = 'idle' | 'listening' | 'processing' | 'error';

@Component({
  selector: 'app-voice-nav-widget',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <!-- Voice Nav Widget -->
    <div class="fixed bottom-6 z-50 transition-all duration-300" [style.right]="isChatOpen() ? '26.5rem' : '5.5rem'">

      <!-- Status Toast -->
      @if (statusMessage()) {
        <div class="mb-3 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs text-white shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-200 whitespace-nowrap">
          @if (state() === 'listening') {
            <span class="flex h-2 w-2 shrink-0">
              <span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          } @else if (state() === 'processing') {
            <span class="flex gap-0.5">
              <span class="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style="animation-delay:0s"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style="animation-delay:0.15s"></span>
              <span class="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style="animation-delay:0.3s"></span>
            </span>
          }
          {{ statusMessage() }}
          @if (state() === 'error') {
            <button (click)="clearStatus()" class="ml-1 text-gray-400 hover:text-white">
              <lucide-icon [img]="X" [size]="12" />
            </button>
          }
        </div>
      }

      <!-- Mic Button -->
      <button
        (click)="onButtonClick()"
        [disabled]="state() === 'processing'"
        class="relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        [class]="buttonClass()"
        [attr.aria-label]="state() === 'idle' ? 'Activar asistente de voz' : 'Detener'"
        title="Asistente por voz: navegación, preguntas, generar políticas, rellenar formularios"
      >
        <!-- Pulse ring when listening -->
        @if (state() === 'listening') {
          <span class="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping"></span>
        }

        @if (state() === 'processing') {
          <span class="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
        } @else if (state() === 'listening') {
          <lucide-icon [img]="Mic" class="w-6 h-6 text-white" />
        } @else {
          <lucide-icon [img]="Speech" class="w-6 h-6 text-white" />
        }
      </button>
    </div>
  `,
})
export class VoiceNavWidgetComponent {
  readonly Mic = Mic;
  readonly MicOff = MicOff;
  readonly X = X;
  readonly Navigation = Navigation;
  readonly Speech = Speech;

  private readonly nlpService = inject(NlpService);
  private readonly authService = inject(AuthService);
  private readonly aiChatService = inject(AiChatService);
  private readonly voiceContextService = inject(VoiceContextService);
  private readonly policyActionsService = inject(PolicyActionsService);
  private readonly router = inject(Router);

  isChatOpen = this.aiChatService.isChatOpen;

  state = signal<WidgetState>('idle');
  statusMessage = signal<string>('');

  private recognition: any = null;

  buttonClass(): string {
    switch (this.state()) {
      case 'listening':
        return 'bg-red-500 hover:bg-red-600';
      case 'processing':
        return 'bg-purple-600 hover:bg-purple-700';
      case 'error':
        return 'bg-orange-500 hover:bg-orange-600';
      default:
        return 'bg-violet-600 hover:bg-violet-700';
    }
  }

  onButtonClick(): void {
    if (this.state() === 'listening') {
      this.stopListening();
    } else if (this.state() === 'idle' || this.state() === 'error') {
      this.startListening();
    }
  }

  private startListening(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.state.set('error');
      this.statusMessage.set('Tu navegador no soporta reconocimiento de voz.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-ES';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.state.set('listening');
    this.statusMessage.set('Escuchando… Di lo que necesitas');

    this.recognition.onresult = (event: any) => {
      const spokenText: string = event.results[0][0].transcript;
      this.state.set('processing');
      this.statusMessage.set(`"${spokenText}"`);
      this.processIntent(spokenText);
    };

    this.recognition.onerror = (event: any) => {
      this.state.set('error');
      this.statusMessage.set(
        event.error === 'no-speech' ? 'No se detectó voz. Intenta de nuevo.' : 'Error al capturar audio.'
      );
      setTimeout(() => this.clearStatus(), 4000);
    };

    this.recognition.onend = () => {
      if (this.state() === 'listening') {
        this.state.set('idle');
        this.clearStatus();
      }
    };

    this.recognition.start();
  }

  private stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this.state.set('idle');
    this.clearStatus();
  }

  // ── Intent dispatcher ──────────────────────────────────────────────────────

  private processIntent(spokenText: string): void {
    this.nlpService.detectIntent(spokenText, this.router.url).subscribe({
      next: (res) => {
        switch (res.intent) {
          case 'navigate':
            this.handleNavigate(spokenText);
            break;
          case 'open_create_policy':
            this.handleOpenCreatePolicy();
            break;
          case 'generate_policy':
            this.handleGeneratePolicy(spokenText);
            break;
          case 'fill_form':
            this.handleFillForm(spokenText);
            break;
          case 'ask':
          default:
            this.handleAsk(spokenText);
            break;
        }
      },
      error: () => {
        // Fallback: treat as navigate (previous behaviour)
        this.handleNavigate(spokenText);
      },
    });
  }

  // ── Intent handlers ────────────────────────────────────────────────────────

  private handleNavigate(spokenText: string): void {
    this.nlpService.navigate(spokenText).subscribe({
      next: (response) => {
        const route = response.route;
        this.state.set('idle');

        if (!route || route === '/unknown') {
          this.state.set('error');
          this.statusMessage.set('No entendí a dónde quieres ir. Intenta de nuevo.');
          setTimeout(() => this.clearStatus(), 4000);
          return;
        }

        const finalRoute = this.resolveRoute(route);
        this.statusMessage.set(`Navegando a: ${this.getRouteLabel(route)}`);
        setTimeout(() => {
          this.router.navigate([finalRoute]);
          this.clearStatus();
        }, 800);
      },
      error: () => {
        this.state.set('error');
        this.statusMessage.set('Error al conectar con el servicio NLP.');
        setTimeout(() => this.clearStatus(), 4000);
      },
    });
  }

  private handleAsk(spokenText: string): void {
    this.state.set('idle');
    this.statusMessage.set('Enviando al asistente IA…');
    // Open chat and auto-send the question
    this.aiChatService.sendVoiceMessage(spokenText);
    setTimeout(() => this.clearStatus(), 1500);
  }

  private handleOpenCreatePolicy(): void {
    this.state.set('idle');
    const isOnPolicies = this.router.url.includes('/policies');
    if (isOnPolicies) {
      this.statusMessage.set('Abriendo formulario de nueva política…');
      this.policyActionsService.openCreateModal.set(true);
      setTimeout(() => this.clearStatus(), 1500);
    } else {
      this.statusMessage.set('Navegando a políticas…');
      this.router.navigate(['/app/policies']).then(() => {
        setTimeout(() => {
          this.policyActionsService.openCreateModal.set(true);
          this.clearStatus();
        }, 800);
      });
    }
  }

  private handleGeneratePolicy(spokenText: string): void {
    this.state.set('idle');
    // If a policy is already selected in the editor, generate the diagram directly
    if (this.aiChatService.activePolicyId) {
      this.statusMessage.set('Generando diagrama desde tu descripción…');
      this.aiChatService.sendVoicePolicyMessage(`Genera el diagrama para: ${spokenText}`);
      setTimeout(() => this.clearStatus(), 1500);
      return;
    }
    const isInPolicies = this.router.url.includes('/policies');
    if (!isInPolicies) {
      this.statusMessage.set('Abriendo diseñador…');
      this.router.navigate(['/app/policies']).then(() => {
        setTimeout(() => {
          this.aiChatService.sendVoicePolicyMessage(`Genera una política con el siguiente flujo: ${spokenText}`);
          this.clearStatus();
        }, 1200);
      });
    } else {
      this.statusMessage.set('Generando política desde tu descripción…');
      this.aiChatService.sendVoicePolicyMessage(`Genera una política con el siguiente flujo: ${spokenText}`);
      setTimeout(() => this.clearStatus(), 1500);
    }
  }

  private handleFillForm(spokenText: string): void {
    const formCtx = this.voiceContextService.activeForm();
    if (!formCtx) {
      // No form registered — fall back to AI ask
      this.handleAsk(spokenText);
      return;
    }

    this.nlpService.fillForm(spokenText, formCtx.schema).subscribe({
      next: (res) => {
        this.state.set('idle');
        formCtx.onFilled(res.filledForm as Record<string, string>);
        this.statusMessage.set('¡Formulario rellenado con tu voz!');
        setTimeout(() => this.clearStatus(), 2500);
      },
      error: () => {
        this.state.set('error');
        this.statusMessage.set('Error al rellenar el formulario.');
        setTimeout(() => this.clearStatus(), 4000);
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private resolveRoute(route: string): string {
    if (route.startsWith('/app/')) return route;

    const role = this.authService.currentUser()?.role;
    const routeMap: Record<string, string> = {
      '/home': '/app/dashboard',
      '/dashboard': '/app/dashboard',
      '/profile': '/app/profile',
      '/users': '/app/users',
      '/settings': '/app/settings',
      '/empresa': '/app/empresa',
      '/policies': '/app/policies',
      '/designer': '/app/designer',
      '/manager/instances': '/app/manager/instances',
      '/manager/incoming-requests': '/app/manager/incoming-requests',
      '/manager/history': '/app/manager/history',
      '/requests': '/app/manager/incoming-requests',
      '/instances': '/app/manager/instances',
      '/employee/inbox': '/app/employee/inbox',
      '/employee/history': '/app/employee/history',
      '/inbox': '/app/employee/inbox',
      '/my-instances': role === 'EMPLOYEE' ? '/app/employee/inbox' : '/app/manager/instances',
      '/history': role === 'EMPLOYEE' ? '/app/employee/history' : '/app/manager/history',
      '/catalog': '/app/dashboard',
    };

    return routeMap[route] ?? '/app/dashboard';
  }

  private getRouteLabel(route: string): string {
    const menuItem = MENU_CONFIG.find((m) => m.path === route || route.includes(m.path.split('/').pop() ?? ''));
    return menuItem?.label ?? route;
  }

  clearStatus(): void {
    this.statusMessage.set('');
    if (this.state() === 'error') this.state.set('idle');
  }
}
