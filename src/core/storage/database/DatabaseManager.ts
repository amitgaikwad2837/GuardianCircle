import { open, type DB } from '@op-engineering/op-sqlite';
import { KeyManager } from '@core/crypto/KeyManager';

let db: DB | null = null;

const DB_NAME = 'guardiancircle.db';
const CURRENT_SCHEMA_VERSION = 6;

/**
 * Manages the SQLCipher-encrypted SQLite database.
 * Opens once at startup; provides the DB instance to all repositories.
 */
export const DatabaseManager = {
  async initialize(): Promise<DB> {
    if (db) return db;

    const key = await KeyManager.getDatabaseKey();

    db = open({
      name: DB_NAME,
      encryptionKey: key,
    });

    await this.runMigrations(db);
    return db;
  },

  getDB(): DB {
    if (!db) throw new Error('DatabaseManager not initialized. Call initialize() first.');
    return db;
  },

  async runMigrations(database: DB): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ user_version }] = ((database.execute('PRAGMA user_version') as any).rows._array) as [{ user_version: number }];
    let version = user_version ?? 0;

    const migrations = await this.loadMigrations();

    for (const migration of migrations) {
      if (migration.version > version) {
        database.execute('BEGIN TRANSACTION');
        try {
          database.execute(migration.sql);
          database.execute(`PRAGMA user_version = ${migration.version}`);
          database.execute('COMMIT');
          version = migration.version;
        } catch (err) {
          database.execute('ROLLBACK');
          throw new Error(`Migration ${migration.version} failed: ${String(err)}`);
        }
      }
    }
  },

  async loadMigrations(): Promise<{ version: number; sql: string }[]> {
    // Migrations are imported as raw SQL strings bundled with the app
    const { migrations } = await import('./migrations');
    return migrations;
  },

  async close(): Promise<void> {
    if (db) {
      db.close();
      db = null;
    }
  },
};
