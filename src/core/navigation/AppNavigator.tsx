import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';

import type {
  OnboardingStackParams,
  MainTabParams,
} from './NavigationTypes';

// Screens — lazy imported for bundle splitting
const WelcomeScreen = React.lazy(() => import('@app/onboarding/WelcomeScreen'));
const PermissionsScreen = React.lazy(() => import('@app/onboarding/PermissionsScreen'));
const IdentitySetupScreen = React.lazy(() => import('@app/onboarding/IdentitySetupScreen'));
const FirstGuardianScreen = React.lazy(() => import('@app/onboarding/FirstGuardianScreen'));

const HomeScreen = React.lazy(() => import('@features/sos/presentation/screens/HomeScreen'));
const GuardianListScreen = React.lazy(() => import('@features/guardian/presentation/screens/GuardianListScreen'));
const JourneyDashboardScreen = React.lazy(() => import('@features/journey/presentation/screens/JourneyDashboardScreen'));
const SettingsHomeScreen = React.lazy(() => import('@features/settings/presentation/screens/SettingsHomeScreen'));

const OnboardingStack = createNativeStackNavigator<OnboardingStackParams>();
const MainTab = createBottomTabNavigator<MainTabParams>();

function OnboardingNavigator(): React.JSX.Element {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen as React.ComponentType} />
      <OnboardingStack.Screen name="Permissions" component={PermissionsScreen as React.ComponentType} />
      <OnboardingStack.Screen name="IdentitySetup" component={IdentitySetupScreen as React.ComponentType} />
      <OnboardingStack.Screen name="FirstGuardian" component={FirstGuardianScreen as React.ComponentType} />
    </OnboardingStack.Navigator>
  );
}

function MainNavigator(): React.JSX.Element {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#D32F2F',
      }}
    >
      <MainTab.Screen name="Home" component={HomeScreen as React.ComponentType} />
      <MainTab.Screen name="Guardians" component={GuardianListScreen as React.ComponentType} />
      <MainTab.Screen name="Journey" component={JourneyDashboardScreen as React.ComponentType} />
      <MainTab.Screen name="Settings" component={SettingsHomeScreen as React.ComponentType} />
    </MainTab.Navigator>
  );
}

export function AppNavigator(): React.JSX.Element {
  const onboardingComplete = PreferencesStore.getBoolean(PREF_KEYS.ONBOARDING_COMPLETE);
  return onboardingComplete ? <MainNavigator /> : <OnboardingNavigator />;
}
