import { MMKV } from 'react-native-mmkv';

/**
 * Non-sensitive app preferences backed by MMKV.
 * Do NOT store secrets here — use SecureStore.
 */
const storage = new MMKV({ id: 'gc_preferences' });

export const PREF_KEYS = {
  ONBOARDING_COMPLETE: 'onboarding_complete',
  ONBOARDING_VERSION: 'onboarding_version',

  THEME: 'theme',
  FONT_SIZE_SCALE: 'font_size_scale',
  HIGH_CONTRAST: 'high_contrast',
  REDUCE_MOTION: 'reduce_motion',
  HAPTIC_ENABLED: 'haptic_enabled',

  DISTRESS_DETECTION_ENABLED: 'distress_detection_enabled',
  FALL_DETECTION_ENABLED: 'fall_detection_enabled',
  BLUETOOTH_MESH_ENABLED: 'bluetooth_mesh_enabled',
  VOICE_TRIGGER_ENABLED: 'voice_trigger_enabled',

  CANCEL_WINDOW_SECONDS: 'cancel_window_seconds',
  SENSITIVITY_LEVEL: 'sensitivity_level',
  SOS_BUTTON_TYPE: 'sos_button_type',

  APP_ICON_VARIANT: 'app_icon_variant',
  IS_DECOY_MODE_ENABLED: 'is_decoy_mode_enabled',

  LAST_ACTIVE_JOURNEY_ID: 'last_active_journey_id',
  ACTIVE_INCIDENT_ID: 'active_incident_id',

  USER_DISPLAY_NAME: 'user_display_name',

  RELAY_ENDPOINT: 'relay_endpoint',
} as const;

export type PrefKey = (typeof PREF_KEYS)[keyof typeof PREF_KEYS];

export const PreferencesStore = {
  getString(key: PrefKey): string | undefined {
    return storage.getString(key);
  },
  setString(key: PrefKey, value: string): void {
    storage.set(key, value);
  },
  getBoolean(key: PrefKey): boolean {
    return storage.getBoolean(key) ?? false;
  },
  setBoolean(key: PrefKey, value: boolean): void {
    storage.set(key, value);
  },
  getNumber(key: PrefKey): number | undefined {
    return storage.getNumber(key);
  },
  setNumber(key: PrefKey, value: number): void {
    storage.set(key, value);
  },
  delete(key: PrefKey): void {
    storage.delete(key);
  },
  clearAll(): void {
    storage.clearAll();
  },
};
