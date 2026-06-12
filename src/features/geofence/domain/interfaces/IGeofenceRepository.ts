import type { Geofence, GeofenceEvent } from '../entities/Geofence';

export interface IGeofenceRepository {
  create(input: Omit<Geofence, 'id' | 'createdAt'>): Promise<Geofence>;
  getAll(): Promise<Geofence[]>;
  getActive(): Promise<Geofence[]>;
  getById(id: string): Promise<Geofence | null>;
  update(id: string, update: Partial<Omit<Geofence, 'id' | 'createdAt'>>): Promise<void>;
  delete(id: string): Promise<void>;
  recordEvent(event: Omit<GeofenceEvent, 'id'>): Promise<void>;
}
