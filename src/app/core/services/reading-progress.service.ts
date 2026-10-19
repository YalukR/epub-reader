import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { ReadingProgress } from '../models/database.model';

const FINISHED_THRESHOLD = 100; // ajusta si tu percentage va de 0 a 1

@Injectable({ providedIn: 'root' })
export class ReadingProgressService {
  constructor(private dbService: DatabaseService) { }

  /** Guarda o actualiza el progreso de un libro (una sola fila por book_id). */

  async saveProgress(progress: ReadingProgress): Promise<boolean> {
    const reachedEnd = progress.percentage >= FINISHED_THRESHOLD;

    await this.dbService.run(async (db) => {
      await db.run(
        `INSERT INTO reading_progress (book_id, cfi, percentage, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(book_id) DO UPDATE SET
         cfi = excluded.cfi,
         percentage = excluded.percentage,
         updated_at = excluded.updated_at;`,
        [progress.bookId, progress.cfi ?? null, progress.percentage, progress.updatedAt]
      );

      if (reachedEnd) {
        await db.run(
          'UPDATE books SET finished_at = COALESCE(finished_at, ?) WHERE id = ?;',
          [progress.updatedAt, progress.bookId]
        );
      }
    });
    await this.dbService.saveToStore();
    return reachedEnd;
  }

  async getProgress(bookId: number): Promise<ReadingProgress | null> {
    const res = await this.dbService.run((db) =>
      db.query(`SELECT * FROM reading_progress WHERE book_id = ?;`, [bookId])
    );
    const row = res.values?.[0];
    if (!row) return null;
    return {
      bookId: row.book_id,
      cfi: row.cfi,
      percentage: row.percentage,
      updatedAt: row.updated_at,
    };
  }
}