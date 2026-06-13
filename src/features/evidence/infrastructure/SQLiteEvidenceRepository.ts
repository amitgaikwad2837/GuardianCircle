import type { DB } from '@op-engineering/op-sqlite';
import { v4 as uuid } from 'uuid';
import type { IEvidenceRepository } from '../domain/interfaces/IEvidenceRepository';
import type { Evidence, EvidenceType } from '../domain/entities/Evidence';

interface EvidenceRow {
  id: string;
  incident_id: string | null;
  type: EvidenceType;
  file_uri: string | null;
  content_hash: string;
  captured_at: number;
  lat: number | null;
  lng: number | null;
  metadata: string;
  is_encrypted: number;
  created_at: number;
}

function rowToEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    incidentId: row.incident_id ?? undefined,
    type: row.type,
    fileUri: row.file_uri ?? undefined,
    contentHash: row.content_hash,
    capturedAt: new Date(row.captured_at),
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
    isEncrypted: row.is_encrypted === 1,
    createdAt: new Date(row.created_at),
  };
}

export class SQLiteEvidenceRepository implements IEvidenceRepository {
  constructor(private readonly db: DB) {}

  async save(input: Omit<Evidence, 'id' | 'createdAt'>): Promise<Evidence> {
    const id  = uuid();
    const now = Date.now();
    await this.db.execute(
      `INSERT INTO evidence
        (id, incident_id, type, file_uri, content_hash, captured_at,
         lat, lng, metadata, is_encrypted, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        input.incidentId ?? null,
        input.type,
        input.fileUri ?? null,
        input.contentHash,
        input.capturedAt.getTime(),
        input.lat ?? null,
        input.lng ?? null,
        JSON.stringify(input.metadata),
        input.isEncrypted ? 1 : 0,
        now,
      ],
    );
    return { ...input, id, createdAt: new Date(now) };
  }

  async getByIncident(incidentId: string): Promise<Evidence[]> {
    const result = await this.db.execute(
      'SELECT * FROM evidence WHERE incident_id = ? ORDER BY captured_at DESC',
      [incidentId],
    );
    return (result as { rows: { _array: EvidenceRow[] } }).rows._array.map(rowToEvidence);
  }

  async getRecent(limit = 20): Promise<Evidence[]> {
    const result = await this.db.execute(
      'SELECT * FROM evidence ORDER BY captured_at DESC LIMIT ?',
      [limit],
    );
    return (result as { rows: { _array: EvidenceRow[] } }).rows._array.map(rowToEvidence);
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM evidence WHERE id = ?', [id]);
  }
}
