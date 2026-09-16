import { Injectable, OnDestroy } from '@angular/core';

/**
 * Observa la clase 'dark' en <html> y notifica cambios.
 * Pensado para sincronizar contenido fuera del alcance de Tailwind
 * (iframes, canvas, librerías de terceros con su propio tema).
 *
 * Provéelo en el array `providers` del componente que lo use, no en root,
 * para que Angular lo destruya junto con el componente.
 */
@Injectable()
export class DarkModeSyncService implements OnDestroy {
  private observer?: MutationObserver;

  watch(onChange: (isDark: boolean) => void): void {
    onChange(this.isDark());
    this.observer = new MutationObserver(() => onChange(this.isDark()));
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  private isDark(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}