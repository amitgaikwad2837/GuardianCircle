import { SQLiteJourneyRepository } from '@features/journey/infrastructure/SQLiteJourneyRepository';
import type { Journey } from '@features/journey/domain/entities/Journey';

function createMockDb() {
  const journeys: Record<string, unknown>[] = [];
  const waypoints: Record<string, unknown>[] = [];

  return {
    execute: jest.fn().mockImplementation((sql: string, params: unknown[] = []) => {
      const upper = sql.trim().toUpperCase();

      if (upper.startsWith('INSERT INTO JOURNEYS')) {
        journeys.push({
          id: params[0],
          destination_label: params[1],
          destination_lat: params[2],
          destination_lng: params[3],
          started_at: params[4],
          expected_arrival_at: params[5],
          arrived_at: params[6],
          status: params[7],
          guardian_ids: params[8],
          update_interval_minutes: params[9],
          deviation_threshold_m: params[10],
          created_at: params[11],
        });
        return { rows: { _array: [] }, rowsAffected: 1 };
      }

      if (upper.includes("STATUS = 'ACTIVE'")) {
        const active = journeys.filter((j) => j.status === 'active');
        return { rows: { _array: active } };
      }

      if (upper.startsWith('SELECT * FROM JOURNEYS WHERE ID =')) {
        return { rows: { _array: journeys.filter((j) => j.id === params[0]) } };
      }

      if (upper.startsWith("SELECT * FROM JOURNEYS WHERE STATUS != 'ACTIVE'")) {
        const hist = journeys.filter((j) => j.status !== 'active');
        return { rows: { _array: hist.slice(0, (params[0] as number) ?? 20) } };
      }

      if (upper.startsWith('UPDATE JOURNEYS SET STATUS =')) {
        const id = params[1];
        const j = journeys.find((r) => r.id === id);
        if (j) j.status = params[0];
        return { rows: { _array: [] }, rowsAffected: 1 };
      }

      if (upper.startsWith('UPDATE JOURNEYS SET')) {
        return { rows: { _array: [] }, rowsAffected: 1 };
      }

      if (upper.startsWith('INSERT INTO JOURNEY_WAYPOINTS')) {
        waypoints.push({ id: params[0], journey_id: params[1], lat: params[2], lng: params[3], accuracy: params[4], speed: params[5], recorded_at: params[6] });
        return { rows: { _array: [] }, rowsAffected: 1 };
      }

      if (upper.startsWith('SELECT * FROM JOURNEY_WAYPOINTS')) {
        return { rows: { _array: waypoints.filter((w) => w.journey_id === params[0]) } };
      }

      return { rows: { _array: [] }, rowsAffected: 0 };
    }),
  };
}

function makeJourneyInput(): Omit<Journey, 'id' | 'createdAt'> {
  return {
    startedAt: new Date(1_700_000_000_000),
    status: 'active',
    guardianIds: ['g-1', 'g-2'],
    updateIntervalMinutes: 15,
    deviationThresholdMeters: 500,
  };
}

describe('SQLiteJourneyRepository', () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: SQLiteJourneyRepository;

  beforeEach(() => {
    db   = createMockDb();
    repo = new SQLiteJourneyRepository(db as any);
  });

  it('create — returns journey with generated id', async () => {
    const j = await repo.create(makeJourneyInput());
    expect(j.id).toBeDefined();
    expect(j.status).toBe('active');
    expect(j.guardianIds).toEqual(['g-1', 'g-2']);
  });

  it('create — stores destination label and coordinates', async () => {
    const j = await repo.create({
      ...makeJourneyInput(),
      destinationLabel: 'Home',
      destinationCoordinates: { lat: 12.97, lng: 77.59, timestamp: Date.now() },
    });
    expect(j.destinationLabel).toBe('Home');
    expect(j.destinationCoordinates?.lat).toBe(12.97);
  });

  it('getActive — returns active journey', async () => {
    await repo.create(makeJourneyInput());
    const active = await repo.getActive();
    expect(active).not.toBeNull();
    expect(active?.status).toBe('active');
  });

  it('getActive — returns null when no active journey', async () => {
    const result = await repo.getActive();
    expect(result).toBeNull();
  });

  it('getById — returns correct journey', async () => {
    const created = await repo.create(makeJourneyInput());
    const found = await repo.getById(created.id);
    expect(found?.id).toBe(created.id);
  });

  it('getById — returns null for unknown id', async () => {
    const result = await repo.getById('unknown-id');
    expect(result).toBeNull();
  });

  it('updateStatus — changes journey status', async () => {
    const j = await repo.create(makeJourneyInput());
    await repo.updateStatus(j.id, 'arrived');
    expect(db.execute).toHaveBeenCalledWith(
      'UPDATE journeys SET status = ? WHERE id = ?',
      ['arrived', j.id],
    );
  });

  it('addWaypoint — inserts waypoint', async () => {
    const j = await repo.create(makeJourneyInput());
    await repo.addWaypoint(j.id, { lat: 12.97, lng: 77.59, timestamp: Date.now() });
    const waypoints = await repo.getWaypoints(j.id);
    expect(waypoints.length).toBe(1);
    expect(waypoints[0]!.coordinates.lat).toBe(12.97);
  });

  it('getHistory — returns completed journeys', async () => {
    const j = await repo.create(makeJourneyInput());
    await repo.updateStatus(j.id, 'arrived');
    const hist = await repo.getHistory(10);
    expect(hist.length).toBe(1);
    expect(hist[0]!.status).toBe('arrived');
  });
});
