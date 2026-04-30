import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmService {
  visible = signal(false);
  options = signal<ConfirmOptions>({
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    variant: 'default',
  });

  private _result$ = new Subject<boolean>();

  confirm(opts: ConfirmOptions): Promise<boolean> {
    this.options.set({
      confirmLabel: 'Confirmar',
      cancelLabel: 'Cancelar',
      variant: 'default',
      ...opts,
    });
    this.visible.set(true);
    return new Promise<boolean>((resolve) => {
      const sub = this._result$.subscribe((result) => {
        sub.unsubscribe();
        resolve(result);
      });
    });
  }

  respond(result: boolean): void {
    this.visible.set(false);
    this._result$.next(result);
  }
}
