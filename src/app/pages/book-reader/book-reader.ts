import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  signal,
  computed,
  effect,
  inject,
  NgZone,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { NavItem } from 'epubjs';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';

import {
  EpubReaderService,
  ReaderLocation,
  READER_FONTS,
} from '../../core/services/epub-reader.service';
import { BookService } from '../../core/services/book.service';
import { FileImportService } from '../../core/services/file-import.service';
import { ReadingProgressService } from '../../core/services/reading-progress.service';
import { BookmarkService } from '../../core/services/book-mark.service';
import { HighlightService } from '../../core/services/highlight.service';
import { ThemeService } from '../../core/services/theme.service';
import { PageTitleService } from '../../core/services/page-title.service';
import { ImmersiveService } from '../../core/services/immersive.service';
import { SettingsService, DEFAULT_READER_SETTINGS } from '../../core/services/settings.service';
import { ScreenAwakeService } from '../../core/services/screen-awake.service';
import { ReaderTocDrawer } from './reader-toc-drawer/reader-toc-drawer';
import { ReaderSettingsDrawer } from './reader-settings-drawer/reader-settings-drawer';
import { EpubPageThumbnailsService } from '../../core/services/epub-page-thumbnails.service';
import { Book, Bookmark, Highlight } from '../../core/models/database.model';

@Component({
  selector: 'app-book-reader',
  standalone: true,
  imports: [ButtonModule, ReaderTocDrawer, ReaderSettingsDrawer],
  templateUrl: './book-reader.html',
  styleUrl: './book-reader.css',
})
export class BookReader implements OnInit, OnDestroy {
  @ViewChild('readerContainer', { static: true }) readerContainer!: ElementRef<HTMLElement>;

  private pageTitleService = inject(PageTitleService);
  private thumbnailsService = inject(EpubPageThumbnailsService);
  private highlightService = inject(HighlightService);
  private immersive = inject(ImmersiveService);
  private settingsService = inject(SettingsService);
  private screenAwake = inject(ScreenAwakeService);

  isCarouselOpen = signal(false);
  pageCfis = signal<string[]>([]);
  currentPageIndex = signal(-1);

  book = signal<Book | null>(null);
  finished = signal(false);
  toc = signal<NavItem[]>([]);
  bookmarks = signal<Bookmark[]>([]);

  progressPercentage = signal(0);
  currentCfi = signal<string | null>(null);

  // Ajustes de lectura (persistidos en SQLite)
  fontSize = signal(DEFAULT_READER_SETTINGS.fontSize);
  fontId = signal(DEFAULT_READER_SETTINGS.fontId);
  lineHeight = signal(DEFAULT_READER_SETTINGS.lineHeight);
  margin = signal(DEFAULT_READER_SETTINGS.margin);

  isLoading = signal(true);
  isTocOpen = signal(false);
  isSettingsOpen = signal(false);
  errorMessage = signal<string | null>(null);

  // Subrayados
  highlights = signal<Highlight[]>([]);
  pendingSelection = signal<{ cfiRange: string; text: string } | null>(null);
  activeHighlight = signal<Highlight | null>(null);
  readonly highlightColors = ['#FFEB3B', '#A8D46C', '#5FD3E8', '#F48FB1'];

  isCurrentPageBookmarked = computed(() => {
    const cfi = this.currentCfi();
    if (!cfi) return false;
    return this.bookmarks().some((b) => b.cfi === cfi);
  });

  bookmarkedPageIndices = computed(() => {
    // Depende de pageCfis: se recalcula cuando terminan de generarse las locations.
    if (this.pageCfis().length === 0) return [];
    const indices = new Set<number>();
    for (const b of this.bookmarks()) {
      const i = this.thumbnailsService.getLocationIndexForCfi(b.cfi);
      if (i >= 0) indices.add(i);
    }
    return [...indices];
  });

  private bookId!: number;
  private lastHighlightTap = 0;

  // Progreso
  private saveProgressTimeout?: ReturnType<typeof setTimeout>;
  private pendingLocation: ReaderLocation | null = null;
  private locationsReady = false;
  private savedPercentage = 0;
  private appStateListener?: PluginListenerHandle;

  private saveSettingsTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private epubReader: EpubReaderService,
    private themeService: ThemeService,
    private bookService: BookService,
    private fileImportService: FileImportService,
    private readingProgressService: ReadingProgressService,
    private bookmarkService: BookmarkService,
    private zone: NgZone
  ) {
    this.pageTitleService.enableBack();

    effect(() => {
      this.pageTitleService.setActions([
        {
          icon: this.isCurrentPageBookmarked() ? 'pi-bookmark-fill' : 'pi-bookmark',
          label: this.isCurrentPageBookmarked() ? 'Quitar marcador' : 'Marcar página',
          active: this.isCurrentPageBookmarked(),
          onClick: () => this.toggleBookmark(),
        },
        {
          icon: 'pi-list',
          label: 'Índice y marcadores',
          onClick: () => this.isTocOpen.set(true),
        },
        {
          icon: 'pi-cog',
          label: 'Ajustes de lectura',
          onClick: () => this.isSettingsOpen.set(true),
        },
      ]);
    });

    effect(() => {
      this.pageTitleService.setFooter({
        percentage: this.progressPercentage(),
        onPrev: () => this.prev(),
        onNext: () => this.next(),
        isCarouselOpen: this.isCarouselOpen(),
        onToggleCarousel: () => this.toggleCarousel(),
        pageCfis: this.pageCfis(),
        currentPageIndex: this.currentPageIndex(),
        bookmarkedIndices: this.bookmarkedPageIndices(),
        onPageSelected: (index: number) => this.goToPage(index),
      });
    });

    effect(() => {
      this.epubReader.setDarkMode(this.themeService.isDark());
    });
  }

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;

    if (!idParam || Number.isNaN(id)) {
      this.errorMessage.set('Libro no válido.');
      this.isLoading.set(false);
      return;
    }
    this.bookId = id;

    this.screenAwake.enable();

    // Si la app pasa a segundo plano (Android puede cerrarla), guarda ya.
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) this.flushProgress();
    }).then((handle) => (this.appStateListener = handle));

    await this.openBook();
  }

  ngOnDestroy(): void {
    this.appStateListener?.remove();
    this.immersive.set(false);
    this.screenAwake.disable();
    this.flushProgress(); // guarda la última posición pendiente antes de destruir
    this.epubReader.destroy();
    this.pageTitleService.clear();
  }

  private async openBook(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const book = await this.bookService.getBookById(this.bookId);
      if (!book) {
        this.errorMessage.set('No se encontró el libro.');
        return;
      }
      this.book.set(book);
      this.finished.set(!!book.finishedAt);
      this.pageTitleService.setTitle(book.title);

      const [bytes, progress, bookmarks, highlights, settings] = await Promise.all([
        this.fileImportService.readEpubBytes(book.filePath),
        this.readingProgressService.getProgress(this.bookId),
        this.bookmarkService.getBookmarksForBook(this.bookId),
        this.highlightService.getHighlightsForBook(this.bookId),
        this.settingsService.getReaderSettings(),
      ]);

      this.zone.run(() => {
        this.bookmarks.set(bookmarks);
        this.fontSize.set(settings.fontSize);
        this.fontId.set(settings.fontId);
        this.lineHeight.set(settings.lineHeight);
        this.margin.set(settings.margin);
        if (progress?.percentage) {
          this.savedPercentage = progress.percentage;
          this.progressPercentage.set(Math.round(progress.percentage * 10) / 10);
        }
      });

      await this.epubReader.open(bytes, this.readerContainer.nativeElement, progress?.cfi);
      this.epubReader.setDarkMode(this.themeService.isDark());

      // Aplica los ajustes guardados
      this.epubReader.setFontSize(settings.fontSize);
      this.epubReader.setFontFamily(READER_FONTS.find((f) => f.id === settings.fontId)?.css ?? null);
      this.epubReader.setLineHeight(settings.lineHeight);
      this.epubReader.relayout(); // el margen (padding del contenedor) ya está puesto

      // Subrayados
      this.highlights.set(highlights);
      highlights.forEach((h) => this.renderHighlight(h));

      this.epubReader.onTextSelected((sel) => {
        this.activeHighlight.set(null);
        this.pendingSelection.set(sel);
      });

      this.epubReader.onTap(() => this.onReaderTap());

      this.epubReader.onLocationChanged((location: ReaderLocation) => {
        this.pendingSelection.set(null);
        this.activeHighlight.set(null);

        this.currentCfi.set(location.cfi);
        this.progressPercentage.set(location.percentage);
        this.currentPageIndex.set(this.thumbnailsService.getLocationIndexForCfi(location.cfi));
        this.scheduleProgressSave(location);
      });

      const toc = await this.epubReader.getToc();
      this.toc.set(toc);

      this.epubReader.generateLocations().then(() => {
        this.zone.run(() => {
          this.locationsReady = true;
          this.pageCfis.set(this.thumbnailsService.getPageCfis());
          const cfi = this.currentCfi();
          if (cfi) {
            this.currentPageIndex.set(this.thumbnailsService.getLocationIndexForCfi(cfi));
          }
        });
      });
    } catch (err) {
      console.error('Error al abrir el libro:', err);
      const message = (err as Error)?.message;
      if (message === 'EPUB_CORRUPTO') {
        this.errorMessage.set('Este archivo EPUB está dañado o tiene un formato no compatible.');
      } else if (message === 'EPUB_TIMEOUT') {
        this.errorMessage.set('El libro tardó demasiado en abrir. Probá de nuevo.');
      } else {
        this.errorMessage.set('No se pudo abrir este libro. El archivo podría estar dañado.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Progreso ────────────────────────────────────────────────────────

  private scheduleProgressSave(location: ReaderLocation): void {
    this.pendingLocation = location;
    clearTimeout(this.saveProgressTimeout);
    this.saveProgressTimeout = setTimeout(() => this.flushProgress(), 600);
  }

  /** Guarda de inmediato la última ubicación pendiente (si la hay). */
  private async flushProgress(): Promise<void> {
    clearTimeout(this.saveProgressTimeout);
    const location = this.pendingLocation;
    if (!location) return;
    this.pendingLocation = null;

    try {
      const reachedEnd = await this.readingProgressService.saveProgress({
        bookId: this.bookId,
        cfi: location.cfi,
        // Mientras no existan las locations, epub.js devuelve 0%: no sobrescribimos
        // el porcentaje guardado con un valor falso.
        percentage: this.locationsReady ? location.percentage : this.savedPercentage,
        updatedAt: Date.now(),
      });
      if (reachedEnd) this.finished.set(true);
    } catch (err) {
      console.error('Error guardando progreso:', err);
    }
  }

  // ── Navegación ──────────────────────────────────────────────────────

  async next(): Promise<void> {
    await this.epubReader.next();
  }

  async prev(): Promise<void> {
    await this.epubReader.prev();
  }

  toggleCarousel(): void {
    this.isCarouselOpen.update((v) => !v);
  }

  async goToPage(index: number): Promise<void> {
    const cfi = this.pageCfis()[index];
    if (cfi) await this.epubReader.goTo(cfi);
    this.isCarouselOpen.set(false);
  }

  async goToTocItem(item: NavItem): Promise<void> {
    await this.epubReader.goTo(item.href);
    this.isTocOpen.set(false);
  }

  onReaderTap(): void {
    if (Date.now() - this.lastHighlightTap < 300) return;

    if (this.pendingSelection() || this.activeHighlight()) {
      this.closeHighlightBar();
      return;
    }

    this.immersive.toggle();
    this.epubReader.refreshLayout();
  }

  // ── Ajustes de lectura ──────────────────────────────────────────────

  onFontSizeChange(percent: number): void {
    this.fontSize.set(percent);
    this.epubReader.setFontSize(percent);
    this.persistSettings();
  }

  onFontIdChange(id: string): void {
    this.fontId.set(id);
    this.epubReader.setFontFamily(READER_FONTS.find((f) => f.id === id)?.css ?? null);
    this.persistSettings();
  }

  onLineHeightChange(value: number): void {
    this.lineHeight.set(value);
    this.epubReader.setLineHeight(value);
    this.persistSettings();
  }

  onMarginChange(px: number): void {
    this.margin.set(px);
    this.epubReader.relayout();
    this.persistSettings();
  }

  /** Guarda con debounce para no escribir en cada paso del slider. */
  private persistSettings(): void {
    clearTimeout(this.saveSettingsTimeout);
    this.saveSettingsTimeout = setTimeout(() => {
      this.settingsService
        .saveReaderSettings({
          fontSize: this.fontSize(),
          fontId: this.fontId(),
          lineHeight: this.lineHeight(),
          margin: this.margin(),
        })
        .catch((err) => console.error('Error guardando ajustes:', err));
    }, 400);
  }

  // ── Libro terminado y marcadores ────────────────────────────────────

  async onFinishedChange(value: boolean): Promise<void> {
    try {
      if (value) {
        await this.bookService.markAsFinished(this.bookId);
      } else {
        await this.bookService.markAsUnfinished(this.bookId);
      }
      this.finished.set(value);
    } catch (err) {
      console.error('Error actualizando estado de terminado:', err);
    }
  }

  async toggleBookmark(): Promise<void> {
    const cfi = this.currentCfi();
    if (!cfi) return;

    const existing = this.bookmarks().find((b) => b.cfi === cfi);
    if (existing?.id) {
      await this.bookmarkService.deleteBookmark(existing.id);
    } else {
      await this.bookmarkService.addBookmark({
        bookId: this.bookId,
        cfi,
        createdAt: Date.now(),
      });
    }
    this.bookmarks.set(await this.bookmarkService.getBookmarksForBook(this.bookId));
  }

  async goToBookmark(bookmark: Bookmark): Promise<void> {
    await this.epubReader.goTo(bookmark.cfi);
    this.isTocOpen.set(false);
  }

  // ── Subrayados ──────────────────────────────────────────────────────

  private renderHighlight(h: Highlight): void {
    this.epubReader.addHighlight(h.cfiRange, h.color, () => {
      this.lastHighlightTap = Date.now();
      this.pendingSelection.set(null);
      this.activeHighlight.set(this.highlights().find((x) => x.id === h.id) ?? h);
    });
  }

  onPickColor(color: string): void {
    if (this.activeHighlight()) this.changeHighlightColor(color);
    else this.createHighlight(color);
  }

  private async createHighlight(color: string): Promise<void> {
    const sel = this.pendingSelection();
    if (!sel) return;
    try {
      const highlight: Highlight = {
        bookId: this.bookId,
        cfiRange: sel.cfiRange,
        text: sel.text,
        color,
        createdAt: Date.now(),
      };
      highlight.id = await this.highlightService.addHighlight(highlight);
      this.highlights.update((list) => [highlight, ...list]);
      this.renderHighlight(highlight);
    } catch (err) {
      console.error('Error guardando subrayado:', err);
    }
    this.epubReader.clearSelection();
    this.pendingSelection.set(null);
  }

  private async changeHighlightColor(color: string): Promise<void> {
    const h = this.activeHighlight();
    if (!h?.id || h.color === color) return;
    try {
      await this.highlightService.updateColor(h.id, color);
      const updated = { ...h, color };
      this.epubReader.removeHighlight(h.cfiRange);
      this.renderHighlight(updated);
      this.highlights.update((list) => list.map((x) => (x.id === h.id ? updated : x)));
      this.activeHighlight.set(updated);
    } catch (err) {
      console.error('Error cambiando color:', err);
    }
  }

  async deleteActiveHighlight(): Promise<void> {
    const h = this.activeHighlight();
    if (!h?.id) return;
    try {
      await this.highlightService.deleteHighlight(h.id);
      this.epubReader.removeHighlight(h.cfiRange);
      this.highlights.update((list) => list.filter((x) => x.id !== h.id));
    } catch (err) {
      console.error('Error borrando subrayado:', err);
    }
    this.activeHighlight.set(null);
  }

  closeHighlightBar(): void {
    this.epubReader.clearSelection();
    this.pendingSelection.set(null);
    this.activeHighlight.set(null);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}