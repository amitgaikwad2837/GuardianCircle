import type { Coordinates } from '@core/location/LocationService';
import type { TriggerMethod, EscalationLevel } from '@core/events/EventTypes';

export type SOSStatus = 'countdown' | 'active' | 'cancelled' | 'resolved';

export interface SOSEvent {
  id: string;
  type: TriggerMethod;
  status: SOSStatus;
  triggeredAt: Date;
  resolvedAt?: Date;
  escalationLevel: EscalationLevel;
  location: Coordinates | null;
  isSilent: boolean;
  isDuress: boolean;
  cancelledReason?: 'user' | 'timeout';
}
