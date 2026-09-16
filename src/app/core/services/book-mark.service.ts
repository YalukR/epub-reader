import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Bookmark } from '../models/database.model';

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  constructor(private dbService: DatabaseService) {}

  async addBookmark(bookmark: Bookmark): Promise<number> {
    const result = await this.dbService.run((db) =>
      db.run(
        `INSERT INTO bookmarks (book_id, cfi, note, color, created_at)
         VALUES (?, ?, ?, ?, ?);`,
        [
          bookmark.bookId,
          bookmark.cfi,
          bookmark.note ?? null,
          bookmark.color ?? '#FFEB3B',
          bookmark.createdAt,
        ]
      )
    );
    await this.dbService.saveToStore();
    return result.changes?.lastId ?? -1;
  }

  async getBookmarksForBook(bookId: number): Promise<Bookmark[]> {
    const res = await this.dbService.run((db) =>
      db.query(`SELECT * FROM bookmarks WHERE book_id = ? ORDER BY created_at DESC;`, [
        bookId,
      ])
    );
    return (res.values ?? []).map(mapRow);
  }

  async deleteBookmark(id: number): Promise<void> {
    await this.dbService.run((db) => db.run(`DELETE FROM bookmarks WHERE id = ?;`, [id]));
    await this.dbService.saveToStore();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function mapRow(row: any): Bookmark {
  return {
    id: row.id,
    bookId: row.book_id,
    cfi: row.cfi,
    note: row.note,
    color: row.color,
    createdAt: row.created_at,
  };
}