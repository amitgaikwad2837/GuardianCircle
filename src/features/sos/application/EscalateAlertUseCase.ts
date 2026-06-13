import type { ISOSRepository } from '../domain/interfaces/ISOSRepository';
import type { IAlertDispatcher } from '../domain/interfaces/IAlertDispatcher';
import type { IGuardianRepository } from '@features/guardian/domain/interfaces/IGuardianRepository';
import { LocationService } from '@core/location/LocationService';
import { EventBus } from '@core/events/EventBus';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import type { EscalationLevel } from '@core/events/EventTypes';

export class EscalateAlertUseCase {
  constructor(
    private readonly sosRepo: ISOSRepository,
    private readonly guardianRepo: IGuardianRepository,
    private readonly dispatcher: IAlertDispatcher,
  ) {}

  async execute(incidentId: string, toLevel: EscalationLevel): Promise<void> {
    const incident = await this.sosRepo.getIncidentById(incidentId);
    if (!incident || incident.status !== 'active') return;

    await this.sosRepo.updateIncident(incidentId, { escalationLevel: toLevel });

    const location = await LocationService.getCurrentLocation().catch(() => incident.location);
    const senderName = PreferencesStore.getString(PREF_KEYS.USER_DISPLAY_NAME) ?? 'Your contact';
    const guardians = await this.guardianRepo.getActiveGuardians();

    // Level 1+: call priority-1 guardian — race with a 5 s timeout so a hanging
    // dialer intent never blocks the level-2 SMS dispatch below
    if (toLevel >= 1) {
      const priority1 = guardians.find((g) => g.notificationPriority === 1);
      if (priority1) {
        await Promise.race([
          this.dispatcher.dispatchCall(priority1),
          new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
        ]);
      }
    }

    // Level 2+: call priority-2, send location update SMS to all
    if (toLevel >= 2) {
      const priority2 = guardians.find((g) => g.notificationPriority === 2);
      if (priority2) await this.dispatcher.dispatchCall(priority2);

      await Promise.allSettled(
        guardians.map((g) =>
          this.dispatcher.dispatchSMS(g, {
            incidentId,
            senderName,
            location,
            escalationLevel: toLevel,
            isSilent: incident.isSilent,
          }),
        ),
      );
    }

    EventBus.emit('sos:escalated', { incidentId, level: toLevel });
  }
}
