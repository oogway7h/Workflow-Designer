import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AIChatRequest {
  user_role: string;
  current_screen: string;
  user_message: string;
  screen_data: string;
}

export interface AIChatResponse {
  reply: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/workflows/ai`;
  public isChatOpen = signal<boolean>(false);
  public activePolicyId: string | null = null;
  /** Message injected by voice widget — the chat widget auto-sends it via regular chat */
  public pendingVoiceMessage = signal<string | null>(null);
  /** Message injected by voice widget — the chat widget auto-sends it via generate-policy endpoint */
  public pendingVoicePolicyMessage = signal<string | null>(null);

  getChatResponse(request: AIChatRequest): Observable<AIChatResponse> {
    return this.http.post<AIChatResponse>(`${this.apiUrl}/chat`, request);
  }

  generatePolicy(request: AIChatRequest): Observable<AIChatResponse> {
    return this.http.post<AIChatResponse>(`${environment.apiUrl}/workflows/ai/generate-policy`, request);
  }

  /** Opens the chat panel and queues a message to be auto-sent via regular chat */
  sendVoiceMessage(message: string): void {
    this.pendingVoiceMessage.set(message);
    this.isChatOpen.set(true);
  }

  /** Opens the chat panel and queues a policy generation message */
  sendVoicePolicyMessage(message: string): void {
    this.pendingVoicePolicyMessage.set(message);
    this.isChatOpen.set(true);
  }
}
