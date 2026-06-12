import type { Journey, JourneyStatus, Waypoint } from '../entities/Journey';
import type { Coordinates } from '@core/location/LocationService';

export interface IJourneyRepository {
  create(input: Omit<Journey, 'id' | 'createdAt'>): Promise<Journey>;
  getActive(): Promise<Journey | null>;
  getById(id: string): Promise<Journey | null>;
  update(id: string, update: Partial<Omit<Journey, 'id' | 'createdAt'>>): Promise<void>;
  updateStatus(id: string, status: JourneyStatus): Promise<void>;
  addWaypoint(journeyId: string, coords: Coordinates): Promise<void>;
  getWaypoints(journeyId: string): Promise<Waypoint[]>;
  getHistory(limit?: number): Promise<Journey[]>;
}
