import type { Guardian } from '@features/guardian/domain/entities/Guardian';
import type { Coordinates } from '@core/location/LocationService';
import type { EscalationLevel } from '@core/events/EventTypes';

export interface AlertPayload {
  incidentId: string;
  senderName: string;
  location: Coordinates | null;
  escalationLevel: EscalationLevel;
  isSilent: boolean;
}

export interface IAlertDispatcher {
  dispatchSMS(guardian: Guardian, payload: AlertPayload): Promise<'sent' | 'failed'>;
  dispatchCall(guardian: Guardian): Promise<'initiated' | 'failed'>;
  dispatchPushNotification(guardian: Guardian, payload: AlertPayload): Promise<'sent' | 'no_token' | 'failed'>;
}
