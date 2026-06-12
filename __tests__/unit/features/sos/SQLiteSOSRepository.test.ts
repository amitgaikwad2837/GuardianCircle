import { SQLiteSOSRepository } from '@features/sos/infrastructure/SQLiteSOSRepository';
import type { SOSEvent } from '@features/sos/domain/entities/SOSEvent';

// Mock DB with in-memory state
function createMockDb() {
  const rows: Record<string, unknown>[] = [];

  return {
    execute: jest.fn().mockImplementation((sql: string, params: unknown[] = []) => {
      const upper = sql.trim().toUpperCase();

      if (upper.startsWith('INSERT INTO INCIDENTS')) {
        const [id, type, status, triggered_at, escalation_level,
               location_lat, location_lng, location_accuracy,
               is_silent, is_duress, created_at] = params;
        rows.push({ id, type, status, triggered_at, escalation_level,
                    location_lat, location_lng, location_accuracy,
                    is_silent, is_duress, resolved_at: null,
                    cancelled_reason: null, created_at });
        return { rows: { _array: [] }, rowsAffected: 1 };
      }

      if (upper.startsWith('UPDATE INCIDENTS')) {
        const id = params[params.length - 1];
        const idx = rows.findIndex((r) => r.id === id);
        if (idx >= 0) {
          // Simplified: mark status if present
          const row = rows[idx]!;
          if (sql.includes('status')) row.status = params[0];
          if (sql.includes('resolved_at')) row.resolved_at = params[1];
          if (sql.includes('escalation_level')) row.escalation_level = params[0];
        }
        return { rows: { _array: [] }, rowsAffected: 1 };
      }

      if (upper.includes('WHERE STATUS')) {
        const active = rows.filter((r) => r.status === 'active');
        return { rows: { _array: active } };
      }

      if (upper.includes('WHERE ID =') && upper.includes('LIMIT 1')) {
        const id = params[0];
        const found = rows.filter((r) => r.id === id);
        return { rows: { _array: found } };
      }

      if (upper.startsWith('SELECT * FROM INCIDENTS ORDER BY')) {
        return { rows: { _array: [...rows] } };
      }

      return { rows: { _array: [] }, rowsAffected: 0 };
    }),
  };
}

function makeEvent(overrides: Partial<SOSEvent> = {}): SOSEvent {
  return {
    id:             'test-id-001',
    type:           'long_press',
    status:         'active',
    triggeredAt:    new Date(1_700_000_000_000),
    escalationLevel: 0,
    location:       { lat: 12.97, lng: 77.59, accuracy: 5, timestamp: 1_700_000_000_000 },
    isSilent:       false,
    isDuress:       false,
    ...overrides,
  };
}

describe('SQLiteSOSRepository', () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: SQLiteSOSRepository;

  beforeEach(() => {
    db   = createMockDb();
    repo = new SQLiteSOSRepository(db as any);
  });

  it('createIncident — inserts row with correct values', async () => {
    const event = makeEvent();
    await repo.createIncident(event);

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO incidents'),
      expect.arrayContaining([event.id, 'long_press', 'active']),
    );
  });

  it('createIncident — stores is_silent=1 for silent events', async () => {
    await repo.createIncident(makeEvent({ isSilent: true }));
    const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
    expect(params).toContain(1); // is_silent = 1
  });

  it('createIncident — stores is_duress=1 for duress events', async () => {
    await repo.createIncident(makeEvent({ isDuress: true }));
    const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
    expect(params).toContain(1); // is_duress = 1
  });

  it('getActiveIncident — returns null when no active incidents', async () => {
    const result = await repo.getActiveIncident();
    expect(result).toBeNull();
  });

  it('getActiveIncident — returns active incident after create', async () => {
    const event = makeEvent({ status: 'active' });
    await repo.createIncident(event);
    const result = await repo.getActiveIncident();
    expect(result).not.toBeNull();
    expect(result?.id).toBe(event.id);
    expect(result?.type).toBe('long_press');
  });

  it('getIncidentById — returns null for unknown id', async () => {
    const result = await repo.getIncidentById('unknown-id');
    expect(result).toBeNull();
  });

  it('getIncidentById — returns correct event', async () => {
    const event = makeEvent();
    await repo.createIncident(event);
    const result = await repo.getIncidentById(event.id);
    expect(result?.id).toBe(event.id);
  });

  it('updateIncident — updates status correctly', async () => {
    const event = makeEvent();
    await repo.createIncident(event);
    await repo.updateIncident(event.id, { status: 'cancelled', resolvedAt: new Date() });
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE incidents'),
      expect.any(Array),
    );
  });

  it('getIncidentHistory — returns all incidents sorted desc', async () => {
    await repo.createIncident(makeEvent({ id: 'id-1' }));
    await repo.createIncident(makeEvent({ id: 'id-2' }));
    const history = await repo.getIncidentHistory();
    expect(history.length).toBe(2);
  });

  it('rowToEvent — correctly converts null location to null', async () => {
    const event = makeEvent({ location: null });
    await repo.createIncident(event);
    const result = await repo.getIncidentById(event.id);
    expect(result?.location).toBeNull();
  });
});
