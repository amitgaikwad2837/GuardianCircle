import type { DB } from '@op-engineering/op-sqlite';
import { v4 as uuid } from 'uuid';
import type { ICheckInRepository } from '../domain/interfaces/ICheckInRepository';
import type { CheckIn, CheckInStatus, CheckInType } from '../domain/entities/CheckIn';

interface CheckInRow {
  id: string;
  label: string | null;
  type: CheckInType;
  scheduled_at: number;
  completed_at: number | null;
  missed_at: number | null;
  recurrence_rule: string | null;
  guardian_ids: string;
  escalation_delay_minutes: number;
  status: CheckInStatus;
  journey_id: string | null;
  created_at: number;
}

function rowToCheckIn(row: CheckInRow): CheckIn {
  return {
    id: row.id,
    label: row.label ?? undefined,
    type: row.type,
    scheduledAt: new Date(row.scheduled_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    missedAt: row.missed_at ? new Date(row.missed_at) : undefined,
    recurrenceRule: row.recurrence_rule ?? undefined,
    guardianIds: JSON.parse(row.guardian_ids) as string[],
    escalationDelayMinutes: row.escalation_delay_minutes,
    status: row.status,
    journeyId: row.journey_id ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

export class SQLiteCheckInRepository implements ICheckInRepository {
  constructor(private readonly db: DB) {}

  async create(input: Omit<CheckIn, 'id' | 'createdAt'>): Promise<CheckIn> {
    const id = uuid();
    const now = Date.now();
    await this.db.execute(
      `INSERT INTO checkins
        (id, label, type, scheduled_at, completed_at, missed_at, recurrence_rule,
         guardian_ids, escalation_delay_minutes, status, journey_id, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        input.label ?? null,
        input.type,
        input.scheduledAt.getTime(),
        input.completedAt?.getTime() ?? null,
        input.missedAt?.getTime() ?? null,
        input.recurrenceRule ?? null,
        JSON.stringify(input.guardianIds),
        input.escalationDelayMinutes,
        input.status,
        input.journeyId ?? null,
        now,
      ],
    );
    return { ...input, id, createdAt: new Date(now) };
  }

  async getById(id: string): Promise<CheckIn | null> {
    const result = await this.db.execute('SELECT * FROM checkins WHERE id = ?', [id]);
    const rows = (result as any).rows._array as CheckInRow[];
    return rows[0] ? rowToCheckIn(rows[0]) : null;
  }

  async getPending(): Promise<CheckIn[]> {
    const result = await this.db.execute(
      `SELECT * FROM checkins WHERE status = 'pending' ORDER BY scheduled_at ASC`,
    );
    return ((result as any).rows._array as CheckInRow[]).map(rowToCheckIn);
  }

  async getDue(before: Date): Promise<CheckIn[]> {
    const result = await this.db.execute(
      `SELECT * FROM checkins WHERE status = 'pending' AND scheduled_at <= ? ORDER BY scheduled_at ASC`,
      [before.getTime()],
    );
    return ((result as any).rows._array as CheckInRow[]).map(rowToCheckIn);
  }

  async getRecurring(): Promise<CheckIn[]> {
    const result = await this.db.execute(
      `SELECT * FROM checkins WHERE type = 'recurring' AND status IN ('pending','completed') ORDER BY scheduled_at ASC`,
    );
    return ((result as any).rows._array as CheckInRow[]).map(rowToCheckIn);
  }

  async updateStatus(id: string, status: CheckInStatus, timestamp?: Date): Promise<void> {
    if (status === 'completed' && timestamp) {
      await this.db.execute(
        'UPDATE checkins SET status = ?, completed_at = ? WHERE id = ?',
        [status, timestamp.getTime(), id],
      );
    } else if (status === 'missed' && timestamp) {
      await this.db.execute(
        'UPDATE checkins SET status = ?, missed_at = ? WHERE id = ?',
        [status, timestamp.getTime(), id],
      );
    } else {
      await this.db.execute('UPDATE checkins SET status = ? WHERE id = ?', [status, id]);
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM checkins WHERE id = ?', [id]);
  }
}
