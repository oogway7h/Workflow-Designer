import { Injectable, signal } from '@angular/core';

export interface VoiceFormContext {
  /** Flat map of field keys to human-readable labels, e.g. { name: 'Nombre', date: 'Fecha' } */
  schema: Record<string, string>;
  /** Callback invoked with the filled values after voice extraction */
  onFilled: (values: Record<string, string>) => void;
}

/**
 * Shared service that form-bearing components can register with so the global
 * voice widget can trigger voice-to-form filling.
 *
 * Usage in a form component:
 *   inject(VoiceContextService).registerForm({ schema: { ... }, onFilled: (v) => { ... } });
 *   // On destroy:
 *   inject(VoiceContextService).clearForm();
 */
@Injectable({ providedIn: 'root' })
export class VoiceContextService {
  /** The currently active form context, or null if no form is open */
  readonly activeForm = signal<VoiceFormContext | null>(null);

  registerForm(ctx: VoiceFormContext): void {
    this.activeForm.set(ctx);
  }

  clearForm(): void {
    this.activeForm.set(null);
  }
}
