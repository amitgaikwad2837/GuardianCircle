import type { DistressSignal } from '@core/events/EventTypes';

export type DistressUserAction = 'dismissed' | 'confirmed' | 'sos_triggered' | 'ignored';
export type SensitivityLevel = 'low' | 'medium' | 'high';

export interface DistressEvent {
  id: string;
  detectedAt: Date;
  confidence: number;           // 0.0 – 1.0
  signals: DistressSignal[];
  sensitivityLevel: SensitivityLevel;
  userAction?: DistressUserAction;
  actionAt?: Date;
}

export const ALERT_THRESHOLDS: Record<SensitivityLevel, number> = {
  low: 0.85,
  medium: 0.70,
  high: 0.55,
};
