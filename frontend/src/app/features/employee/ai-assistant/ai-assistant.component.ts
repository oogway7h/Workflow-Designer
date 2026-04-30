import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PolicyService } from '../../../core/services/policy.service';
import { LucideAngularModule, Bot, Send, User, Lightbulb, HelpCircle, MessageSquare, FileText } from 'lucide-angular';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  template: `
    <div class="flex h-full flex-col">
      <!-- Header -->
      <div class="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <lucide-icon [img]="Bot" [size]="20" class="text-primary" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-foreground">Asistente IA</h2>
          <p class="text-xs text-muted-foreground">Ayuda y sugerencias para tus tareas</p>
        </div>
      </div>

      <!-- Chat Messages -->
      <div class="flex-1 overflow-auto p-4 space-y-4">
        @for (message of messages(); track message.id) {
          <div class="flex gap-3" [class.justify-end]="message.type === 'user'">
            @if (message.type === 'assistant') {
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <lucide-icon [img]="Bot" [size]="16" class="text-primary" />
              </div>
            }
            <div class="max-w-[70%] rounded-lg px-3 py-2" [class]="getMessageClass(message.type)">
              <p class="text-sm">{{ message.content }}</p>
              @if (message.suggestions && message.suggestions.length > 0) {
                <div class="mt-2 space-y-1">
                  @for (suggestion of message.suggestions; track $index) {
                    <button
                      (click)="applySuggestion(suggestion)"
                      class="block w-full text-left text-xs text-primary hover:text-primary/80 underline">
                      {{ suggestion }}
                    </button>
                  }
                </div>
              }
            </div>
            @if (message.type === 'user') {
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <lucide-icon [img]="User" [size]="16" class="text-muted-foreground" />
              </div>
            }
          </div>
        }

        @if (isTyping()) {
          <div class="flex gap-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <lucide-icon [img]="Bot" [size]="16" class="text-primary" />
            </div>
            <div class="rounded-lg bg-muted px-3 py-2">
              <div class="flex items-center gap-2">
                <div class="flex gap-1">
                  <div class="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style="animation-delay: 0ms"></div>
                  <div class="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style="animation-delay: 150ms"></div>
                  <div class="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style="animation-delay: 300ms"></div>
                </div>
                <span class="text-xs text-muted-foreground">Pensando...</span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Quick Actions -->
      <div class="border-t border-border bg-card p-3">
        <div class="mb-3 flex gap-2">
          <button
            (click)="quickQuestion('¿Cómo completar esta tarea?')"
            class="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <lucide-icon [img]="HelpCircle" [size]="12" />
            Cómo completar
          </button>
          <button
            (click)="quickQuestion('¿Qué documentos necesito?')"
            class="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <lucide-icon [img]="FileText" [size]="12" />
            Documentos requeridos
          </button>
          <button
            (click)="quickQuestion('¿Cuáles son los criterios de aprobación?')"
            class="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            <lucide-icon [img]="Lightbulb" [size]="12" />
            Criterios
          </button>
        </div>

        <!-- Input -->
        <div class="flex gap-2">
          <input
            [(ngModel)]="currentMessage"
            (keyup.enter)="sendMessage()"
            placeholder="Pregunta sobre tus tareas..."
            class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          <button
            (click)="sendMessage()"
            [disabled]="!currentMessage().trim() || isTyping()"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <lucide-icon [img]="Send" [size]="16" />
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AiAssistantComponent implements OnInit {
  readonly Bot = Bot;
  readonly Send = Send;
  readonly User = User;
  readonly Lightbulb = Lightbulb;
  readonly HelpCircle = HelpCircle;
  readonly MessageSquare = MessageSquare;
  readonly FileText = FileText;

  private policyService = inject(PolicyService);

  messages = signal<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: '¡Hola! Soy tu asistente de IA. Puedo ayudarte con tus tareas, explicarte procesos y darte consejos. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
      suggestions: [
        '¿Cómo completar esta tarea?',
        '¿Qué documentos necesito?',
        '¿Cuáles son los criterios de aprobación?'
      ]
    }
  ]);

  currentMessage = signal('');
  isTyping = signal(false);

  ngOnInit(): void {
    // TODO: Initialize AI assistant
  }

  sendMessage(): void {
    const message = this.currentMessage().trim();
    if (!message || this.isTyping()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date(),
    };

    this.messages.update(msgs => [...msgs, userMessage]);
    this.currentMessage.set('');
    this.isTyping.set(true);

    // Simulate AI response
    setTimeout(() => {
      this.generateResponse(message);
    }, 1000 + Math.random() * 2000);
  }

  quickQuestion(question: string): void {
    this.currentMessage.set(question);
    this.sendMessage();
  }

  applySuggestion(suggestion: string): void {
    this.currentMessage.set(suggestion);
    this.sendMessage();
  }

  private generateResponse(userMessage: string): void {
    let response: ChatMessage;

    if (userMessage.toLowerCase().includes('cómo completar')) {
      response = {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Para completar esta tarea, sigue estos pasos:\n\n1. Revisa toda la documentación adjunta\n2. Verifica que cumpla con los criterios de aprobación\n3. Si es necesario, solicita información adicional\n4. Toma una decisión fundamentada\n5. Documenta tu razonamiento',
        timestamp: new Date(),
      };
    } else if (userMessage.toLowerCase().includes('documentos')) {
      response = {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Para esta tarea necesitas:\n\n• Documento de solicitud original\n• Presupuesto detallado (si aplica)\n• Justificación del requerimiento\n• Aprobaciones previas (si corresponde)\n\nAsegúrate de que todos los documentos estén completos antes de proceder.',
        timestamp: new Date(),
      };
    } else if (userMessage.toLowerCase().includes('criterios')) {
      response = {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Los criterios principales de aprobación son:\n\n• Cumplimiento del presupuesto aprobado\n• Justificación clara del requerimiento\n• Alineación con objetivos estratégicos\n• Disponibilidad de recursos\n• Cumplimiento de políticas internas\n\nRecuerda que cada proceso puede tener criterios específicos adicionales.',
        timestamp: new Date(),
      };
    } else {
      response = {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Entiendo tu pregunta. Basándome en el contexto de tu tarea actual, te recomiendo revisar la documentación completa y considerar los criterios de aprobación estándar. ¿Hay algo específico en lo que necesitas más ayuda?',
        timestamp: new Date(),
        suggestions: [
          'Explicar criterios de aprobación',
          'Ayuda con documentación',
          'Mejores prácticas'
        ]
      };
    }

    this.messages.update(msgs => [...msgs, response]);
    this.isTyping.set(false);
  }

  getMessageClass(type: 'user' | 'assistant'): string {
    return type === 'user'
      ? 'bg-primary text-primary-foreground ml-auto'
      : 'bg-muted text-muted-foreground';
  }
}