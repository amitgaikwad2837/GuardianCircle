import { open, type DB, type QueryResult } from '@op-engineering/op-sqlite';
import { KeyManager } from '@core/crypto/KeyManager';
import { migrations } from './migrations';

let db: DB | null = null;
let initPromise: Promise<DB> | null = null;

const DB_NAME = 'guardiancircle.db';

/**
 * Safely extracts rows from an op-sqlite QueryResult.
 * `rows` is optional in the type — undefined for write-only queries.
 */
export function sqlRows<T = Record<string, unknown>>(result: QueryResult): T[] {
  return (result.rows?._array as T[] | undefined) ?? [];
}

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

    this.runMigrations(opened);
    return opened;
  },

  getDB(): DB {
    if (!db) {throw new Error('DatabaseManager not initialized. Call initialize() first.');}
    return db;
  },

  runMigrations(database: DB): void {
    const pragmaResult = database.execute('PRAGMA user_version');
    const pragmaRows = sqlRows<{ user_version: number }>(pragmaResult);
    let version = pragmaRows[0]?.user_version ?? 0;

    const migs = this.loadMigrations();

    for (const migration of migs) {
      if (migration.version > version) {
        void database.execute('BEGIN TRANSACTION');
        try {
          void database.execute(migration.sql);
          void database.execute('COMMIT');
        } catch (err) {
          void database.execute('ROLLBACK');
          throw new Error(`Migration ${migration.version} failed: ${String(err)}`);
        }
        void database.execute(`PRAGMA user_version = ${migration.version}`);
        version = migration.version;
      }
    }
  },

  loadMigrations(): { version: number; sql: string }[] {
    return migrations;
  },

  close(): void {
    if (db) {
      db.close();
      db = null;
    }
  },
};
