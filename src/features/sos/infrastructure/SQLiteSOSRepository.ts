import { v4 as uuidv4 } from 'uuid';
import type { DB } from '@op-engineering/op-sqlite';
import type { ISOSRepository } from '../domain/interfaces/ISOSRepository';
import type { SOSEvent, SOSStatus } from '../domain/entities/SOSEvent';
import type { TriggerMethod, EscalationLevel } from '@core/events/EventTypes';
import type { Coordinates } from '@core/location/LocationService';
import { Logger } from '@core/logger/Logger';

const TAG = 'SQLiteSOSRepository';

interface IncidentRow {
  id: string;
  type: string;
  status: string;
  triggered_at: number;
  resolved_at: number | null;
  escalation_level: number;
  location_lat: number | null;
  location_lng: number | null;
  location_accuracy: number | null;
  is_silent: number;
  is_duress: number;
  cancelled_reason: string | null;
  created_at: number;
}

function rowToEvent(row: IncidentRow): SOSEvent {
  const location: Coordinates | null =
    row.location_lat !== null && row.location_lng !== null
      ? {
          lat: row.location_lat,
          lng: row.location_lng,
          accuracy: row.location_accuracy ?? undefined,
          timestamp: row.triggered_at,
        }
      : null;

  return {
    id: row.id,
    type: row.type as TriggerMethod,
    status: row.status as SOSStatus,
    triggeredAt: new Date(row.triggered_at),
    resolvedAt: row.resolved_at !== null && row.resolved_at !== undefined ? new Date(row.resolved_at) : undefined,
    escalationLevel: row.escalation_level as EscalationLevel,
    location,
    isSilent: row.is_silent === 1,
    isDuress: row.is_duress === 1,
    cancelledReason:
      row.cancelled_reason === 'user' || row.cancelled_reason === 'timeout'
        ? row.cancelled_reason
        : undefined,
  };
}

export class SQLiteSOSRepository implements ISOSRepository {
  constructor(private readonly db: DB) {}

  createIncident(event: SOSEvent): Promise<void> {
    Logger.debug(TAG, 'createIncident', { id: event.id });
    const now = Date.now();
    return Promise.resolve(this.db.execute(
      `INSERT INTO incidents
         (id, type, status, triggered_at, escalation_level,
          location_lat, location_lng, location_accuracy,
          is_silent, is_duress, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.type,
        event.status,
        event.triggeredAt.getTime(),
        event.escalationLevel,
        event.location?.lat ?? null,
        event.location?.lng ?? null,
        event.location?.accuracy ?? null,
        event.isSilent ? 1 : 0,
        event.isDuress ? 1 : 0,
        now,
      ],
    )).then(() => {});
  }

  updateIncident(id: string, update: Partial<SOSEvent>): Promise<void> {
    Logger.debug(TAG, 'updateIncident', { id });

    const sets: string[] = [];
      const values: unknown[] = [];

    if (update.status !== undefined) {
      sets.push('status = ?');
      values.push(update.status);
    }
    if (update.resolvedAt !== undefined) {
      sets.push('resolved_at = ?');
      values.push(update.resolvedAt.getTime());
    }
    if (update.escalationLevel !== undefined) {
      sets.push('escalation_level = ?');
      values.push(update.escalationLevel);
    }
    if (update.cancelledReason !== undefined) {
      sets.push('cancelled_reason = ?');
      values.push(update.cancelledReason);
    }
    if (update.location !== undefined) {
      sets.push('location_lat = ?, location_lng = ?, location_accuracy = ?');
      values.push(
        update.location?.lat ?? null,
        update.location?.lng ?? null,
        update.location?.accuracy ?? null,
      );
    }

    if (sets.length === 0) {return Promise.resolve();}

    values.push(id);
    return Promise.resolve(this.db.execute(
      `UPDATE incidents SET ${sets.join(', ')} WHERE id = ?`,
      values,
    )).then(() => {});
  }

  getActiveIncident(): Promise<SOSEvent | null> {
    const result = this.db.execute(
      'SELECT * FROM incidents WHERE status = \'active\' ORDER BY triggered_at DESC LIMIT 1',
    );
    const rows = (result as { rows: { _array: IncidentRow[] } }).rows._array;
    const row = rows[0];
    return Promise.resolve(row !== null && row !== undefined ? rowToEvent(row) : null);
  }

  getIncidentById(id: string): Promise<SOSEvent | null> {
    const result = this.db.execute(
      'SELECT * FROM incidents WHERE id = ? LIMIT 1',
      [id],
    );
    const rows = (result as { rows: { _array: IncidentRow[] } }).rows._array;
    const row = rows[0];
    return Promise.resolve(row !== null && row !== undefined ? rowToEvent(row) : null);
  }

  getIncidentHistory(limit = 50): Promise<SOSEvent[]> {
    const result = this.db.execute(
      'SELECT * FROM incidents ORDER BY triggered_at DESC LIMIT ?',
      [limit],
    );
    return Promise.resolve((result as { rows: { _array: IncidentRow[] } }).rows._array.map(rowToEvent));
  }

  /** Records which guardian was alerted and via which method. */
  recordAlert(params: {
    incidentId: string;
    guardianId: string;
    method: 'sms' | 'push' | 'call';
    smsContent?: string;
    escalationLevel: EscalationLevel;
  }): Promise<void> {
    return Promise.resolve(this.db.execute(
      `INSERT INTO incident_alerts
         (id, incident_id, guardian_id, alert_method, sent_at, sms_content, escalation_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        params.incidentId,
        params.guardianId,
        params.method,
        Date.now(),
        params.smsContent ?? null,
        params.escalationLevel,
      ],
    )).then(() => {});
  }
}
