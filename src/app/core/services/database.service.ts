import { Injectable, NgZone } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DB_NAME = 'epub_reader_db';
const DB_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  private ready = false;
  private initPromise?: Promise<void>;

  constructor(private zone: NgZone) {}

  /**
   * Llamar una sola vez al arrancar la app (ver APP_INITIALIZER en app.config.ts).
   * Es idempotente: si ya se está inicializando, reutiliza la misma promesa.
   */
  init(): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      // Requiere que <jeep-sqlite> esté registrado en index.html/main.ts.
      await customElements.whenDefined('jeep-sqlite');
      await this.sqlite.initWebStore();
    }

    this.addMigrations();

    const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result;
    this.db = isConn
      ? await this.sqlite.retrieveConnection(DB_NAME, false)
      : await this.sqlite.createConnection(
          DB_NAME,
          false,
          'no-encryption',
          DB_VERSION,
          false
        );

    await this.db.open();

    // Sin esto, ON DELETE CASCADE no se aplica en SQLite.
    await this.db.execute('PRAGMA foreign_keys = ON;');

    this.ready = true;
  }

  /**
   * Esquema versionado. Para cambios futuros, agrega un nuevo objeto
   * { toVersion: 2, statements: [...] } al array y sube DB_VERSION arriba.
   */
  private addMigrations(): void {
    this.sqlite.addUpgradeStatement(DB_NAME, [
      {
        toVersion: 1,
        statements: [
          `CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT,
            cover_path TEXT,
            file_path TEXT NOT NULL UNIQUE,
            language TEXT,
            file_size INTEGER,
            added_at INTEGER NOT NULL
          );`,
          `CREATE TABLE IF NOT EXISTS reading_progress (
            book_id INTEGER PRIMARY KEY,
            cfi TEXT,
            percentage REAL NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
          );`,
          `CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            cfi TEXT NOT NULL,
            note TEXT,
            color TEXT DEFAULT '#FFEB3B',
            created_at INTEGER NOT NULL,
            FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
          );`,
          `CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks(book_id);`,
        ],
      },
    ]);
  }

  /**
   * Punto único de acceso a la conexión. Todo query/run pasa por aquí,
   * que garantiza que la promesa resultante se resuelve DENTRO de la
   * zona de Angular, sin importar cómo resuelva sus promesas internas
   * el bridge de jeep-sqlite/sql.js por debajo (esa es la causa de que
   * la vista no se repintara hasta hacer click en algún lado).
   */
  async run<T>(work: (db: SQLiteDBConnection) => Promise<T>): Promise<T> {
    if (!this.ready) {
      throw new Error(
        'DatabaseService no inicializado. Llama a init() antes de usar cualquier servicio de datos.'
      );
    }

    const result = await work(this.db);

    // Reentramos a la zona explícitamente. Si ya estábamos dentro,
    // esto es un no-op; si el plugin nos sacó de la zona, aquí
    // recuperamos el contexto antes de devolver el valor al caller.
    return this.zone.run(() => result);
  }

  /**
   * Solo tiene efecto en web: persiste el estado de sql.js hacia IndexedDB.
   * En Android es un no-op porque ya escribe directo a disco.
   * Llamar después de cada INSERT/UPDATE/DELETE.
   */
  async saveToStore(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      await this.sqlite.saveToStore(DB_NAME);
    }
  }
}

/*
 * ── Setup necesario en el proyecto ──────────────────────────────────────
 *
 * 1) Instalar dependencias:
 *    npm i @capacitor-community/sqlite
 *    npm i --save-dev jeep-sqlite   (solo se usa en plataforma web)
 *
 * 2) En main.ts, ANTES de bootstrapApplication:
 *
 *    import { defineCustomElements as jeepSqliteElements } from 'jeep-sqlite/loader';
 *    jeepSqliteElements(window);
 *
 * 3) En el AppComponent (o app.component.ts), en ngOnInit:
 *
 *    if (Capacitor.getPlatform() === 'web') {
 *      const jeepEl = document.createElement('jeep-sqlite');
 *      document.body.appendChild(jeepEl);
 *      await customElements.whenDefined('jeep-sqlite');
 *    }
 *
 *    (La inicialización real de la DB ya corre vía APP_INITIALIZER
 *    en app.config.ts, no hace falta llamar a init() aquí también.)
 *
 * 4) npx cap sync android  →  para que el plugin nativo quede embebido en el APK.
 */