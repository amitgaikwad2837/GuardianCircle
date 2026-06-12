import { Container, DI_TOKENS } from '@core/di/Container';
import { EventBus } from '@core/events/EventBus';
import type { IGeofenceRepository } from '../domain/interfaces/IGeofenceRepository';
import type { Coordinates } from '@core/location/LocationService';

function haversineMeters(a: Coordinates, b: Coordinates): number {
  const R = 6_371_000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Track which geofences the user is currently inside to detect enter/exit edges
const insideSet = new Set<string>();

export class GeofenceMonitorUseCase {
  private readonly repo: IGeofenceRepository;

  constructor() {
    this.repo = Container.resolve<IGeofenceRepository>(DI_TOKENS.IGeofenceRepository);
  }

  async checkLocation(location: Coordinates): Promise<void> {
    const active = await this.repo.getActive();

    for (const geofence of active) {
      const distance = haversineMeters(location, geofence.center);
      const isInside = distance <= geofence.radiusMeters;
      const wasInside = insideSet.has(geofence.id);

      if (isInside && !wasInside) {
        insideSet.add(geofence.id);
        if (geofence.alertOn === 'enter' || geofence.alertOn === 'both') {
          await this.repo.recordEvent({
            geofenceId: geofence.id,
            eventType: 'enter',
            occurredAt: new Date(),
            location,
          });
          EventBus.emit('geofence:entered', {
            geofenceId: geofence.id,
            type: geofence.type,
            location,
          });
        }
      } else if (!isInside && wasInside) {
        insideSet.delete(geofence.id);
        if (geofence.alertOn === 'exit' || geofence.alertOn === 'both') {
          await this.repo.recordEvent({
            geofenceId: geofence.id,
            eventType: 'exit',
            occurredAt: new Date(),
            location,
          });
          EventBus.emit('geofence:exited', {
            geofenceId: geofence.id,
            type: geofence.type,
            location,
          });
        }
      }
    }
  }
}
