import type { DB } from '@op-engineering/op-sqlite';
import { v4 as uuid } from 'uuid';
import type { IDistressRepository } from '../domain/interfaces/IDistressRepository';
import type { DistressEvent, DistressUserAction, SensitivityLevel } from '../domain/entities/DistressEvent';
import type { DistressSignal } from '@core/events/EventTypes';

interface DistressRow {
  id: string;
  detected_at: number;
  confidence: number;
  signals: string;
  sensitivity_level: SensitivityLevel;
  user_action: DistressUserAction | null;
  action_at: number | null;
  created_at: number;
}

function rowToEvent(row: DistressRow): DistressEvent {
  return {
    id: row.id,
    detectedAt: new Date(row.detected_at),
    confidence: row.confidence,
    signals: JSON.parse(row.signals) as DistressSignal[],
    sensitivityLevel: row.sensitivity_level,
    userAction: row.user_action ?? undefined,
    actionAt: row.action_at ? new Date(row.action_at) : undefined,
  };
}

export class SQLiteDistressRepository implements IDistressRepository {
  constructor(private readonly db: DB) {}

  async saveEvent(input: Omit<DistressEvent, 'id'>): Promise<DistressEvent> {
    const id = uuid();
    const now = Date.now();
    await this.db.execute(
      `INSERT INTO distress_events
        (id, detected_at, confidence, signals, sensitivity_level,
         user_action, action_at, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        id,
        input.detectedAt.getTime(),
        input.confidence,
        JSON.stringify(input.signals),
        input.sensitivityLevel,
        input.userAction ?? null,
        input.actionAt?.getTime() ?? null,
        now,
      ],
    );
    return { ...input, id };
  }

  async updateAction(id: string, action: DistressUserAction, actionAt: Date): Promise<void> {
    await this.db.execute(
      'UPDATE distress_events SET user_action = ?, action_at = ? WHERE id = ?',
      [action, actionAt.getTime(), id],
    );
  }

  async getRecent(limit = 20): Promise<DistressEvent[]> {
    const result = await this.db.execute(
      'SELECT * FROM distress_events ORDER BY detected_at DESC LIMIT ?',
      [limit],
    );
    return (result.rows._array as DistressRow[]).map(rowToEvent);
  }
}
