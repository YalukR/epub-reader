import { Component, OnInit, OnDestroy, ViewChild, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BookService } from '../../core/services/book.service';
import { FileImportService } from '../../core/services/file-import.service';
import { Book } from '../../core/models/database.model';
import { BookCard, BookWithCover } from './book-card/book-card';
import { AddBook } from './add-book/add-book';
import { PageTitleService } from '../../core/services/page-title.service';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [BookCard, AddBook],
  templateUrl: './books.html',
  styleUrl: './books.css',
})
export class Books implements OnInit, OnDestroy {
  books = signal<BookWithCover[]>([]);
  errorMessage = signal<string | null>(null);

  @ViewChild('addBook') addBook!: AddBook;

  private pageTitleService = inject(PageTitleService);

  constructor(
    private bookService: BookService,
    private fileImportService: FileImportService,
    private router: Router
  ) { }

  async ngOnInit(): Promise<void> {
    this.pageTitleService.setTitle('Mi Biblioteca');
    this.pageTitleService.setActions([
      {
        icon: 'pi-plus',
        label: 'Agregar EPUB',
        onClick: () => this.addBook.triggerFilePicker(),
      },
    ]);

    try {
      await this.loadBooks();
    } catch (err) {
      console.error('Error cargando libros', err);
      this.errorMessage.set('No se pudieron cargar los libros.');
    }
  }

  ngOnDestroy(): void {
    this.pageTitleService.clear();
  }

  async loadBooks(): Promise<void> {
    const books = await this.bookService.getAllBooks();
    const withCovers = await Promise.all(
      books.map(async (book) => ({
        ...book,
        coverSrc: await this.fileImportService.getCoverSrc(book.coverPath).catch(() => null),
      }))
    );

    this.books.set(withCovers);
  }

  onImportError(message: string): void {
    this.errorMessage.set(message);
  }

  openBook(book: Book): void {
    this.router.navigate(['/reader', book.id]);
  }

  async deleteBook(book: Book): Promise<void> {
    if (!book.id) return;

    await this.fileImportService.deleteEpubFile(book.filePath);
    if (book.coverPath) {
      await this.fileImportService.deleteEpubFile(book.coverPath);
    }
    await this.bookService.deleteBook(book.id);
    await this.loadBooks();
  }
}