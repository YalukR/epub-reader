import { Injectable, NgZone } from '@angular/core';
import ePub, { Book, Rendition, NavItem } from 'epubjs';

export interface ReaderLocation {
  cfi: string;
  percentage: number; // 0-100
}

@Injectable({ providedIn: 'root' })
export class EpubReaderService {
  private book?: Book;
  private rendition?: Rendition;

  constructor(private zone: NgZone) { }

  /**
   * Abre un EPUB a partir de sus bytes en memoria y lo renderiza dentro
   * del elemento dado. Llamar destroy() antes de abrir uno nuevo si ya
   * había un libro cargado.
   */
  async open(
    data: ArrayBuffer,
    container: HTMLElement,
    startCfi?: string
  ): Promise<void> {
    this.book = ePub(data);
    this.rendition = this.book.renderTo(container, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      // 'none' fuerza una sola columna: en pantallas anchas 'auto' puede
      // generar dos columnas más anchas que el contenedor y producir
      // scroll horizontal, poco predecible en apps móviles con Capacitor.
      spread: 'none',
    });

    // Se aplica siempre, sin importar el tema claro/oscuro activo
    // (se combina con él en vez de reemplazarlo).
    this.rendition.themes.default(this.baseThemeRules);

    await this.rendition.display(startCfi);
  }

  /**
   * Suscribe un callback al cambio de ubicación (se dispara en cada
   * cambio de página). Envuelto en NgZone para que Angular detecte
   * el cambio, ya que epub.js emite estos eventos desde dentro
   * del iframe, fuera de la zona de Angular.
   */
  onLocationChanged(callback: (location: ReaderLocation) => void): void {
    if (!this.rendition || !this.book) return;

    this.rendition.on('relocated', (location: any) => {
      this.zone.run(() => {
        const cfi: string = location.start.cfi;
        const percentage = this.book!.locations.percentageFromCfi(cfi) * 100;
        callback({ cfi, percentage: Math.round(percentage * 10) / 10 });
      });
    });
  }

  async next(): Promise<void> {
    await this.rendition?.next();
  }

  async prev(): Promise<void> {
    await this.rendition?.prev();
  }

  async goTo(cfi: string): Promise<void> {
    await this.rendition?.display(cfi);
  }

  /**
   * Genera el índice de ubicaciones necesario para calcular porcentajes
   * de progreso. Es costoso (recorre todo el libro), así que llámalo una
   * sola vez por sesión de lectura, después de abrir el libro.
   */
  async generateLocations(): Promise<void> {
    await this.book?.locations.generate(1024);
  }

  async getToc(): Promise<NavItem[]> {
    const navigation = await this.book?.loaded.navigation;
    return navigation?.toc ?? [];
  }

  /** Metadata básica (título, autor, portada) sin necesidad de renderizar nada. */
  async getMetadata(): Promise<{
    title: string;
    author: string;
    coverUrl: string | null;
  }> {
    if (!this.book) throw new Error('No hay ningún libro abierto.');
    const metadata = await this.book.loaded.metadata;
    let coverUrl: string | null = null;
    try {
      coverUrl = await this.book.coverUrl();
    } catch {
      coverUrl = null;
    }
    return {
      title: metadata.title,
      author: metadata.creator,
      coverUrl,
    };
  }

  /** Ajusta el tamaño de fuente en caliente (útil para el selector de tema/lectura). */
  setFontSize(percent: number): void {
    this.rendition?.themes.fontSize(`${percent}%`);
  }

  destroy(): void {
    this.rendition?.destroy();
    this.book?.destroy();
    this.rendition = undefined;
    this.book = undefined;
  }

  // Reglas que aplican siempre, sin importar el tema claro/oscuro.
  // Ya NO tocan overflow de html/body: eso rompía el mecanismo interno
  // de paginación de epub.js (que ya evita el scroll por su cuenta).
  // Solo cubrimos el caso borde real: que un elemento puntual (imagen,
  // tabla, bloque de código) se desborde de los límites de una página.
  private readonly baseThemeRules = {
    'img, svg': {
      'max-width': '100% !important',
      'max-height': '100% !important',
      'object-fit': 'contain !important',
    },
    table: {
      'max-width': '100% !important',
    },
    pre: {
      'white-space': 'pre-wrap !important',
      'word-wrap': 'break-word !important',
    },
  };

  private readonly lightThemeRules = {
    body: {
      background: '#faf6ee !important',
      color: '#2b2620 !important',
    },
    'a, a:link': {
      color: '#a8763f !important',
    },
  };

  private readonly darkThemeRules = {
    body: {
      background: '#18181a !important',
      color: '#d8d8d4 !important',
    },
    'a, a:link': {
      color: '#5fd3e8 !important',
    },
  };

  setDarkMode(isDark: boolean): void {
    if (!this.rendition) return;

    this.rendition.themes.register('light', this.lightThemeRules);
    this.rendition.themes.register('dark', this.darkThemeRules);
    this.rendition.themes.select(isDark ? 'dark' : 'light');
  }
}