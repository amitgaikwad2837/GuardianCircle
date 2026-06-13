import type { DB } from '@op-engineering/op-sqlite';
import { v4 as uuid } from 'uuid';
import type { IGeofenceRepository } from '../domain/interfaces/IGeofenceRepository';
import type { Geofence, GeofenceEvent, GeofenceType, GeofenceAlertOn } from '../domain/entities/Geofence';

interface GeofenceRow {
  id: string;
  label: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  type: GeofenceType;
  alert_on: GeofenceAlertOn;
  is_active: number;
  guardian_ids: string;
  loitering_delay_ms: number;
  created_at: number;
}

function rowToGeofence(row: GeofenceRow): Geofence {
  return {
    id: row.id,
    label: row.label,
    center: { lat: row.center_lat, lng: row.center_lng, timestamp: row.created_at },
    radiusMeters: row.radius_m,
    type: row.type,
    alertOn: row.alert_on,
    isActive: row.is_active === 1,
    guardianIds: JSON.parse(row.guardian_ids) as string[],
    loiteringDelayMs: row.loitering_delay_ms,
    createdAt: new Date(row.created_at),
  };
}

export class SQLiteGeofenceRepository implements IGeofenceRepository {
  constructor(private readonly db: DB) {}

  async create(input: Omit<Geofence, 'id' | 'createdAt'>): Promise<Geofence> {
    const id = uuid();
    const now = Date.now();
    await this.db.execute(
      `INSERT INTO geofences
        (id, label, center_lat, center_lng, radius_m, type, alert_on,
         is_active, guardian_ids, loitering_delay_ms, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        input.label,
        input.center.lat,
        input.center.lng,
        input.radiusMeters,
        input.type,
        input.alertOn,
        input.isActive ? 1 : 0,
        JSON.stringify(input.guardianIds),
        input.loiteringDelayMs,
        now,
      ],
    );
    return { ...input, id, createdAt: new Date(now) };
  }

  async getAll(): Promise<Geofence[]> {
    const result = await this.db.execute('SELECT * FROM geofences ORDER BY created_at DESC');
    return (result as { rows: { _array: GeofenceRow[] } }).rows._array.map(rowToGeofence);
  }

  async getActive(): Promise<Geofence[]> {
    const result = await this.db.execute(
      'SELECT * FROM geofences WHERE is_active = 1 ORDER BY created_at DESC',
    );
    return (result as { rows: { _array: GeofenceRow[] } }).rows._array.map(rowToGeofence);
  }

  async getById(id: string): Promise<Geofence | null> {
    const result = await this.db.execute('SELECT * FROM geofences WHERE id = ?', [id]);
    const rows = (result as { rows: { _array: GeofenceRow[] } }).rows._array;
    return rows[0] ? rowToGeofence(rows[0]) : null;
  }

  async update(id: string, update: Partial<Omit<Geofence, 'id' | 'createdAt'>>): Promise<void> {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (update.label !== undefined) { setClauses.push('label = ?'); params.push(update.label); }
    if (update.radiusMeters !== undefined) { setClauses.push('radius_m = ?'); params.push(update.radiusMeters); }
    if (update.type !== undefined) { setClauses.push('type = ?'); params.push(update.type); }
    if (update.alertOn !== undefined) { setClauses.push('alert_on = ?'); params.push(update.alertOn); }
    if (update.isActive !== undefined) { setClauses.push('is_active = ?'); params.push(update.isActive ? 1 : 0); }
    if (update.guardianIds !== undefined) { setClauses.push('guardian_ids = ?'); params.push(JSON.stringify(update.guardianIds)); }
    if (update.loiteringDelayMs !== undefined) { setClauses.push('loitering_delay_ms = ?'); params.push(update.loiteringDelayMs); }

    if (setClauses.length === 0) {return;}
    params.push(id);
    await this.db.execute(`UPDATE geofences SET ${setClauses.join(', ')} WHERE id = ?`, params);
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM geofences WHERE id = ?', [id]);
  }

  async recordEvent(event: Omit<GeofenceEvent, 'id'>): Promise<void> {
    const id = uuid();
    await this.db.execute(
      'INSERT INTO geofence_events (id, geofence_id, event_type, occurred_at, lat, lng) VALUES (?,?,?,?,?,?)',
      [
        id,
        event.geofenceId,
        event.eventType,
        event.occurredAt.getTime(),
        event.location?.lat ?? null,
        event.location?.lng ?? null,
      ],
    );
  }
}
