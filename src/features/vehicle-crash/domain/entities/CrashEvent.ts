export type CrashUserAction = 'ok' | 'need_help' | 'sos_triggered' | 'no_response';

export interface CrashEvent {
  id: string;
  detectedAt: Date;
  impactMagnitudeG: number;
  speedBeforeMs: number;        // m/s — from GPS
  speedAfterMs: number;
  confidence: number;
  userAction?: CrashUserAction;
  actionAt?: Date;
}

export const CRASH_CONFIDENCE_THRESHOLD = 0.75;
export const CRASH_RESPONSE_TIMEOUT_SECONDS = 30;

/**
 * Wellness feature — not a medical device.
 * Disclaimer: "Vehicle crash detection is a safety assistance feature.
 * It may not detect all crashes or alert in all situations."
 */
