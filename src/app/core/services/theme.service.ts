import { Injectable, signal, computed } from '@angular/core';

export type ThemeOption = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'app-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme = signal<ThemeOption>(this.readStoredTheme());
  theme = this._theme.asReadonly();

  private _systemPrefersDark = signal(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  /** true si lo que se ve en pantalla ahora mismo es oscuro, resolviendo 'system'. */
  isDark = computed(
    () => this._theme() === 'dark' || (this._theme() === 'system' && this._systemPrefersDark())
  );

  constructor() {
    this.applyTheme();

    // Mantiene el modo 'system' sincronizado si el SO cambia de tema
    // mientras la app está abierta (antes solo se evaluaba una vez).
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this._systemPrefersDark.set(e.matches);
      this.applyTheme();
    });
  }

  private readStoredTheme(): ThemeOption {
    return (localStorage.getItem(STORAGE_KEY) as ThemeOption | null) ?? 'light';
  }

  getTheme(): ThemeOption {
    return this._theme();
  }

  setTheme(theme: ThemeOption): void {
    localStorage.setItem(STORAGE_KEY, theme);
    this._theme.set(theme);
    this.applyTheme();
  }

  /** Alterna claro/oscuro sin pasar por 'system' — para el botón rápido del header. */
  toggleTheme(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  private applyTheme(): void {
    document.documentElement.classList.toggle('dark', this.isDark());
  }
}