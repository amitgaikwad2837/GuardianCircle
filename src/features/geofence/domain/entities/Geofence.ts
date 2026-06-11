import type { Coordinates } from '@core/location/LocationService';

export type GeofenceType = 'safe' | 'unsafe';
export type GeofenceAlertOn = 'enter' | 'exit' | 'both';

export interface Geofence {
  id: string;
  label: string;
  center: Coordinates;
  radiusMeters: number;
  type: GeofenceType;
  alertOn: GeofenceAlertOn;
  isActive: boolean;
  guardianIds: string[];
  loiteringDelayMs: number;   // debounce rapid enter/exit — default 3 min
  createdAt: Date;
}

export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  eventType: 'enter' | 'exit';
  occurredAt: Date;
  location?: Coordinates;
}
