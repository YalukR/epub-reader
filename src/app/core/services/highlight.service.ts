import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Highlight } from '../models/database.model';

@Injectable({ providedIn: 'root' })
export class HighlightService {
  constructor(private dbService: DatabaseService) {}

  async addHighlight(h: Highlight): Promise<number> {
    const result = await this.dbService.run((db) =>
      db.run(
        `INSERT INTO highlights (book_id, cfi_range, text, note, color, created_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [h.bookId, h.cfiRange, h.text, h.note ?? null, h.color, h.createdAt]
      )
    );
    await this.dbService.saveToStore();
    const id = result.changes?.lastId;
    if (id == null) throw new Error('No se pudo obtener el id del subrayado.');
    return id;
  }

  async getHighlightsForBook(bookId: number): Promise<Highlight[]> {
    const res = await this.dbService.run((db) =>
      db.query(`SELECT * FROM highlights WHERE book_id = ? ORDER BY created_at DESC;`, [bookId])
    );
    return (res.values ?? []).map(mapRow);
  }

  async updateColor(id: number, color: string): Promise<void> {
    await this.dbService.run((db) =>
      db.run(`UPDATE highlights SET color = ? WHERE id = ?;`, [color, id])
    );
    await this.dbService.saveToStore();
  }

  // Lo usaremos en el paso de notas
  async updateNote(id: number, note: string | null): Promise<void> {
    await this.dbService.run((db) =>
      db.run(`UPDATE highlights SET note = ? WHERE id = ?;`, [note, id])
    );
    await this.dbService.saveToStore();
  }

  async deleteHighlight(id: number): Promise<void> {
    await this.dbService.run((db) => db.run(`DELETE FROM highlights WHERE id = ?;`, [id]));
    await this.dbService.saveToStore();
  }
}

function mapRow(row: any): Highlight {
  return {
    id: row.id,
    bookId: row.book_id,
    cfiRange: row.cfi_range,
    text: row.text,
    note: row.note ?? undefined,
    color: row.color,
    createdAt: row.created_at,
  };
}