import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParams } from '@core/navigation/NavigationTypes';
import { AccessibleButton } from '@shared/components/AccessibleButton';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { colors, spacing, typography } from '@core/theme/tokens';

type Nav = NativeStackNavigationProp<OnboardingStackParams, 'IdentitySetup'>;

export default function IdentitySetupScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState('');

  const handleContinue = (): void => {
    if (name.trim()) {
      PreferencesStore.setString(PREF_KEYS.USER_DISPLAY_NAME, name.trim());
    }
    navigation.navigate('FirstGuardian');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          What should your guardians call you?
        </Text>
        <Text style={styles.subtitle}>
          This is stored only on your device. GuardianCircle never sees your name.
        </Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Priya"
          placeholderTextColor={colors.light.onSurfaceVariant}
          maxLength={50}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          accessibilityLabel="Your name"
          accessibilityHint="This name will appear in emergency alerts sent to your guardians"
        />

        <Text style={styles.note}>
          You can change this any time in Settings.
        </Text>

        <View style={styles.actions}>
          <AccessibleButton
            onPress={handleContinue}
            accessibilityLabel="Continue"
            variant="danger"
            minHeight={56}
            style={styles.cta}
          >
            <Text>Continue</Text>
          </AccessibleButton>

          <AccessibleButton
            onPress={() => navigation.navigate('FirstGuardian')}
            accessibilityLabel="Skip — add name later"
            variant="ghost"
            minHeight={48}
          >
            <Text>Skip for now</Text>
          </AccessibleButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  container: { padding: spacing.xl, gap: spacing.md },
  title: { ...typography.headlineLarge, color: colors.light.onBackground },
  subtitle: { ...typography.bodyLarge, color: colors.light.onSurfaceVariant },
  input: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    padding: spacing.md,
    ...typography.bodyLarge,
    color: colors.light.onBackground,
    backgroundColor: colors.light.surface,
    marginTop: spacing.md,
  },
  note: { ...typography.bodyMedium, color: colors.light.onSurfaceVariant },
  actions: { gap: spacing.md, marginTop: spacing.xl },
  cta: { width: '100%' },
});
