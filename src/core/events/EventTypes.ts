import type { Coordinates } from '@core/location/LocationService';

export type TriggerMethod = 'manual_tap' | 'long_press' | 'shake' | 'volume_buttons' | 'widget' | 'lock_screen' | 'voice' | 'duress_pin';

export type EscalationLevel = 0 | 1 | 2 | 3;

export type DistressSignalType =
  | 'motion_agitation'
  | 'motion_stillness'
  | 'rapid_location_change'
  | 'location_deviation'
  | 'device_face_down'
  | 'audio_level_spike'
  | 'time_context';

export interface DistressSignal {
  type: DistressSignalType;
  value: number;
  weight: number;
  timestamp: number;
}

/**
 * Typed event map for the application EventBus.
 * Features communicate ONLY through these events — no direct imports between features.
 */
export type AppEvents = {
  // ─── Onboarding ────────────────────────────────────
  'onboarding:complete': Record<string, never>;

  // ─── SOS ───────────────────────────────────────────
  'sos:triggered': {
    incidentId: string;
    method: TriggerMethod;
    isSilent: boolean;
    location: Coordinates | null;
    allDispatchFailed: boolean;
  };
  'sos:cancelled': { incidentId: string; reason: 'user' | 'timeout' };
  'sos:escalated': { incidentId: string; level: EscalationLevel };
  'sos:resolved': { incidentId: string };
  'sos:acknowledged': { incidentId: string; guardianId: string };

  // ─── Distress ──────────────────────────────────────
  'distress:detected': { eventId: string; confidence: number; signals: DistressSignal[] };
  'distress:dismissed': { eventId: string };
  'distress:confirmed': { eventId: string };

  // ─── Fall ──────────────────────────────────────────
  'fall:detected': { eventId: string; confidence: number; impactMagnitude: number };
  'fall:confirmed': { eventId: string };
  'fall:dismissed': { eventId: string };

  // ─── Vehicle crash ─────────────────────────────────
  'crash:detected': { eventId: string; confidence: number; impactMagnitude: number };
  'crash:confirmed': { eventId: string };
  'crash:dismissed': { eventId: string };

  // ─── Journey ───────────────────────────────────────
  'journey:started': { journeyId: string };
  'journey:deviated': { journeyId: string; deviationMeters: number; location: Coordinates };
  'journey:overdue': { journeyId: string; minutesLate: number };
  'journey:arrived': { journeyId: string };
  'journey:cancelled': { journeyId: string };
  'journey:location_updated': { journeyId: string; location: Coordinates };

  // ─── Check-in ──────────────────────────────────────
  'checkin:due': { checkinId: string };
  'checkin:completed': { checkinId: string };
  'checkin:missed': { checkinId: string };
  'checkin:escalated': { checkinId: string };

  // ─── Guardian ──────────────────────────────────────
  'guardian:added': { guardianId: string };
  'guardian:removed': { guardianId: string; isSilent: boolean };
  'guardian:paired': { guardianId: string };

  // ─── Geofence ──────────────────────────────────────
  'geofence:entered': { geofenceId: string; type: 'safe' | 'unsafe'; location: Coordinates };
  'geofence:exited': { geofenceId: string; type: 'safe' | 'unsafe'; location: Coordinates };

  // ─── BLE Mesh ──────────────────────────────────────
  'ble:beacon_started': { messageType: 'SOS' | 'RELAY' };
  'ble:beacon_stopped': Record<string, never>;
  'ble:sos_detected': { hopCount: number };
  'ble:relay_enrolled': Record<string, never>;
  'ble:relaying': { hopCount: number };

  // ─── System ────────────────────────────────────────
  'app:foreground': Record<string, never>;
  'app:background': Record<string, never>;
  'battery:low': { level: number };
  'battery:critical': { level: number };
};
