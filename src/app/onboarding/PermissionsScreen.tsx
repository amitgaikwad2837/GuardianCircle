import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParams } from '@core/navigation/NavigationTypes';
import { AccessibleButton } from '@shared/components/AccessibleButton';
import { PermissionManager } from '@core/permissions/PermissionManager';
import { colors, spacing, typography } from '@core/theme/tokens';

type Nav = NativeStackNavigationProp<OnboardingStackParams, 'Permissions'>;

const REQUIRED_PERMISSIONS = [
  { key: 'sms' as const, label: 'SMS', reason: 'To send emergency alerts to your guardians' },
  { key: 'call' as const, label: 'Phone calls', reason: 'To call guardians if they don\'t respond' },
  { key: 'location' as const, label: 'Location', reason: 'To share your location during an emergency' },
];

const OPTIONAL_PERMISSIONS = [
  { key: 'backgroundLocation' as const, label: 'Background location', reason: 'For journey monitoring when app is in background' },
  { key: 'contacts' as const, label: 'Contacts', reason: 'To add guardians from your phone contacts' },
  { key: 'microphone' as const, label: 'Microphone', reason: 'To record audio evidence (you control when this happens)' },
  { key: 'camera' as const, label: 'Camera', reason: 'To scan QR codes when pairing with guardians' },
];

export default function PermissionsScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const [optionalEnabled, setOptionalEnabled] = useState<Record<string, boolean>>({
    backgroundLocation: false,
    contacts: true,
    microphone: false,
    camera: true,
  });

  const handleGrant = async (): Promise<void> => {
    // Required
    for (const perm of REQUIRED_PERMISSIONS) {
      await PermissionManager.request(perm.key);
    }
    // Optional — only request if enabled
    for (const perm of OPTIONAL_PERMISSIONS) {
      if (optionalEnabled[perm.key]) {
        await PermissionManager.request(perm.key);
      }
    }
    navigation.navigate('IdentitySetup');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          Permissions
        </Text>
        <Text style={styles.subtitle}>
          GuardianCircle needs these to protect you. You can change them any time in Settings.
        </Text>

        <Text style={styles.sectionLabel}>Required</Text>
        {REQUIRED_PERMISSIONS.map((p) => (
          <View key={p.key} style={styles.permRow} accessibilityRole="text">
            <View style={styles.permText}>
              <Text style={styles.permLabel}>{p.label}</Text>
              <Text style={styles.permReason}>{p.reason}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionLabel}>Optional</Text>
        {OPTIONAL_PERMISSIONS.map((p) => (
          <View key={p.key} style={styles.permRow}>
            <View style={styles.permText}>
              <Text style={styles.permLabel}>{p.label}</Text>
              <Text style={styles.permReason}>{p.reason}</Text>
            </View>
            <Switch
              value={optionalEnabled[p.key] ?? false}
              onValueChange={(v) => setOptionalEnabled((s) => ({ ...s, [p.key]: v }))}
              accessibilityLabel={`Enable ${p.label} permission`}
              trackColor={{ true: colors.sosRed }}
            />
          </View>
        ))}

        <AccessibleButton
          onPress={() => { void handleGrant(); }}
          accessibilityLabel="Grant Permissions and Continue"
          variant="danger"
          minHeight={56}
          style={styles.cta}
        >
          Grant Permissions
        </AccessibleButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  container: { padding: spacing.xl, gap: spacing.sm },
  title: { ...typography.headlineLarge, color: colors.light.onBackground },
  subtitle: { ...typography.bodyLarge, color: colors.light.onSurfaceVariant, marginBottom: spacing.md },
  sectionLabel: { ...typography.labelLarge, color: colors.light.onSurfaceVariant, marginTop: spacing.lg, textTransform: 'uppercase', letterSpacing: 1 },
  permRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.light.divider },
  permText: { flex: 1, gap: 2 },
  permLabel: { ...typography.titleMedium, color: colors.light.onBackground },
  permReason: { ...typography.bodyMedium, color: colors.light.onSurfaceVariant },
  cta: { marginTop: spacing.xl, width: '100%' },
});
