import type { DB } from '@op-engineering/op-sqlite';
import { v4 as uuid } from 'uuid';
import type { IJourneyRepository } from '../domain/interfaces/IJourneyRepository';
import type { Journey, JourneyStatus, Waypoint } from '../domain/entities/Journey';
import type { Coordinates } from '@core/location/LocationService';

interface JourneyRow {
  id: string;
  destination_label: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  started_at: number;
  expected_arrival_at: number | null;
  arrived_at: number | null;
  status: JourneyStatus;
  guardian_ids: string;
  update_interval_minutes: number;
  deviation_threshold_m: number;
  created_at: number;
}

interface WaypointRow {
  id: string;
  journey_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  recorded_at: number;
}

function rowToJourney(row: JourneyRow): Journey {
  return {
    id: row.id,
    destinationLabel: row.destination_label ?? undefined,
    destinationCoordinates:
      row.destination_lat != null && row.destination_lng != null
        ? { lat: row.destination_lat, lng: row.destination_lng, timestamp: row.started_at }
        : undefined,
    startedAt: new Date(row.started_at),
    expectedArrivalAt: row.expected_arrival_at ? new Date(row.expected_arrival_at) : undefined,
    arrivedAt: row.arrived_at ? new Date(row.arrived_at) : undefined,
    status: row.status,
    guardianIds: JSON.parse(row.guardian_ids) as string[],
    updateIntervalMinutes: row.update_interval_minutes,
    deviationThresholdMeters: row.deviation_threshold_m,
    createdAt: new Date(row.created_at),
  };
}

function rowToWaypoint(row: WaypointRow): Waypoint {
  return {
    id: row.id,
    journeyId: row.journey_id,
    coordinates: {
      lat: row.lat,
      lng: row.lng,
      accuracy: row.accuracy ?? undefined,
      speed: row.speed ?? undefined,
      timestamp: row.recorded_at,
    },
    recordedAt: new Date(row.recorded_at),
  };
}

export class SQLiteJourneyRepository implements IJourneyRepository {
  constructor(private readonly db: DB) {}

  async create(input: Omit<Journey, 'id' | 'createdAt'>): Promise<Journey> {
    const id = uuid();
    const now = Date.now();
    await this.db.execute(
      `INSERT INTO journeys
        (id, destination_label, destination_lat, destination_lng, started_at,
         expected_arrival_at, arrived_at, status, guardian_ids,
         update_interval_minutes, deviation_threshold_m, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        input.destinationLabel ?? null,
        input.destinationCoordinates?.lat ?? null,
        input.destinationCoordinates?.lng ?? null,
        input.startedAt.getTime(),
        input.expectedArrivalAt?.getTime() ?? null,
        input.arrivedAt?.getTime() ?? null,
        input.status,
        JSON.stringify(input.guardianIds),
        input.updateIntervalMinutes,
        input.deviationThresholdMeters,
        now,
      ],
    );
    return { ...input, id, createdAt: new Date(now) };
  }

  async getActive(): Promise<Journey | null> {
    const result = await this.db.execute(
      `SELECT * FROM journeys WHERE status = 'active' ORDER BY started_at DESC LIMIT 1`,
    );
    const rows = (result as any).rows._array as JourneyRow[];
    return rows[0] ? rowToJourney(rows[0]) : null;
  }

  async getById(id: string): Promise<Journey | null> {
    const result = await this.db.execute(
      'SELECT * FROM journeys WHERE id = ?',
      [id],
    );
    const rows = (result as any).rows._array as JourneyRow[];
    return rows[0] ? rowToJourney(rows[0]) : null;
  }

  async update(id: string, update: Partial<Omit<Journey, 'id' | 'createdAt'>>): Promise<void> {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (update.status !== undefined) { setClauses.push('status = ?'); params.push(update.status); }
    if (update.arrivedAt !== undefined) { setClauses.push('arrived_at = ?'); params.push(update.arrivedAt.getTime()); }
    if (update.expectedArrivalAt !== undefined) { setClauses.push('expected_arrival_at = ?'); params.push(update.expectedArrivalAt.getTime()); }
    if (update.guardianIds !== undefined) { setClauses.push('guardian_ids = ?'); params.push(JSON.stringify(update.guardianIds)); }

    if (setClauses.length === 0) return;
    params.push(id);
    await this.db.execute(`UPDATE journeys SET ${setClauses.join(', ')} WHERE id = ?`, params);
  }

  async updateStatus(id: string, status: JourneyStatus): Promise<void> {
    await this.db.execute('UPDATE journeys SET status = ? WHERE id = ?', [status, id]);
  }

  async addWaypoint(journeyId: string, coords: Coordinates): Promise<void> {
    const id = uuid();
    await this.db.execute(
      'INSERT INTO journey_waypoints (id, journey_id, lat, lng, accuracy, speed, recorded_at) VALUES (?,?,?,?,?,?,?)',
      [id, journeyId, coords.lat, coords.lng, coords.accuracy ?? null, coords.speed ?? null, coords.timestamp],
    );
  }

  async getWaypoints(journeyId: string): Promise<Waypoint[]> {
    const result = await this.db.execute(
      'SELECT * FROM journey_waypoints WHERE journey_id = ? ORDER BY recorded_at ASC',
      [journeyId],
    );
    return ((result as any).rows._array as WaypointRow[]).map(rowToWaypoint);
  }

  async getHistory(limit = 20): Promise<Journey[]> {
    const result = await this.db.execute(
      `SELECT * FROM journeys WHERE status != 'active' ORDER BY started_at DESC LIMIT ?`,
      [limit],
    );
    return ((result as any).rows._array as JourneyRow[]).map(rowToJourney);
  }
}
