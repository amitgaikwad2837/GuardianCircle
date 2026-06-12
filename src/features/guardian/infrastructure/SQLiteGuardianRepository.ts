import { v4 as uuidv4 } from 'uuid';
import type { DB } from '@op-engineering/op-sqlite';
import type { IGuardianRepository } from '../domain/interfaces/IGuardianRepository';
import type { Guardian, TrustLevel } from '../domain/entities/Guardian';
import { Logger } from '@core/logger/Logger';
import { SOSFallback } from '@core/sos/SOSFallback';

const TAG = 'SQLiteGuardianRepository';

interface GuardianRow {
  id: string;
  display_name: string;
  phone_number: string;
  signing_public_key: string | null;
  encryption_public_key: string | null;
  fcm_token: string | null;
  fcm_token_updated_at: number | null;
  trust_level: number;
  notification_priority: number;
  is_active: number;
  is_decoy: number;
  added_at: number;
  last_alert_at: number | null;
  notes: string | null;
  removal_scheduled_at: number | null;
  created_at: number;
  updated_at: number;
}

function rowToGuardian(row: GuardianRow): Guardian {
  return {
    id: row.id,
    displayName: row.display_name,
    phoneNumber: row.phone_number,
    signingPublicKey: row.signing_public_key ?? undefined,
    encryptionPublicKey: row.encryption_public_key ?? undefined,
    fcmToken: row.fcm_token ?? undefined,
    fcmTokenUpdatedAt: row.fcm_token_updated_at != null
      ? new Date(row.fcm_token_updated_at)
      : undefined,
    trustLevel: row.trust_level as TrustLevel,
    notificationPriority: row.notification_priority,
    isActive: row.is_active === 1,
    isDecoy: row.is_decoy === 1,
    addedAt: new Date(row.added_at),
    lastAlertAt: row.last_alert_at != null ? new Date(row.last_alert_at) : undefined,
    notes: row.notes ?? undefined,
    removalScheduledAt: row.removal_scheduled_at != null
      ? new Date(row.removal_scheduled_at)
      : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SQLiteGuardianRepository implements IGuardianRepository {
  constructor(private readonly db: DB) {}

  private syncFallbackPhones(): void {
    try {
      const result = this.db.execute(
        'SELECT phone_number FROM guardians WHERE is_active = 1 AND is_decoy = 0',
      );
      const phones = ((result as any).rows._array as Array<{ phone_number: string }>)
        .map((r) => r.phone_number);
      SOSFallback.setGuardianPhones(phones);
    } catch (err) {
      Logger.safeError(TAG, 'syncFallbackPhones failed', err);
    }
  }

  async getAll(): Promise<Guardian[]> {
    const result = this.db.execute(
      'SELECT * FROM guardians ORDER BY notification_priority ASC',
    );
    return ((result as any).rows._array as GuardianRow[]).map(rowToGuardian);
  }

  async getActiveGuardians(): Promise<Guardian[]> {
    const result = this.db.execute(
      'SELECT * FROM guardians WHERE is_active = 1 AND is_decoy = 0 ORDER BY notification_priority ASC',
    );
    return ((result as any).rows._array as GuardianRow[]).map(rowToGuardian);
  }

  async getById(id: string): Promise<Guardian | null> {
    const result = this.db.execute(
      'SELECT * FROM guardians WHERE id = ? LIMIT 1',
      [id],
    );
    const row = ((result as any).rows._array as GuardianRow[])[0];
    return row != null ? rowToGuardian(row) : null;
  }

  async findBySigningKey(signingPublicKey: string): Promise<Guardian | null> {
    const result = this.db.execute(
      'SELECT * FROM guardians WHERE signing_public_key = ? LIMIT 1',
      [signingPublicKey],
    );
    const row = ((result as any).rows._array as GuardianRow[])[0];
    return row != null ? rowToGuardian(row) : null;
  }

  /** @deprecated Use findBySigningKey — retained for legacy v1-paired guardians. */
  async findByPublicKey(publicKey: string): Promise<Guardian | null> {
    return this.findBySigningKey(publicKey);
  }

  async findByPhone(phoneNumber: string): Promise<Guardian | null> {
    const result = this.db.execute(
      'SELECT * FROM guardians WHERE phone_number = ? LIMIT 1',
      [phoneNumber],
    );
    const row = ((result as any).rows._array as GuardianRow[])[0];
    return row != null ? rowToGuardian(row) : null;
  }

  async create(
    input: Omit<Guardian, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Guardian> {
    const id  = uuidv4();
    const now = Date.now();
    Logger.debug(TAG, 'create guardian', { id });

    this.db.execute(
      `INSERT INTO guardians
         (id, display_name, phone_number,
          signing_public_key, encryption_public_key,
          fcm_token, fcm_token_updated_at,
          trust_level, notification_priority, is_active, is_decoy,
          added_at, last_alert_at, notes, removal_scheduled_at,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.displayName,
        input.phoneNumber,
        input.signingPublicKey ?? null,
        input.encryptionPublicKey ?? null,
        input.fcmToken ?? null,
        input.fcmTokenUpdatedAt?.getTime() ?? null,
        input.trustLevel,
        input.notificationPriority,
        input.isActive ? 1 : 0,
        input.isDecoy ? 1 : 0,
        input.addedAt.getTime(),
        input.lastAlertAt?.getTime() ?? null,
        input.notes ?? null,
        input.removalScheduledAt?.getTime() ?? null,
        now,
        now,
      ],
    );

    const created = await this.getById(id);
    if (!created) throw new Error(`Failed to read guardian after create: ${id}`);
    this.syncFallbackPhones();
    return created;
  }

  async update(id: string, update: Partial<Guardian>): Promise<void> {
    Logger.debug(TAG, 'update guardian', { id });
    const now = Date.now();

    const sets: string[] = ['updated_at = ?'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: any[] = [now];

    if (update.displayName !== undefined)        { sets.push('display_name = ?');         values.push(update.displayName); }
    if (update.phoneNumber !== undefined)         { sets.push('phone_number = ?');          values.push(update.phoneNumber); }
    if (update.signingPublicKey !== undefined)    { sets.push('signing_public_key = ?');    values.push(update.signingPublicKey ?? null); }
    if (update.encryptionPublicKey !== undefined) { sets.push('encryption_public_key = ?'); values.push(update.encryptionPublicKey ?? null); }
    if (update.fcmToken !== undefined)            { sets.push('fcm_token = ?');             values.push(update.fcmToken ?? null); }
    if (update.fcmTokenUpdatedAt !== undefined)   { sets.push('fcm_token_updated_at = ?');  values.push(update.fcmTokenUpdatedAt?.getTime() ?? null); }
    if (update.trustLevel !== undefined)          { sets.push('trust_level = ?');           values.push(update.trustLevel); }
    if (update.notificationPriority !== undefined){ sets.push('notification_priority = ?'); values.push(update.notificationPriority); }
    if (update.isActive !== undefined)            { sets.push('is_active = ?');             values.push(update.isActive ? 1 : 0); }
    if (update.isDecoy !== undefined)             { sets.push('is_decoy = ?');              values.push(update.isDecoy ? 1 : 0); }
    if (update.lastAlertAt !== undefined)         { sets.push('last_alert_at = ?');         values.push(update.lastAlertAt?.getTime() ?? null); }
    if (update.notes !== undefined)               { sets.push('notes = ?');                 values.push(update.notes ?? null); }
    if (update.removalScheduledAt !== undefined)  { sets.push('removal_scheduled_at = ?'); values.push(update.removalScheduledAt?.getTime() ?? null); }

    values.push(id);
    this.db.execute(`UPDATE guardians SET ${sets.join(', ')} WHERE id = ?`, values);
    this.syncFallbackPhones();
  }

  async delete(id: string): Promise<void> {
    Logger.debug(TAG, 'delete guardian', { id });
    this.db.execute('DELETE FROM guardians WHERE id = ?', [id]);
    this.syncFallbackPhones();
  }

  async scheduleRemoval(id: string, delayMs: number): Promise<void> {
    const scheduledAt = Date.now() + delayMs;
    Logger.info(TAG, 'scheduleRemoval', { id, scheduledAt });
    await this.update(id, { removalScheduledAt: new Date(scheduledAt) });
  }

  async count(): Promise<number> {
    const result = this.db.execute(
      'SELECT COUNT(*) as cnt FROM guardians WHERE is_active = 1 AND is_decoy = 0',
    );
    const rows = (result as any).rows._array as [{ cnt: number }];
    return rows[0]?.cnt ?? 0;
  }

  async pruneScheduledRemovals(): Promise<number> {
    const now = Date.now();
    const result = this.db.execute(
      'DELETE FROM guardians WHERE removal_scheduled_at IS NOT NULL AND removal_scheduled_at <= ?',
      [now],
    );
    const deleted = (result as any).rowsAffected ?? 0;
    if (deleted > 0) Logger.info(TAG, 'pruneScheduledRemovals', { deleted });
    return deleted;
  }
}
