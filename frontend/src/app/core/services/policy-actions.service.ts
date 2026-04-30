import { Injectable, signal } from '@angular/core';

/**
 * Shared service for voice-triggered policy actions.
 * The voice widget sets these signals; PolicyDesignerComponent reacts via effects.
 */
@Injectable({ providedIn: 'root' })
export class PolicyActionsService {
  /** Set to true to make PolicyDesignerComponent open the "Nueva Politica" modal */
  readonly openCreateModal = signal<boolean>(false);
}
