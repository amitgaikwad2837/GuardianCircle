import React, { Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
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
const AppIconPickerScreen     = React.lazy(() => import('@features/settings/presentation/screens/AppIconPickerScreen'));

// ── Navigators ───────────────────────────────────────────────────────────────
const OnboardingStack  = createNativeStackNavigator<OnboardingStackParams>();
const MainTab          = createBottomTabNavigator<MainTabParams>();
const GuardianStack    = createNativeStackNavigator<GuardianStackParams>();
const JourneyStack     = createNativeStackNavigator<JourneyStackParams>();
const SettingsStack    = createNativeStackNavigator<SettingsStackParams>();

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
const AIAssistant    = wrapLazy(AIAssistantScreen);
const AISetup        = wrapLazy(AISetupScreen);

// ── Onboarding ───────────────────────────────────────────────────────────────
function OnboardingNavigator(): React.JSX.Element {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Welcome"        component={Welcome} />
      <OnboardingStack.Screen name="Permissions"    component={Permissions} />
      <OnboardingStack.Screen name="IdentitySetup"  component={IdentitySetup} />
      <OnboardingStack.Screen name="FirstGuardian"  component={FirstGuardian} />
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
      <SettingsStack.Screen name="AIAssistant"    component={AIAssistant} />
      <SettingsStack.Screen name="AISetup"        component={AISetup} />
    </SettingsStack.Navigator>
  );
}

// ── Main bottom tabs ──────────────────────────────────────────────────────────
function MainNavigator(): React.JSX.Element {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.sosRed,
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          elevation: 0,
        },
      }}
    >
      <MainTab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home — SOS button and status',
        }}
      />
      <MainTab.Screen
        name="Guardians"
        component={GuardianNavigator}
        options={{
          tabBarLabel: 'Guardians',
          tabBarAccessibilityLabel: 'Guardians — manage your trusted contacts',
        }}
      />
      <MainTab.Screen
        name="Journey"
        component={JourneyNavigator}
        options={{
          tabBarLabel: 'Journey',
          tabBarAccessibilityLabel: 'Journey — start a monitored trip',
        }}
      />
      <MainTab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          tabBarLabel: 'Settings',
          tabBarAccessibilityLabel: 'Settings — app preferences and security',
        }}
      />
    </MainTab.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export function AppNavigator(): React.JSX.Element {
  const onboardingComplete = PreferencesStore.getBoolean(PREF_KEYS.ONBOARDING_COMPLETE);
  return onboardingComplete ? <MainNavigator /> : <OnboardingNavigator />;
}
