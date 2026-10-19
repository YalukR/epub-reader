import { Injectable } from '@angular/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

@Injectable({ providedIn: 'root' })
export class ScreenAwakeService {
  async enable(): Promise<void> {
    try {
      if ((await KeepAwake.isSupported()).isSupported) await KeepAwake.keepAwake();
    } catch (err) {
      console.warn('No se pudo mantener la pantalla encendida:', err);
    }
  }

  async disable(): Promise<void> {
    try {
      await KeepAwake.allowSleep();
    } catch { /* nada que hacer */ }
  }
}