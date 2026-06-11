import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParams } from '@core/navigation/NavigationTypes';
import { AccessibleButton } from '@shared/components/AccessibleButton';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { colors, spacing, typography } from '@core/theme/tokens';

type Nav = NativeStackNavigationProp<OnboardingStackParams, 'FirstGuardian'>;

export default function FirstGuardianScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();

  const completeOnboarding = (): void => {
    PreferencesStore.setBoolean(PREF_KEYS.ONBOARDING_COMPLETE, true);
    // AppNavigator will re-render and show MainNavigator
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          Add your first guardian
        </Text>
        <Text style={styles.subtitle}>
          A guardian is someone you trust to respond if you're in danger.
          They receive a message when you trigger an alert.
        </Text>

        <View style={styles.methods}>
          <AccessibleButton
            onPress={() => { /* navigate to guardian form with phonebook flow */ }}
            accessibilityLabel="Choose from contacts"
            accessibilityHint="Select a person from your phone contacts as a guardian"
            variant="primary"
            minHeight={56}
            style={styles.method}
          >
            👥  Choose from contacts
          </AccessibleButton>

          <AccessibleButton
            onPress={() => { /* navigate to guardian form with manual flow */ }}
            accessibilityLabel="Enter a phone number manually"
            variant="primary"
            minHeight={56}
            style={styles.method}
          >
            ✏️  Enter a phone number
          </AccessibleButton>

          <AccessibleButton
            onPress={() => { /* navigate to QR scanner */ }}
            accessibilityLabel="Scan their QR code"
            variant="ghost"
            minHeight={48}
            style={styles.method}
          >
            📷  Scan their QR code
          </AccessibleButton>
        </View>

        <AccessibleButton
          onPress={completeOnboarding}
          accessibilityLabel="Skip — add a guardian later"
          accessibilityHint="Warning: without a guardian, SOS alerts will only be logged locally"
          variant="ghost"
          minHeight={48}
          style={styles.skip}
        >
          I'll add a guardian later
        </AccessibleButton>

        <Text style={styles.skipWarning}>
          Without a guardian, SOS alerts will only be saved on your device.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  container: { flex: 1, padding: spacing.xl, gap: spacing.md },
  title: { ...typography.headlineLarge, color: colors.light.onBackground },
  subtitle: { ...typography.bodyLarge, color: colors.light.onSurfaceVariant },
  methods: { gap: spacing.md, marginTop: spacing.lg },
  method: { width: '100%' },
  skip: { marginTop: 'auto' },
  skipWarning: { ...typography.bodyMedium, color: colors.warning, textAlign: 'center' },
});
