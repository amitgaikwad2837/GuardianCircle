import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';

export type SensitivityProfile = 'normal' | 'gym' | 'driving' | 'sleep';

export interface ProfileThresholds {
  /** Fall detection: freefall magnitude threshold (g) — lower = more sensitive */
  freefallGThreshold: number;
  /** Fall detection: impact magnitude threshold (g) — lower = more sensitive */
  impactGThreshold: number;
  /** Fall detection: minimum confidence to report a fall */
  fallConfidenceThreshold: number;
  /** Distress detection: minimum confidence to alert */
  distressConfidenceThreshold: number;
  /** Crash detection: minimum confidence */
  crashConfidenceThreshold: number;
}

const PROFILES: Record<SensitivityProfile, ProfileThresholds> = {
  normal: {
    freefallGThreshold:          0.50,
    impactGThreshold:            2.50,
    fallConfidenceThreshold:     0.65,
    distressConfidenceThreshold: 0.70,
    crashConfidenceThreshold:    0.70,
  },
  gym: {
    // Reduced fall sensitivity — jumping, lifting causes impacts
    freefallGThreshold:          0.35,
    impactGThreshold:            3.50,
    fallConfidenceThreshold:     0.85,
    distressConfidenceThreshold: 0.80,
    crashConfidenceThreshold:    0.80,
  },
  driving: {
    // Reduced fall sensitivity (seated), higher crash sensitivity
    freefallGThreshold:          0.35,
    impactGThreshold:            3.00,
    fallConfidenceThreshold:     0.85,
    distressConfidenceThreshold: 0.80,
    crashConfidenceThreshold:    0.55,
  },
  sleep: {
    // More sensitive — any movement after initial stillness warrants attention
    freefallGThreshold:          0.60,
    impactGThreshold:            2.00,
    fallConfidenceThreshold:     0.55,
    distressConfidenceThreshold: 0.60,
    crashConfidenceThreshold:    0.70,
  },
};

export const PROFILE_META: Record<SensitivityProfile, { label: string; description: string; icon: string }> = {
  normal:  { label: 'Normal',   icon: '🚶', description: 'Balanced sensitivity for everyday use.' },
  gym:     { label: 'Gym',      icon: '🏋️', description: 'Reduced false alerts during workouts, weights, and high-impact exercise.' },
  driving: { label: 'Driving',  icon: '🚗', description: 'Lower fall sensitivity (you are seated); higher vehicle crash sensitivity.' },
  sleep:   { label: 'Sleep',    icon: '🛌', description: 'More sensitive fall detection while you are stationary or resting.' },
};

export const SensitivityConfig = {
  getProfile(): SensitivityProfile {
    const saved = PreferencesStore.getString(PREF_KEYS.SENSITIVITY_LEVEL) as SensitivityProfile | undefined;
    return saved ?? 'normal';
  },

  setProfile(profile: SensitivityProfile): void {
    PreferencesStore.setString(PREF_KEYS.SENSITIVITY_LEVEL, profile);
  },

  getThresholds(profile?: SensitivityProfile): ProfileThresholds {
    return PROFILES[profile ?? SensitivityConfig.getProfile()];
  },
};
