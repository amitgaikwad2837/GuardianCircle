import React, { Suspense, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle } from 'react-native-svg';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { EventBus } from '@core/events/EventBus';
import { colors } from '@core/theme/tokens';

import type {
  OnboardingStackParams,
  MainTabParams,
  GuardianStackParams,
  JourneyStackParams,
  SettingsStackParams,
} from './NavigationTypes';

// ── Lazy imports — onboarding ────────────────────────────────────────────────
const WelcomeScreen           = React.lazy(() => import('@app/onboarding/WelcomeScreen'));
const PermissionsScreen       = React.lazy(() => import('@app/onboarding/PermissionsScreen'));
const IdentitySetupScreen     = React.lazy(() => import('@app/onboarding/IdentitySetupScreen'));
const FirstGuardianScreen     = React.lazy(() => import('@app/onboarding/FirstGuardianScreen'));

// ── Lazy imports — home ──────────────────────────────────────────────────────
const HomeScreen              = React.lazy(() => import('@features/sos/presentation/screens/HomeScreen'));

// ── Lazy imports — guardians ─────────────────────────────────────────────────
const GuardianListScreen      = React.lazy(() => import('@features/guardian/presentation/screens/GuardianListScreen'));
const AddGuardianScreen       = React.lazy(() => import('@features/guardian/presentation/screens/AddGuardianScreen'));
const GuardianFormScreen      = React.lazy(() => import('@features/guardian/presentation/screens/GuardianFormScreen'));
const GuardianDetailScreen    = React.lazy(() => import('@features/guardian/presentation/screens/GuardianDetailScreen'));
const QRPairScreen            = React.lazy(() => import('@features/guardian/presentation/screens/QRPairScreen'));

// ── Lazy imports — journey ───────────────────────────────────────────────────
const JourneyDashboardScreen  = React.lazy(() => import('@features/journey/presentation/screens/JourneyDashboardScreen'));
const StartJourneyScreen      = React.lazy(() => import('@features/journey/presentation/screens/StartJourneyScreen'));
const ActiveJourneyScreen     = React.lazy(() => import('@features/journey/presentation/screens/ActiveJourneyScreen'));
const CheckInScreen           = React.lazy(() => import('@features/checkin/presentation/screens/CheckInScreen'));
const RecurringCheckInScreen  = React.lazy(() => import('@features/checkin/presentation/screens/RecurringCheckInScreen'));
const GeofenceListScreen      = React.lazy(() => import('@features/geofence/presentation/screens/GeofenceListScreen'));
const GeofenceDetailScreen    = React.lazy(() => import('@features/geofence/presentation/screens/GeofenceDetailScreen'));

// ── Lazy imports — settings ──────────────────────────────────────────────────
const SettingsHomeScreen      = React.lazy(() => import('@features/settings/presentation/screens/SettingsHomeScreen'));
const DuressPinSetupScreen    = React.lazy(() => import('@features/settings/presentation/screens/DuressPinSetupScreen'));
const DecoyModeScreen         = React.lazy(() => import('@features/settings/presentation/screens/DecoyModeScreen'));
const LogsScreen              = React.lazy(() => import('@features/settings/presentation/screens/LogsScreen'));
const WipeDataScreen          = React.lazy(() => import('@features/settings/presentation/screens/WipeDataScreen'));
const AIAssistantScreen       = React.lazy(() => import('@features/ai-assistant/presentation/screens/AIAssistantScreen'));
const AISetupScreen           = React.lazy(() => import('@features/ai-assistant/presentation/screens/AISetupScreen'));
const AppIconPickerScreen        = React.lazy(() => import('@features/settings/presentation/screens/AppIconPickerScreen'));
const EvidenceLogScreen          = React.lazy(() => import('@features/evidence/presentation/screens/EvidenceLogScreen'));
const SensitivityProfilesScreen  = React.lazy(() => import('@features/settings/presentation/screens/SensitivityProfilesScreen'));

// ── Navigators ───────────────────────────────────────────────────────────────
const OnboardingStack  = createNativeStackNavigator<OnboardingStackParams>();
const MainTab          = createBottomTabNavigator<MainTabParams>();
const GuardianStack    = createNativeStackNavigator<GuardianStackParams>();
const JourneyStack     = createNativeStackNavigator<JourneyStackParams>();
const SettingsStack    = createNativeStackNavigator<SettingsStackParams>();

// ── Tab icons (SVG, tint-aware) ──────────────────────────────────────────────
function IconHome({ color, size }: { color: string; size: number }): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 21V12h6v9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconGuardians({ color, size }: { color: string; size: number }): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="3" stroke={color} strokeWidth={1.8} />
      <Path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="18" cy="8" r="2.5" stroke={color} strokeWidth={1.6} />
      <Path d="M14.5 20c0-2.485 1.567-4.5 3.5-4.5S21.5 17.515 21.5 20" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function IconJourney({ color, size }: { color: string; size: number }): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx="12" cy="8" r="2" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

function IconSettings({ color, size }: { color: string; size: number }): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

const Spinner = (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator size="small" color={colors.sosRed} />
  </View>
);

/**
 * Wraps a lazy screen so it renders inside a Suspense boundary.
 * MUST be called at module level — calling inside a render function creates a new
 * component type on every render, causing React Navigation to unmount/remount the screen.
 */
function wrapLazy(Screen: React.LazyExoticComponent<() => React.JSX.Element>): React.ComponentType {
  return function LazyScreen() {
    return <Suspense fallback={Spinner}><Screen /></Suspense>;
  };
}

// ── Wrapped screen components — created once at module level ─────────────────
// Onboarding
const Welcome        = wrapLazy(WelcomeScreen);
const Permissions    = wrapLazy(PermissionsScreen);
const IdentitySetup  = wrapLazy(IdentitySetupScreen);
const FirstGuardian  = wrapLazy(FirstGuardianScreen);

// Home
const Home           = wrapLazy(HomeScreen);

// Guardians
const GuardianList   = wrapLazy(GuardianListScreen);
const AddGuardian    = wrapLazy(AddGuardianScreen);
const GuardianForm   = wrapLazy(GuardianFormScreen);
const GuardianDetail = wrapLazy(GuardianDetailScreen);
const QRPair         = wrapLazy(QRPairScreen);

// Journey
const JourneyDashboard = wrapLazy(JourneyDashboardScreen);
const StartJourney     = wrapLazy(StartJourneyScreen);
const ActiveJourney    = wrapLazy(ActiveJourneyScreen);
const CheckIn          = wrapLazy(CheckInScreen);
const RecurringCheckIn = wrapLazy(RecurringCheckInScreen);
const Geofences        = wrapLazy(GeofenceListScreen);
const GeofenceDetail   = wrapLazy(GeofenceDetailScreen);

// Settings
const SettingsHome   = wrapLazy(SettingsHomeScreen);
const DurессPinSetup = wrapLazy(DuressPinSetupScreen);
const DecoyMode      = wrapLazy(DecoyModeScreen);
const AppIconPicker  = wrapLazy(AppIconPickerScreen);
const Logs           = wrapLazy(LogsScreen);
const WipeData       = wrapLazy(WipeDataScreen);
const AIAssistant          = wrapLazy(AIAssistantScreen);
const AISetup              = wrapLazy(AISetupScreen);
const EvidenceLog          = wrapLazy(EvidenceLogScreen);
const SensitivityProfiles  = wrapLazy(SensitivityProfilesScreen);

// ── Onboarding ───────────────────────────────────────────────────────────────
function OnboardingNavigator(): React.JSX.Element {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Welcome"        component={Welcome} />
      <OnboardingStack.Screen name="Permissions"    component={Permissions} />
      <OnboardingStack.Screen name="IdentitySetup"  component={IdentitySetup} />
      <OnboardingStack.Screen name="FirstGuardian"  component={FirstGuardian} />
      <OnboardingStack.Screen name="QRPair"         component={QRPair} />
    </OnboardingStack.Navigator>
  );
}

// ── Guardian Stack ────────────────────────────────────────────────────────────
function GuardianNavigator(): React.JSX.Element {
  return (
    <GuardianStack.Navigator screenOptions={{ headerShown: false }}>
      <GuardianStack.Screen name="GuardianList"   component={GuardianList} />
      <GuardianStack.Screen name="AddGuardian"    component={AddGuardian} />
      <GuardianStack.Screen name="GuardianForm"   component={GuardianForm} />
      <GuardianStack.Screen name="GuardianDetail" component={GuardianDetail} />
      <GuardianStack.Screen name="QRPair"         component={QRPair} />
    </GuardianStack.Navigator>
  );
}

// ── Journey Stack ─────────────────────────────────────────────────────────────
function JourneyNavigator(): React.JSX.Element {
  return (
    <JourneyStack.Navigator screenOptions={{ headerShown: false }}>
      <JourneyStack.Screen name="JourneyDashboard" component={JourneyDashboard} />
      <JourneyStack.Screen name="StartJourney"     component={StartJourney} />
      <JourneyStack.Screen name="ActiveJourney"    component={ActiveJourney} />
      <JourneyStack.Screen name="CheckIn"          component={CheckIn} />
      <JourneyStack.Screen name="RecurringCheckIn" component={RecurringCheckIn} />
      <JourneyStack.Screen name="Geofences"        component={Geofences} />
      <JourneyStack.Screen name="GeofenceDetail"   component={GeofenceDetail} />
    </JourneyStack.Navigator>
  );
}

// ── Settings Stack ────────────────────────────────────────────────────────────
function SettingsNavigator(): React.JSX.Element {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsHome"   component={SettingsHome} />
      <SettingsStack.Screen name="SafetySettings" component={DurессPinSetup} />
      <SettingsStack.Screen name="DecoyMode"      component={DecoyMode} />
      <SettingsStack.Screen name="AppIconPicker"  component={AppIconPicker} />
      <SettingsStack.Screen name="Logs"           component={Logs} />
      <SettingsStack.Screen name="WipeData"       component={WipeData} />
      <SettingsStack.Screen name="AIAssistant"         component={AIAssistant} />
      <SettingsStack.Screen name="AISetup"             component={AISetup} />
      <SettingsStack.Screen name="EvidenceLog"         component={EvidenceLog} />
      <SettingsStack.Screen name="SensitivityProfiles" component={SensitivityProfiles} />
    </SettingsStack.Navigator>
  );
}

// ── Main bottom tabs ──────────────────────────────────────────────────────────
function MainNavigator(): React.JSX.Element {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          elevation: 4,
          height: 60,
          paddingBottom: 8,
        },
      }}
    >
      <MainTab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home — SOS button and status',
          tabBarIcon: ({ color, size }) => <IconHome color={color} size={size} />,
        }}
      />
      <MainTab.Screen
        name="Guardians"
        component={GuardianNavigator}
        options={{
          tabBarLabel: 'Guardians',
          tabBarAccessibilityLabel: 'Guardians — manage your trusted contacts',
          tabBarIcon: ({ color, size }) => <IconGuardians color={color} size={size} />,
        }}
      />
      <MainTab.Screen
        name="Journey"
        component={JourneyNavigator}
        options={{
          tabBarLabel: 'Journey',
          tabBarAccessibilityLabel: 'Journey — start a monitored trip',
          tabBarIcon: ({ color, size }) => <IconJourney color={color} size={size} />,
        }}
      />
      <MainTab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          tabBarLabel: 'Settings',
          tabBarAccessibilityLabel: 'Settings — app preferences and security',
          tabBarIcon: ({ color, size }) => <IconSettings color={color} size={size} />,
        }}
      />
    </MainTab.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export function AppNavigator(): React.JSX.Element {
  const [onboardingDone, setOnboardingDone] = useState(
    () => PreferencesStore.getBoolean(PREF_KEYS.ONBOARDING_COMPLETE) ?? false,
  );

  useEffect(() => {
    return EventBus.on('onboarding:complete', () => setOnboardingDone(true));
  }, []);

  return onboardingDone ? <MainNavigator /> : <OnboardingNavigator />;
}
