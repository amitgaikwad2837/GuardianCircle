import type { DistressEvent, DistressUserAction } from '../entities/DistressEvent';

export interface IDistressRepository {
  saveEvent(event: Omit<DistressEvent, 'id'>): Promise<DistressEvent>;
  updateAction(id: string, action: DistressUserAction, actionAt: Date): Promise<void>;
  getRecent(limit?: number): Promise<DistressEvent[]>;
}
