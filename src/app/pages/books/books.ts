import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BookService } from '../../core/services/book.service';
import { FileImportService } from '../../core/services/file-import.service';
import { Book } from '../../core/models/database.model';
import { BookCard, BookWithCover } from './book-card/book-card';
import { AddBook } from './add-book/add-book';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [BookCard, AddBook],
  templateUrl: './books.html',
  styleUrl: './books.css',
})
export class Books implements OnInit {
  // Signal en vez de propiedad plana: Angular repinta al hacer .set(),
  // sin depender de que la promesa haya resuelto "dentro de zona".
  books = signal<BookWithCover[]>([]);

  constructor(
    private bookService: BookService,
    private fileImportService: FileImportService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadBooks();
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