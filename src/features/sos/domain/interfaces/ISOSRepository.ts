import type { SOSEvent } from '../entities/SOSEvent';

export interface ISOSRepository {
  createIncident(event: SOSEvent): Promise<void>;
  updateIncident(id: string, update: Partial<SOSEvent>): Promise<void>;
  getActiveIncident(): Promise<SOSEvent | null>;
  getIncidentById(id: string): Promise<SOSEvent | null>;
  getIncidentHistory(limit?: number): Promise<SOSEvent[]>;
}
