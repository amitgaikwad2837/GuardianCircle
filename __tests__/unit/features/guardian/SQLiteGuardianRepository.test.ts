import { SQLiteGuardianRepository } from '@features/guardian/infrastructure/SQLiteGuardianRepository';
import type { Guardian } from '@features/guardian/domain/entities/Guardian';

// SOSFallback is imported by the repository; mock it to avoid MMKV in unit tests
jest.mock('@core/sos/SOSFallback', () => ({
  SOSFallback: { setGuardianPhones: jest.fn(), getGuardianPhones: jest.fn(() => []), send: jest.fn() },
}));

function createMockDb() {
  const rows: Record<string, unknown>[] = [];

  return {
    execute: jest.fn().mockImplementation((sql: string, params: unknown[] = []) => {
      const upper = sql.trim().toUpperCase();

      if (upper.startsWith('INSERT INTO GUARDIANS')) {
        const row: Record<string, unknown> = {
          id:                    params[0],
          display_name:          params[1],
          phone_number:          params[2],
          signing_public_key:    params[3],
          encryption_public_key: params[4],
          fcm_token:             params[5],
          fcm_token_updated_at:  params[6],
          trust_level:           params[7],
          notification_priority: params[8],
          is_active:             params[9],
          is_decoy:              params[10],
          added_at:              params[11],
          last_alert_at:         params[12],
          notes:                 params[13],
          removal_scheduled_at:  params[14],
          created_at:            params[15],
          updated_at:            params[16],
        };
        rows.push(row);
        return { rows: { _array: [] }, rowsAffected: 1 };
      }

      if (upper.startsWith('SELECT * FROM GUARDIANS WHERE ID =')) {
        const id = params[0];
        return { rows: { _array: rows.filter((r) => r.id === id) } };
      }

      if (upper.startsWith('SELECT * FROM GUARDIANS WHERE PHONE_NUMBER =')) {
        const phone = params[0];
        return { rows: { _array: rows.filter((r) => r.phone_number === phone) } };
      }

      if (upper.startsWith('SELECT * FROM GUARDIANS WHERE SIGNING_PUBLIC_KEY =')) {
        const key = params[0];
        return { rows: { _array: rows.filter((r) => r.signing_public_key === key) } };
      }

      if (upper.startsWith('SELECT PHONE_NUMBER FROM GUARDIANS WHERE IS_ACTIVE = 1 AND IS_DECOY = 0')) {
        return {
          rows: {
            _array: rows
              .filter((r) => r.is_active === 1 && r.is_decoy === 0)
              .map((r) => ({ phone_number: r.phone_number })),
          },
        };
      }

      if (upper.startsWith('SELECT * FROM GUARDIANS WHERE IS_ACTIVE = 1 AND IS_DECOY = 0')) {
        return { rows: { _array: rows.filter((r) => r.is_active === 1 && r.is_decoy === 0) } };
      }

      if (upper.startsWith('SELECT * FROM GUARDIANS ORDER BY')) {
        return {
          rows: {
            _array: [...rows].sort(
              (a, b) => (a.notification_priority as number) - (b.notification_priority as number),
            ),
          },
        };
      }

      if (upper.startsWith('SELECT COUNT(*) AS CNT')) {
        const cnt = rows.filter((r) => r.is_active === 1 && r.is_decoy === 0).length;
        return { rows: { _array: [{ cnt }] } };
      }

      if (upper.startsWith('UPDATE GUARDIANS')) {
        return { rows: { _array: [] }, rowsAffected: 1 };
      }

      if (upper.startsWith('DELETE FROM GUARDIANS WHERE ID =')) {
        const id = params[0];
        const idx = rows.findIndex((r) => r.id === id);
        if (idx >= 0) rows.splice(idx, 1);
        return { rows: { _array: [] }, rowsAffected: 1 };
      }

      if (upper.startsWith('DELETE FROM GUARDIANS WHERE REMOVAL_SCHEDULED_AT')) {
        const now = params[0] as number;
        const toDelete = rows
          .filter((r) => r.removal_scheduled_at !== null && (r.removal_scheduled_at as number) <= now)
          .map((r) => r.id);
        toDelete.forEach((id) => {
          const idx = rows.findIndex((r) => r.id === id);
          if (idx >= 0) rows.splice(idx, 1);
        });
        return { rows: { _array: [] }, rowsAffected: toDelete.length };
      }

      return { rows: { _array: [] }, rowsAffected: 0 };
    }),
    _rows: rows,
  };
}

function makeGuardianInput(): Omit<Guardian, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    displayName:          'Priya Sharma',
    phoneNumber:          '+919876543210',
    trustLevel:           1,
    notificationPriority: 1,
    isActive:             true,
    isDecoy:              false,
    addedAt:              new Date(1_700_000_000_000),
  };
}

describe('SQLiteGuardianRepository', () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: SQLiteGuardianRepository;

  beforeEach(() => {
    db   = createMockDb();
    repo = new SQLiteGuardianRepository(db as any);
  });

  it('create — inserts guardian and returns it', async () => {
    const guardian = await repo.create(makeGuardianInput());
    expect(guardian.id).toBeDefined();
    expect(guardian.displayName).toBe('Priya Sharma');
    expect(guardian.phoneNumber).toBe('+919876543210');
    expect(guardian.isActive).toBe(true);
    expect(guardian.isDecoy).toBe(false);
  });

  it('create — stores signingPublicKey and encryptionPublicKey separately', async () => {
    const g = await repo.create({
      ...makeGuardianInput(),
      signingPublicKey: 'ecdsa_pub_abc',
      encryptionPublicKey: 'ecdh_pub_xyz',
      trustLevel: 2,
    });
    expect(g.signingPublicKey).toBe('ecdsa_pub_abc');
    expect(g.encryptionPublicKey).toBe('ecdh_pub_xyz');
  });

  it('getAll — returns all guardians ordered by priority', async () => {
    await repo.create({ ...makeGuardianInput(), notificationPriority: 2 });
    await repo.create({ ...makeGuardianInput(), phoneNumber: '+919876543211', notificationPriority: 1 });
    const all = await repo.getAll();
    expect(all.length).toBe(2);
    expect(all[0]!.notificationPriority).toBeLessThanOrEqual(all[1]!.notificationPriority);
  });

  it('getActiveGuardians — excludes decoys', async () => {
    await repo.create(makeGuardianInput());
    await repo.create({ ...makeGuardianInput(), phoneNumber: '+919876543211', isDecoy: true });
    const active = await repo.getActiveGuardians();
    expect(active.length).toBe(1);
    expect(active[0]!.isDecoy).toBe(false);
  });

  it('findByPhone — returns null for unknown number', async () => {
    const result = await repo.findByPhone('+911111111111');
    expect(result).toBeNull();
  });

  it('findByPhone — returns correct guardian', async () => {
    await repo.create(makeGuardianInput());
    const result = await repo.findByPhone('+919876543210');
    expect(result).not.toBeNull();
    expect(result?.displayName).toBe('Priya Sharma');
  });

  it('findBySigningKey — returns guardian with matching ECDSA key', async () => {
    await repo.create({ ...makeGuardianInput(), signingPublicKey: 'ecdsa_key_abc123' });
    const result = await repo.findBySigningKey('ecdsa_key_abc123');
    expect(result?.signingPublicKey).toBe('ecdsa_key_abc123');
  });

  it('findBySigningKey — returns null for unknown key', async () => {
    const result = await repo.findBySigningKey('nonexistent_key');
    expect(result).toBeNull();
  });

  it('count — counts only active non-decoy guardians', async () => {
    await repo.create(makeGuardianInput());
    await repo.create({ ...makeGuardianInput(), phoneNumber: '+919876543211', isDecoy: true });
    const count = await repo.count();
    expect(count).toBe(1);
  });

  it('delete — removes guardian by id', async () => {
    const g = await repo.create(makeGuardianInput());
    await repo.delete(g.id);
    const result = await repo.getById(g.id);
    expect(result).toBeNull();
  });

  it('scheduleRemoval — sets removalScheduledAt', async () => {
    const g = await repo.create(makeGuardianInput());
    await repo.scheduleRemoval(g.id, 24 * 60 * 60 * 1000);
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE guardians'),
      expect.any(Array),
    );
  });
});
