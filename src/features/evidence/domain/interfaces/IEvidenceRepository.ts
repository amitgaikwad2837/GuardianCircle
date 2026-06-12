import type { Evidence, EvidenceType } from '../entities/Evidence';

export interface IEvidenceRepository {
  save(input: Omit<Evidence, 'id' | 'createdAt'>): Promise<Evidence>;
  getByIncident(incidentId: string): Promise<Evidence[]>;
  getRecent(limit?: number): Promise<Evidence[]>;
  delete(id: string): Promise<void>;
}
