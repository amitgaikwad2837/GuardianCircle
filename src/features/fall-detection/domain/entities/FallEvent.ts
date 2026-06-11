export type FallUserAction = 'ok' | 'need_help' | 'sos_triggered' | 'no_response';

export interface FallEvent {
  id: string;
  detectedAt: Date;
  impactMagnitudeG: number;
  freefallDurationMs: number;
  postImpactStillnessMs: number;
  confidence: number;           // 0.0 – 1.0
  userAction?: FallUserAction;
  actionAt?: Date;
}

/**
 * Minimum confidence threshold to trigger user confirmation dialog.
 * Conservative to reduce false positives.
 */
export const FALL_CONFIDENCE_THRESHOLD = 0.70;

/**
 * Seconds to wait for user response before auto-triggering SOS.
 */
export const FALL_RESPONSE_TIMEOUT_SECONDS = 30;
