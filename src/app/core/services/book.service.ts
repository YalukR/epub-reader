import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Book } from '../models/database.model';

@Injectable({ providedIn: 'root' })
export class BookService {
  constructor(private databaseService: DatabaseService) {}

  async getAllBooks(): Promise<Book[]> {
    const result = await this.databaseService.run((db) =>
      db.query('SELECT * FROM books ORDER BY added_at DESC;')
    );
    return (result.values ?? []).map(rowToBook);
  }

  async getBookById(id: number): Promise<Book | null> {
    const result = await this.databaseService.run((db) =>
      db.query('SELECT * FROM books WHERE id = ?;', [id])
    );
    const row = result.values?.[0];
    return row ? rowToBook(row) : null;
  }

  async addBook(book: Book): Promise<number> {
    const result = await this.databaseService.run((db) =>
      db.run(
        `INSERT INTO books (title, author, cover_path, file_path, language, file_size, added_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          book.title,
          book.author ?? null,
          book.coverPath ?? null,
          book.filePath,
          book.language ?? null,
          book.fileSize ?? null,
          book.addedAt,
        ]
      )
    );
    await this.databaseService.saveToStore();

    const insertId = result.changes?.lastId;
    if (insertId == null) {
      throw new Error('No se pudo obtener el id del libro recién insertado.');
    }
    return insertId;
  }

  async deleteBook(id: number): Promise<void> {
    await this.databaseService.run((db) =>
      db.run('DELETE FROM books WHERE id = ?;', [id])
    );
    await this.databaseService.saveToStore();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function rowToBook(row: any): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author ?? undefined,
    coverPath: row.cover_path ?? undefined,
    filePath: row.file_path,
    language: row.language ?? undefined,
    fileSize: row.file_size ?? undefined,
    addedAt: row.added_at,
  };
}