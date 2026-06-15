import { EventBus } from '@core/events/EventBus';
import { LocationService } from '@core/location/LocationService';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import type { IJourneyRepository } from '../domain/interfaces/IJourneyRepository';
import type { IGuardianRepository } from '@features/guardian/domain/interfaces/IGuardianRepository';
import type { Journey } from '../domain/entities/Journey';
import type { Coordinates } from '@core/location/LocationService';

export interface StartJourneyInput {
  destinationLabel?: string;
  destinationCoordinates?: Coordinates;
  expectedArrivalAt?: Date;
  updateIntervalMinutes?: number;
  deviationThresholdMeters?: number;
  guardianIds?: string[]; // defaults to all active guardians
}

export class StartJourneyUseCase {
  constructor(
    private readonly journeyRepo: IJourneyRepository,
    private readonly guardianRepo: IGuardianRepository,
  ) {}

  async execute(input: StartJourneyInput): Promise<Journey> {
    // Cancel any active journey first
    const existing = await this.journeyRepo.getActive();
    if (existing) {
      await this.journeyRepo.updateStatus(existing.id, 'cancelled');
      EventBus.emit('journey:cancelled', { journeyId: existing.id });
    }

    // Resolve guardian list
    let guardianIds = input.guardianIds ?? [];
    if (guardianIds.length === 0) {
      const active = await this.guardianRepo.getActiveGuardians();
      guardianIds = active.map((g) => g.id);
    }

    const location = await LocationService.getCurrentLocation().catch((err: unknown) => {
      EventBus.emit('system:capability_degraded', {
        capability: 'location',
        reason: err instanceof Error ? err.message : 'Location unavailable',
      });
      return null;
    });

    const journey = await this.journeyRepo.create({
      destinationLabel: input.destinationLabel,
      destinationCoordinates: input.destinationCoordinates,
      startedAt: new Date(),
      expectedArrivalAt: input.expectedArrivalAt,
      arrivedAt: undefined,
      status: 'active',
      guardianIds,
      updateIntervalMinutes: input.updateIntervalMinutes ?? 15,
      deviationThresholdMeters: input.deviationThresholdMeters ?? 500,
    });

    if (location) {
      await this.journeyRepo.addWaypoint(journey.id, location);
    }

    PreferencesStore.setString(PREF_KEYS.LAST_ACTIVE_JOURNEY_ID, journey.id);
    EventBus.emit('journey:started', { journeyId: journey.id });

    return journey;
  }
}
