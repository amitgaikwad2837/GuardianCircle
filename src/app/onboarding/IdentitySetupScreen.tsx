import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParams } from '@core/navigation/NavigationTypes';
import { AccessibleButton } from '@shared/components/AccessibleButton';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { colors, spacing, typography, radius } from '@core/theme/tokens';

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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.emoji}>👤</Text>
          <Text style={styles.title} accessibilityRole="header">What's your name?</Text>
          <Text style={styles.subtitle}>
            Your guardians will see this name in emergency alerts.
            It's stored only on your device — GuardianCircle never sees it.
          </Text>
        </View>

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
          accessibilityHint="This name will appear in alerts sent to your guardians"
        />

        <View style={styles.actions}>
          <AccessibleButton
            onPress={handleContinue}
            accessibilityLabel="Continue"
            variant="primary"
            minHeight={56}
            style={styles.cta}
          >
            Continue
          </AccessibleButton>

          <AccessibleButton
            onPress={() => navigation.navigate('FirstGuardian')}
            accessibilityLabel="Skip — add name later"
            variant="ghost"
            minHeight={48}
            style={styles.cta}
          >
            Skip for now
          </AccessibleButton>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  scroll: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
  header: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  emoji: { fontSize: 48 },
  title: { ...typography.headlineLarge, color: colors.light.onBackground, textAlign: 'center' },
  subtitle: { ...typography.bodyLarge, color: colors.light.onSurfaceVariant, textAlign: 'center' },
  input: {
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.bodyLarge,
    color: colors.light.onBackground,
    backgroundColor: colors.light.surface,
  },
  actions: { gap: spacing.sm },
  cta: { width: '100%' },
});
