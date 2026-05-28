import { Component, signal, inject, ViewChild, ElementRef, AfterViewChecked, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Bot, X, Send, User, ChevronDown, BotMessageSquare,Pointer,BadgeInfo } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { AiChatService, AIChatRequest } from '../../../core/services/ai-chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { NlpService } from '../../../core/services/nlp.service';
import { PolicyActionsService } from '../../../core/services/policy-actions.service';



interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <!-- Floating Button -->
    <div class="fixed bottom-6 right-6 z-50">
      <button 
        *ngIf="!isOpen()"
        (click)="toggleChat()"
        class="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110"
        aria-label="Abrir Asistente IA">
        <lucide-icon [img]="BotMessageSquare" class="w-6 h-6"></lucide-icon>
      </button>

      <!-- Chat Window -->
      <div 
        *ngIf="isOpen()"
        class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-80 sm:w-96 flex flex-col h-[500px] border border-gray-200 dark:border-slate-700 animate-in slide-in-from-bottom-5 fade-in duration-300">
        
        <!-- Header -->
        <div class="bg-blue-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="bg-white/20 p-1.5 rounded-full">
              <lucide-icon [img]="Bot" class="w-5 h-5"></lucide-icon>
            </div>
            <div>
              <h3 class="font-semibold text-sm">Asistente IA</h3>
              <p class="text-xs text-blue-100 flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-green-400"></span> En línea
              </p>
            </div>
          </div>
          <button 
            (click)="toggleChat()"
            class="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <lucide-icon [img]="ChevronDown" class="w-5 h-5"></lucide-icon>
          </button>
        </div>

        <!-- Messages Area -->
        <div class="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-gray-50 dark:bg-slate-900 scroll-smooth" #messagesContainer>
          <div *ngIf="messages().length === 0" class="text-center text-gray-500 dark:text-gray-400 mt-4">
            <lucide-icon [img]="Bot" class="w-12 h-12 mx-auto mb-2 opacity-50"></lucide-icon>
            <p class="text-sm">¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte con tus flujos y tareas?</p>
          </div>
          
          <div *ngFor="let msg of messages()" class="flex gap-2 max-w-[85%]" [ngClass]="msg.isUser ? 'ml-auto flex-row-reverse' : ''">
            <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                 [ngClass]="msg.isUser ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300'">
              <lucide-icon [img]="msg.isUser ? User : Bot" class="w-4 h-4"></lucide-icon>
            </div>
            
            <div class="px-4 py-2 rounded-2xl shadow-sm text-sm"
                 [ngClass]="msg.isUser 
                   ? 'bg-blue-600 text-white rounded-tr-sm' 
                   : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-tl-sm'">
              <p class="whitespace-pre-wrap">{{ msg.text }}</p>
              <span class="text-[10px] block mt-1" [ngClass]="msg.isUser ? 'text-blue-200' : 'text-gray-400'">
                {{ msg.timestamp | date:'shortTime' }}
              </span>
            </div>
          </div>

          <!-- Typing indicator -->
          <div *ngIf="isLoading()" class="flex gap-2 max-w-[85%]">
            <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
              <lucide-icon [img]="Bot" class="w-4 h-4"></lucide-icon>
            </div>
            <div class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center shadow-sm">
              <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl">
          <form (ngSubmit)="sendMessage()" class="flex gap-2 items-center">
            <input 
              type="text" 
              [(ngModel)]="userInput" 
              name="userInput"
              placeholder="Escribe tu mensaje..." 
              class="flex-1 bg-gray-100 dark:bg-slate-900 border-transparent rounded-full px-4 py-2 text-sm focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-0 transition-colors"
              [disabled]="isLoading()"
              autocomplete="off"
              (keydown.enter)="sendMessage($event)">
            
            <button 
              type="submit" 
              [disabled]="!userInput.trim() || isLoading()"
              class="bg-blue-600 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm">
              <lucide-icon [img]="Send" class="w-4 h-4"></lucide-icon>
            </button>
          </form>
        </div>
      </div>
    </div>
  `
})
export class AiChatWidgetComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  readonly BotMessageSquare = BotMessageSquare;
  readonly Bot = Bot;
  readonly User = User;
  readonly ChevronDown = ChevronDown;
  readonly Send = Send;
  readonly BadgeInfo = BadgeInfo;

  private aiService = inject(AiChatService);
  private authService = inject(AuthService);
  private nlpService = inject(NlpService);
  private policyActionsService = inject(PolicyActionsService);
  public router = inject(Router);
  
  isOpen = signal(false);
  isLoading = signal(false);
  messages = signal<Message[]>([]);
  userInput = '';

  constructor() {
    // When voice widget sends a regular message, open chat and auto-send it
    effect(() => {
      const pending = this.aiService.pendingVoiceMessage();
      if (pending) {
        this.isOpen.set(true);
        this.aiService.isChatOpen.set(true);
        this.aiService.pendingVoiceMessage.set(null);
        this.userInput = pending;
        setTimeout(() => this.sendMessage(), 100);
      }
    });

    // When voice widget sends a policy generation message, use the generate-policy endpoint
    effect(() => {
      const pending = this.aiService.pendingVoicePolicyMessage();
      if (pending) {
        this.isOpen.set(true);
        this.aiService.isChatOpen.set(true);
        this.aiService.pendingVoicePolicyMessage.set(null);
        this.userInput = pending;
        setTimeout(() => this.sendPolicyMessage(), 100);
      }
    });
  }

  toggleChat() {
    this.isOpen.update(v => !v);
    this.aiService.isChatOpen.set(this.isOpen());
  }

  sendMessage(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    
    if (!this.userInput.trim() || this.isLoading()) return;

    const userMessage: Message = {
      text: this.userInput.trim(),
      isUser: true,
      timestamp: new Date()
    };

    this.messages.update(msgs => [...msgs, userMessage]);
    const currentPrompt = this.userInput;
    this.userInput = '';
    this.isLoading.set(true);

    const currentUser = this.authService.currentUser();
    const userRole = currentUser?.role?.toLowerCase() || 'funcionario';

    this.nlpService.detectIntent(currentPrompt, this.router.url).subscribe({
      next: (res) => {
        if (res.intent === 'generate_policy') {
          this._executePolicyMessage(currentPrompt, userRole, false);
        } else if (res.intent === 'modify_diagram') {
          this._executePolicyMessage(currentPrompt, userRole, true);
        } else if (res.intent === 'open_create_policy') {
          this.isLoading.set(false);
          const botMessage: Message = {
            text: 'Abriendo el formulario para crear una nueva política...',
            isUser: false,
            timestamp: new Date()
          };
          this.messages.update(msgs => [...msgs, botMessage]);
          this._handleOpenCreatePolicy();
        } else {
          this._executeChatMessage(currentPrompt, userRole);
        }
      },
      error: () => {
        this._executeChatMessage(currentPrompt, userRole);
      }
    });
  }

  private _handleOpenCreatePolicy(): void {
    const isOnPolicies = this.router.url.includes('/policies');
    if (isOnPolicies) {
      this.policyActionsService.openCreateModal.set(true);
    } else {
      this.router.navigate(['/app/policies']).then(() => {
        setTimeout(() => {
          this.policyActionsService.openCreateModal.set(true);
        }, 800);
      });
    }
  }

  private _executeChatMessage(currentPrompt: string, userRole: string) {
    const request: AIChatRequest = {
      user_role: userRole,
      current_screen: this.router.url,
      user_message: currentPrompt,
      screen_data: ''
    };

    this.aiService.getChatResponse(request).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (response) => {
        const botMessage: Message = {
          text: response.reply,
          isUser: false,
          timestamp: new Date()
        };
        this.messages.update(msgs => [...msgs, botMessage]);
      },
      error: (err: HttpErrorResponse) => {
        const errorMsg = err.error?.message || 'Lo siento, ha ocurrido un error al conectar con el servicio de IA.';
        const botMessage: Message = {
          text: errorMsg,
          isUser: false,
          timestamp: new Date()
        };
        this.messages.update(msgs => [...msgs, botMessage]);
      }
    });
  }

  private _executePolicyMessage(currentPrompt: string, userRole: string, isModification: boolean = false) {
    const request: AIChatRequest = {
      user_role: userRole,
      current_screen: this.router.url,
      user_message: currentPrompt,
      screen_data: this.aiService.activePolicyId
        ? JSON.stringify({ activePolicyId: this.aiService.activePolicyId })
        : ''
    };

    const actionObservable = isModification 
      ? this.aiService.modifyDiagram(request)
      : this.aiService.generatePolicy(request);

    actionObservable.pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (response) => {
        const botMessage: Message = {
          text: response.reply || (isModification ? 'Diagrama modificado con éxito.' : 'Respuesta de creación de política.'),
          isUser: false,
          timestamp: new Date()
        };
        this.messages.update(msgs => [...msgs, botMessage]);
      },
      error: (err: HttpErrorResponse) => {
        const errorMsg = err.error?.message || (isModification ? 'Lo siento, ha ocurrido un error al modificar el diagrama.' : 'Lo siento, ha ocurrido un error al generar la política.');
        const botMessage: Message = {
          text: errorMsg,
          isUser: false,
          timestamp: new Date()
        };
        this.messages.update(msgs => [...msgs, botMessage]);
      }
    });
  }

  sendPolicyMessage(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    
    if (!this.userInput.trim() || this.isLoading()) return;

    const userMessage: Message = {
      text: this.userInput.trim(),
      isUser: true,
      timestamp: new Date()
    };

    this.messages.update(msgs => [...msgs, userMessage]);
    const currentPrompt = this.userInput;
    this.userInput = '';
    this.isLoading.set(true);

    const currentUser = this.authService.currentUser();
    const userRole = currentUser?.role?.toLowerCase() || 'funcionario';

    const request: AIChatRequest = {
      user_role: userRole,
      current_screen: this.router.url,
      user_message: currentPrompt,
      screen_data: this.aiService.activePolicyId
        ? JSON.stringify({ activePolicyId: this.aiService.activePolicyId })
        : ''
    };

    this.aiService.generatePolicy(request).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (response) => {
        const botMessage: Message = {
          text: response.reply || 'Respuesta de creación de política.',
          isUser: false,
          timestamp: new Date()
        };
        this.messages.update(msgs => [...msgs, botMessage]);
      },
      error: (err: HttpErrorResponse) => {
        const errorMsg = err.error?.message || 'Lo siento, ha ocurrido un error al conectar con el servicio de IA.';
        const botMessage: Message = {
          text: errorMsg,
          isUser: false,
          timestamp: new Date()
        };
        this.messages.update(msgs => [...msgs, botMessage]);
      }
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }
}