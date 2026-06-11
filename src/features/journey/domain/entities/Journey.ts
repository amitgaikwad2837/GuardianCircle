import type { Coordinates } from '@core/location/LocationService';

export type JourneyStatus = 'active' | 'arrived' | 'overdue' | 'deviated' | 'cancelled';

export interface Journey {
  id: string;
  destinationLabel?: string;
  destinationCoordinates?: Coordinates;
  startedAt: Date;
  expectedArrivalAt?: Date;
  arrivedAt?: Date;
  status: JourneyStatus;
  guardianIds: string[];
  updateIntervalMinutes: number;
  deviationThresholdMeters: number;
  createdAt: Date;
}

export interface Waypoint {
  id: string;
  journeyId: string;
  coordinates: Coordinates;
  recordedAt: Date;
}
