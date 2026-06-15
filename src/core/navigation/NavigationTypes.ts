import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';

// ─── Onboarding Stack ────────────────────────────────────────────────────────
export type OnboardingStackParams = {
  Welcome: undefined;
  Permissions: undefined;
  IdentitySetup: undefined;
  FirstGuardian: undefined;
  // QR scan screen reused during onboarding; prefill bypasses the picker step
  QRPair: { mode: 'show' | 'scan'; prefillName?: string; prefillPhone?: string };
};

// ─── Guardian Stack ──────────────────────────────────────────────────────────
export type GuardianStackParams = {
  GuardianList: undefined;
  GuardianDetail: { guardianId: string };
  AddGuardian: undefined;
  GuardianForm: {
    prefill?: { displayName: string; phoneNumber: string; source: 'phonebook' | 'manual' };
    guardianId?: string; // present when editing
  };
  QRPair: { mode: 'show' | 'scan'; prefillName?: string; prefillPhone?: string };
};

// ─── Journey Stack ───────────────────────────────────────────────────────────
export type JourneyStackParams = {
  JourneyDashboard: undefined;
  StartJourney: undefined;
  ActiveJourney: { journeyId: string };
  CheckIn: { checkinId?: string };
  RecurringCheckIn: undefined;
  Geofences: undefined;
  GeofenceDetail: { geofenceId?: string };
};

// ─── Main Tabs ───────────────────────────────────────────────────────────────
export type MainTabParams = {
  Home: undefined;
  Guardians: undefined;
  Journey: NavigatorScreenParams<JourneyStackParams> | undefined;
  Settings: undefined;
};

// ─── Settings Stack ──────────────────────────────────────────────────────────
export type SettingsStackParams = {
  SettingsHome: undefined;
  EmergencySettings: undefined;
  SafetySettings: undefined;       // DV features — labelled "Safety" not "DV"
  DistressSettings: undefined;
  AIAssistant: undefined;
  AISetup: undefined;
  PrivacySettings: undefined;
  AccessibilitySettings: undefined;
  DecoyMode: undefined;
  AppIconPicker: undefined;
  Logs: undefined;
  WipeData: undefined;
  About: undefined;
  EvidenceLog: undefined;
  SensitivityProfiles: undefined;
};

// ─── Screen props helpers ────────────────────────────────────────────────────
export type OnboardingScreenProps<T extends keyof OnboardingStackParams> =
  NativeStackScreenProps<OnboardingStackParams, T>;

export type GuardianScreenProps<T extends keyof GuardianStackParams> =
  NativeStackScreenProps<GuardianStackParams, T>;

export type JourneyScreenProps<T extends keyof JourneyStackParams> =
  NativeStackScreenProps<JourneyStackParams, T>;

export type SettingsScreenProps<T extends keyof SettingsStackParams> =
  NativeStackScreenProps<SettingsStackParams, T>;

export type MainTabScreenProps<T extends keyof MainTabParams> =
  BottomTabScreenProps<MainTabParams, T>;
