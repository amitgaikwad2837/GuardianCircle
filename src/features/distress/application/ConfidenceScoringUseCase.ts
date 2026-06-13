import type { DistressSignal } from '@core/events/EventTypes';
import type { SensitivityLevel } from '../domain/entities/DistressEvent';
import { ALERT_THRESHOLDS } from '../domain/entities/DistressEvent';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';

const SENSITIVITY_MULTIPLIERS: Record<SensitivityLevel, number> = {
  low: 0.75,
  medium: 1.0,
  high: 1.3,
};

export class ConfidenceScoringUseCase {
  compute(signals: DistressSignal[]): number {
    if (signals.length === 0) {return 0;}

    const weightedSum = signals.reduce((sum, s) => sum + s.value * s.weight, 0);
    const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
    const rawScore = weightedSum / totalWeight;

    const level = (PreferencesStore.getString(PREF_KEYS.SENSITIVITY_LEVEL) ??
      'medium') as SensitivityLevel;
    const multiplier = SENSITIVITY_MULTIPLIERS[level];

    return Math.min(1.0, rawScore * multiplier);
  }

  shouldAlert(confidence: number): boolean {
    const level = (PreferencesStore.getString(PREF_KEYS.SENSITIVITY_LEVEL) ??
      'medium') as SensitivityLevel;
    return confidence >= ALERT_THRESHOLDS[level];
  }
}
