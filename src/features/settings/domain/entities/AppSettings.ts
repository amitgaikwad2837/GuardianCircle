export type Theme = 'light' | 'dark' | 'system';
export type FontSizeScale = 1.0 | 1.2 | 1.5 | 2.0;
export type SensitivityLevel = 'low' | 'medium' | 'high';
export type SOSButtonType = 'long_press' | 'tap' | 'both';
export type AppIconVariant = 'default' | 'weather' | 'calculator' | 'notes' | 'clock';

export interface AppSettings {
  // UI
  theme: Theme;
  fontSizeScale: FontSizeScale;
  isHighContrast: boolean;
  isReduceMotion: boolean;
  isHapticEnabled: boolean;

  // Emergency
  cancelWindowSeconds: number;      // 5–30
  sosButtonType: SOSButtonType;
  escalationDelayMinutes: number;   // minutes between escalation levels

  // Detection
  isDistressDetectionEnabled: boolean;
  isFallDetectionEnabled: boolean;
  isVehicleCrashDetectionEnabled: boolean;
  sensitivityLevel: SensitivityLevel;

  // Privacy / Safety
  isDuressPinEnabled: boolean;
  isDecoyModeEnabled: boolean;
  isDelayedRemovalEnabled: boolean;
  appIconVariant: AppIconVariant;

  // Bluetooth
  isBluetoothMeshEnabled: boolean;

  // Voice Trigger (P1)
  isVoiceTriggerEnabled: boolean;
}
