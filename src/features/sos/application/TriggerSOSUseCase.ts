import { v4 as uuidv4 } from 'uuid';
import type { ISOSRepository } from '../domain/interfaces/ISOSRepository';
import type { IAlertDispatcher } from '../domain/interfaces/IAlertDispatcher';
import type { IGuardianRepository } from '@features/guardian/domain/interfaces/IGuardianRepository';
import { LocationService } from '@core/location/LocationService';
import { EventBus } from '@core/events/EventBus';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import type { TriggerMethod } from '@core/events/EventTypes';
import type { SOSEvent } from '../domain/entities/SOSEvent';

export interface TriggerSOSInput {
  method: TriggerMethod;
  isSilent: boolean;
  isDuress?: boolean;
}

export class TriggerSOSUseCase {
  constructor(
    private readonly sosRepo: ISOSRepository,
    private readonly guardianRepo: IGuardianRepository,
    private readonly dispatcher: IAlertDispatcher,
  ) {}

  async execute(input: TriggerSOSInput): Promise<SOSEvent> {
    const location = await LocationService.getCurrentLocation().catch((err: unknown) => {
      EventBus.emit('system:capability_degraded', {
        capability: 'location',
        reason: err instanceof Error ? err.message : 'Location unavailable',
      });
      return null;
    });
    const senderName = PreferencesStore.getString(PREF_KEYS.USER_DISPLAY_NAME) ?? 'Your contact';

    const event: SOSEvent = {
      id: uuidv4(),
      type: input.method,
      status: 'active',
      triggeredAt: new Date(),
      escalationLevel: 0,
      location,
      isSilent: input.isSilent,
      isDuress: input.isDuress ?? false,
    };

    await this.sosRepo.createIncident(event);

    const guardians = await this.guardianRepo.getActiveGuardians();

    const dispatchResults = await Promise.allSettled(
      guardians.map(async (guardian) => {
        const payload = {
          incidentId: event.id,
          senderName,
          location,
          escalationLevel: 0 as const,
          isSilent: input.isSilent,
        };
        const [smsResult, pushResult] = await Promise.allSettled([
          this.dispatcher.dispatchSMS(guardian, payload),
          this.dispatcher.dispatchPushNotification(guardian, payload),
        ]);
        return { guardian, smsResult, pushResult };
      }),
    );

    const anyDelivered = dispatchResults.some((r) => {
      if (r.status !== 'fulfilled') {return false;}
      const { smsResult, pushResult } = r.value;
      return (
        (smsResult.status === 'fulfilled' && smsResult.value === 'sent') ||
        (pushResult.status === 'fulfilled' && pushResult.value === 'sent')
      );
    });

    EventBus.emit('sos:triggered', {
      incidentId: event.id,
      method: input.method,
      isSilent: input.isSilent,
      location,
      allDispatchFailed: !anyDelivered,
    });

    return event;
  }
}
