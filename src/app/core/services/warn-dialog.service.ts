import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // true = acción destructiva (rojo), false = advertencia normal (default)
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class WarnDialogService {
  private _pending = signal<PendingConfirm | null>(null);

  pending = this._pending.asReadonly();

  /**
   * Muestra el diálogo y espera la decisión del usuario.
   * Resuelve `true` si confirma, `false` si cancela o cierra el diálogo.
   */
  confirm(request: ConfirmRequest): Promise<boolean> {
    return new Promise((resolve) => {
      this._pending.set({ ...request, resolve });
    });
  }

  respond(confirmed: boolean): void {
    const current = this._pending();
    if (!current) return;
    current.resolve(confirmed);
    this._pending.set(null);
  }
}