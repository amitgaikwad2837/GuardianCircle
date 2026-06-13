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

export const DatabaseManager = {
  async initialize(): Promise<DB> {
    if (db) {return db;}
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
    const opened = open({ name: DB_NAME, encryptionKey: key });
    await this.runMigrations(opened);
    return opened;
  },

  getDB(): DB {
    if (!db) {throw new Error('DatabaseManager not initialized. Call initialize() first.');}
    return db;
  },

  async runMigrations(database: DB): Promise<void> {
    const pragmaResult = await database.execute('PRAGMA user_version');
    const pragmaRows = sqlRows<{ user_version: number }>(pragmaResult);
    let version = pragmaRows[0]?.user_version ?? 0;

    for (const migration of migrations) {
      if (migration.version > version) {
        await database.execute('BEGIN TRANSACTION');
        try {
          await database.execute(migration.sql);
          await database.execute('COMMIT');
        } catch (err) {
          await database.execute('ROLLBACK');
          throw new Error(`Migration ${migration.version} failed: ${String(err)}`);
        }
        await database.execute(`PRAGMA user_version = ${migration.version}`);
        version = migration.version;
      }
    }
  },

  close(): void {
    if (db) {
      db.close();
      db = null;
    }
  },
};
