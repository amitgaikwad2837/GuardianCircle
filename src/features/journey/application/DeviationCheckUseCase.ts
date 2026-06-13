import { Container, DI_TOKENS } from '@core/di/Container';
import { EventBus } from '@core/events/EventBus';
import type { IJourneyRepository } from '../domain/interfaces/IJourneyRepository';
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

export class DeviationCheckUseCase {
  private readonly repo: IJourneyRepository;

  constructor() {
    this.repo = Container.resolve<IJourneyRepository>(DI_TOKENS.IJourneyRepository);
  }

  async execute(journeyId: string, currentLocation: Coordinates): Promise<void> {
    const journey = await this.repo.getById(journeyId);
    if (!journey || journey.status !== 'active') {return;}

    await this.repo.addWaypoint(journeyId, currentLocation);
    EventBus.emit('journey:location_updated', { journeyId, location: currentLocation });

    if (!journey.destinationCoordinates) {return;}

    // Check overdue
    if (journey.expectedArrivalAt && new Date() > journey.expectedArrivalAt) {
      const minutesLate = Math.floor(
        (Date.now() - journey.expectedArrivalAt.getTime()) / 60_000,
      );
      await this.repo.updateStatus(journeyId, 'overdue');
      EventBus.emit('journey:overdue', { journeyId, minutesLate });
      return;
    }

    // Deviation check — compare to straight line from start to destination
    // Simplified: compare current position to destination
    const deviationMeters = haversineMeters(currentLocation, journey.destinationCoordinates);
    if (deviationMeters > journey.deviationThresholdMeters * 2) {
      await this.repo.updateStatus(journeyId, 'deviated');
      EventBus.emit('journey:deviated', {
        journeyId,
        deviationMeters,
        location: currentLocation,
      });
    }
  }
}
