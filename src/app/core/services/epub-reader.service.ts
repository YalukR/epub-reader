import { Injectable, NgZone } from '@angular/core';
import ePub, { Book, Rendition, NavItem } from 'epubjs';
import { EpubPageThumbnailsService } from './epub-page-thumbnails.service';

export interface ReaderLocation {
  cfi: string;
  percentage: number; // 0-100
}

@Injectable({ providedIn: 'root' })
export class EpubReaderService {
  private book?: Book;
  private rendition?: Rendition;

  constructor(
    private zone: NgZone,
    private thumbnailsService: EpubPageThumbnailsService // nuevo
  ) { }

  /**
   * Abre un EPUB a partir de sus bytes en memoria y lo renderiza dentro
   * del elemento dado. Llamar destroy() antes de abrir uno nuevo si ya
   * había un libro cargado.
   */
  async open(data: ArrayBuffer, container: HTMLElement, startCfi?: string): Promise<void> {
    this.book = ePub(data);
    try {
      await Promise.race([
        this.doOpen(container, startCfi),
        this.watchForUncaughtEpubErrors(),
        this.timeoutAfter(15000),
      ]); this.thumbnailsService.attach(this.book);
    } finally {
      this.stopWatchingForUncaughtEpubErrors();
    }
  }

  private async doOpen(container: HTMLElement, startCfi?: string): Promise<void> {
    await this.book!.ready;

    // Chequeo proactivo: si algún ítem del spine no tiene href resuelto,
    // el EPUB está mal armado (idref sin su manifest correspondiente) y
    // epub.js va a reventar apenas intente renderizarlo. Mejor cortar acá
    // con un mensaje claro que dejar que explote en medio del render.
    const spineItems: any[] = (this.book as any).spine?.items ?? [];
    const hasInvalidSpineItem = spineItems.some((item) => !item.href);
    if (spineItems.length === 0 || hasInvalidSpineItem) {
      throw new Error('EPUB_CORRUPTO');
    }

    this.rendition = this.book!.renderTo(container, {
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

    // No usamos themes.register()/select() para claro/oscuro: en la
    // práctica resultó inconsistente (funcionaba el primer cambio y se
    // quedaba pegado en los siguientes, por cómo epub.js reutiliza o no
    // su <style> interno según la versión). En su lugar, mantenemos
    // nosotros un único <style id="app-theme-style"> por página, que
    // reemplazamos por completo en cada cambio de tema y que se vuelve a
    // aplicar automáticamente cada vez que epub.js renderiza una página
    // nueva (cambio de capítulo, avance/retroceso).
    this.rendition.hooks.content.register((contents: any) => {
      this.applyThemeToContent(contents);
    });

    if (startCfi) {
      await this.rendition.display(startCfi);
    } else {
      await this.rendition.display();
    }
  }

  private errorListener?: (event: ErrorEvent) => void;
  private rejectionListener?: (event: PromiseRejectionEvent) => void;

  /**
   * Convierte en un rechazo real de promesa los errores que epub.js deja
   * sueltos (throws síncronos dentro de sus propios callbacks internos de
   * render, que no forman parte de la cadena de promesas que awaiteamos).
   * Sin esto, esos errores solo aparecen en consola y open() nunca se
   * entera de que algo salió mal.
   */
  private watchForUncaughtEpubErrors(): Promise<never> {
    return new Promise((_, reject) => {
      this.errorListener = (event: ErrorEvent) => {
        if (this.looksLikeEpubJsError(event.message)) {
          event.preventDefault();
          reject(new Error('EPUB_CORRUPTO'));
        }
      };
      this.rejectionListener = (event: PromiseRejectionEvent) => {
        if (this.looksLikeEpubJsError(event.reason?.message)) {
          event.preventDefault();
          reject(new Error('EPUB_CORRUPTO'));
        }
      };
      window.addEventListener('error', this.errorListener);
      window.addEventListener('unhandledrejection', this.rejectionListener);
    });
  }

  private stopWatchingForUncaughtEpubErrors(): void {
    if (this.errorListener) window.removeEventListener('error', this.errorListener);
    if (this.rejectionListener) window.removeEventListener('unhandledrejection', this.rejectionListener);
    this.errorListener = undefined;
    this.rejectionListener = undefined;
  }

  private looksLikeEpubJsError(message?: string): boolean {
    if (!message) return false;
    return message.includes('pathString is undefined') || message.includes('indexOf');
  }

  private timeoutAfter(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('EPUB_TIMEOUT')), ms);
    });
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
    this.stopWatchingForUncaughtEpubErrors();
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

  // Estado actual del tema, independiente de epub.js: es la fuente de
  // verdad que usamos tanto para pintar la página visible como para
  // repintar cada página nueva que epub.js vaya renderizando.
  private isDarkMode = false;

  setDarkMode(isDark: boolean): void {
    this.isDarkMode = isDark;
    if (!this.rendition) return;

    // El tipado de epubjs para getContents() no coincide con el runtime
    // en todas las versiones (a veces es un Contents suelto, a veces un
    // arreglo), así que normalizamos antes de iterar.
    const contents: any = this.rendition.getContents();
    const contentsList: any[] = Array.isArray(contents) ? contents : contents ? [contents] : [];
    contentsList.forEach((content) => this.applyThemeToContent(content));
  }

  /**
   * Inyecta (o reemplaza) un único <style> con las reglas del tema actual
   * dentro del documento del iframe de esa página. Al usar siempre el
   * mismo id, cada llamada REEMPLAZA el contenido anterior en vez de
   * acumular <style> compitiendo entre sí, que era la causa de que el
   * segundo cambio de tema (y siguientes) no se reflejara.
   */
  private applyThemeToContent(content: any): void {
    const doc: Document | undefined = content?.document;
    if (!doc) return;

    const rules = this.isDarkMode ? this.darkThemeRules : this.lightThemeRules;
    let styleEl = doc.getElementById('app-theme-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = 'app-theme-style';
      doc.head?.appendChild(styleEl);
    }
    styleEl.textContent = this.rulesToCss(rules);
  }

  private rulesToCss(rules: Record<string, Record<string, string>>): string {
    return Object.entries(rules)
      .map(([selector, props]) => {
        const body = Object.entries(props)
          .map(([prop, value]) => `${prop}: ${value};`)
          .join(' ');
        return `${selector} { ${body} }`;
      })
      .join('\n');
  }
}