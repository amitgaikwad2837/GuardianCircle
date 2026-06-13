import { open, type DB } from '@op-engineering/op-sqlite';
import { KeyManager } from '@core/crypto/KeyManager';

let db: DB | null = null;
let initPromise: Promise<DB> | null = null;

const DB_NAME = 'guardiancircle.db';

/**
 * Manages the SQLCipher-encrypted SQLite database.
 * Opens once at startup; provides the DB instance to all repositories.
 */
export const DatabaseManager = {
  async initialize(): Promise<DB> {
    if (db) {return db;}
    // Prevent concurrent callers from opening the DB and running migrations twice
    if (initPromise) {return initPromise;}
    initPromise = this._open();
    try {
      db = await initPromise;
      return db;
    } finally {
      initPromise = null;
    }
  },

  async _open(): Promise<DB> {
    const key = await KeyManager.getDatabaseKey();

    const opened = open({
      name: DB_NAME,
      encryptionKey: key,
    });

    await this.runMigrations(opened);
    return opened;
  },

  getDB(): DB {
    if (!db) {throw new Error('DatabaseManager not initialized. Call initialize() first.');}
    return db;
  },

  async runMigrations(database: DB): Promise<void> {
    const [{ user_version }] = (database.execute('PRAGMA user_version') as { rows: { _array: [{ user_version: number }] } }).rows._array;
    let version = user_version ?? 0;

    const migrations = await this.loadMigrations();

    for (const migration of migrations) {
      if (migration.version > version) {
        void database.execute('BEGIN TRANSACTION');
        try {
          void database.execute(migration.sql);
          void database.execute('COMMIT');
        } catch (err) {
          void database.execute('ROLLBACK');
          throw new Error(`Migration ${migration.version} failed: ${String(err)}`);
        }
        // PRAGMA user_version must be set outside a transaction — it is a no-op inside one
        void database.execute(`PRAGMA user_version = ${migration.version}`);
        version = migration.version;
      }
    }
  },

  async loadMigrations(): Promise<{ version: number; sql: string }[]> {
    // Migrations are imported as raw SQL strings bundled with the app
    const { migrations } = await import('./migrations');
    return migrations;
  },

  close(): void {
    if (db) {
      db.close();
      db = null;
    }
  },
};
