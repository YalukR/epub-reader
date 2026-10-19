import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';

export interface ReaderSettings {
  fontSize: number;   // %
  fontId: string;
  lineHeight: number;
  margin: number;     // px a cada lado
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 100,
  fontId: 'original',
  lineHeight: 1.5,
  margin: 16,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private dbService: DatabaseService) {}

  async getReaderSettings(): Promise<ReaderSettings> {
    const res = await this.dbService.run((db) =>
      db.query(`SELECT value FROM settings WHERE key = ?;`, ['reader'])
    );
    const raw = res.values?.[0]?.value;
    if (!raw) return { ...DEFAULT_READER_SETTINGS };
    try {
      return { ...DEFAULT_READER_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_READER_SETTINGS };
    }
  }

  async saveReaderSettings(settings: ReaderSettings): Promise<void> {
    await this.dbService.run((db) =>
      db.run(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        ['reader', JSON.stringify(settings)]
      )
    );
    await this.dbService.saveToStore();
  }
}