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
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { NavItem } from 'epubjs';

import { EpubReaderService, ReaderLocation } from '../../core/services/epub-reader.service';
import { BookService } from '../../core/services/book.service';
import { FileImportService } from '../../core/services/file-import.service';
import { ReadingProgressService } from '../../core/services/reading-progress.service';
import { BookmarkService } from '../../core/services/book-mark.service';
import { DarkModeSyncService } from '../../core/services/dark-mode-sync.service';
import { Book, Bookmark } from '../../core/models/database.model';
import { PageTitleService } from '../../core/services/page-title.service';
import { ReaderTocDrawer } from './reader-toc-drawer/reader-toc-drawer';
import { ReaderSettingsDrawer } from './reader-settings-drawer/reader-settings-drawer';

@Component({
  selector: 'app-book-reader',
  standalone: true,
  imports: [ButtonModule, ReaderTocDrawer, ReaderSettingsDrawer],
  providers: [DarkModeSyncService],
  templateUrl: './book-reader.html',
  styleUrl: './book-reader.css',
})
export class BookReader implements OnInit, OnDestroy {
  @ViewChild('readerContainer', { static: true }) readerContainer!: ElementRef<HTMLElement>;

  private pageTitleService = inject(PageTitleService);

  book = signal<Book | null>(null);
  toc = signal<NavItem[]>([]);
  bookmarks = signal<Bookmark[]>([]);

  progressPercentage = signal(0);
  currentCfi = signal<string | null>(null);
  fontSize = signal(100); // %

  isLoading = signal(true);
  isTocOpen = signal(false);
  isSettingsOpen = signal(false);
  errorMessage = signal<string | null>(null);

  isCurrentPageBookmarked = computed(() => {
    const cfi = this.currentCfi();
    if (!cfi) return false;
    return this.bookmarks().some((b) => b.cfi === cfi);
  });

  private bookId!: number;
  private saveProgressTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private epubReader: EpubReaderService,
    private darkMode: DarkModeSyncService,
    private bookService: BookService,
    private fileImportService: FileImportService,
    private readingProgressService: ReadingProgressService,
    private bookmarkService: BookmarkService
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

    // Empuja el progreso y los controles de página al footer global.
    // Como onPrev/onNext llaman a this.next()/this.prev(), siempre usan
    // la instancia actual de epubReader sin importar cuándo se disparen.
    effect(() => {
      this.pageTitleService.setFooter({
        percentage: this.progressPercentage(),
        onPrev: () => this.prev(),
        onNext: () => this.next(),
      });
    });

    this.darkMode.watch((isDark) => this.epubReader.setDarkMode(isDark));
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

    await this.openBook();
  }

  ngOnDestroy(): void {
    clearTimeout(this.saveProgressTimeout);
    this.epubReader.destroy();
    this.pageTitleService.clear();
    // darkMode se destruye solo: al ser un provider de este componente,
    // Angular llama a su ngOnDestroy automáticamente.
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
      this.pageTitleService.setTitle(book.title);

      const [bytes, progress, bookmarks] = await Promise.all([
        this.fileImportService.readEpubBytes(book.filePath),
        this.readingProgressService.getProgress(this.bookId),
        this.bookmarkService.getBookmarksForBook(this.bookId),
      ]);

      this.bookmarks.set(bookmarks);
      if (progress?.percentage) {
        this.progressPercentage.set(Math.round(progress.percentage * 10) / 10);
      }

      await this.epubReader.open(bytes, this.readerContainer.nativeElement, progress?.cfi);
      // Aplica el tema actual de inmediato: evita el flash de fondo blanco
      // en modo oscuro mientras darkMode solo reacciona a cambios futuros.
      this.epubReader.setDarkMode(document.documentElement.classList.contains('dark'));

      this.epubReader.onLocationChanged((location: ReaderLocation) => {
        this.currentCfi.set(location.cfi);
        this.progressPercentage.set(location.percentage);
        this.scheduleProgressSave(location);
      });

      const toc = await this.epubReader.getToc();
      this.toc.set(toc);

      this.epubReader.generateLocations();
    } catch (err) {
      console.error('Error al abrir el libro:', err);
      this.errorMessage.set('No se pudo abrir este libro. El archivo podría estar dañado.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private scheduleProgressSave(location: ReaderLocation): void {
    clearTimeout(this.saveProgressTimeout);
    this.saveProgressTimeout = setTimeout(() => {
      this.readingProgressService.saveProgress({
        bookId: this.bookId,
        cfi: location.cfi,
        percentage: location.percentage,
        updatedAt: Date.now(),
      });
    }, 600);
  }

  async next(): Promise<void> {
    await this.epubReader.next();
  }

  async prev(): Promise<void> {
    await this.epubReader.prev();
  }

  async goToTocItem(item: NavItem): Promise<void> {
    await this.epubReader.goTo(item.href);
    this.isTocOpen.set(false);
  }

  onFontSizeChange(percent: number): void {
    this.fontSize.set(percent);
    this.epubReader.setFontSize(percent);
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

  goBack(): void {
    this.router.navigate(['/home']);
  }
}