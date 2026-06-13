import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParams } from '@core/navigation/NavigationTypes';
import { AccessibleButton } from '@shared/components/AccessibleButton';
import { PermissionManager } from '@core/permissions/PermissionManager';
import { colors, spacing, typography, radius } from '@core/theme/tokens';

type Nav = NativeStackNavigationProp<OnboardingStackParams, 'Permissions'>;

const PERMISSIONS = [
  {
    key: 'sms' as const,
    icon: '💬',
    label: 'Send SMS',
    reason: 'Alert your guardians when you trigger an SOS',
    required: true,
  },
  {
    key: 'call' as const,
    icon: '📞',
    label: 'Make calls',
    reason: 'Call guardians at escalation level 2 if they don\'t respond',
    required: true,
  },
  {
    key: 'location' as const,
    icon: '📍',
    label: 'Location',
    reason: 'Share your location with guardians during an emergency',
    required: true,
  },
  {
    key: 'notifications' as const,
    icon: '🔔',
    label: 'Notifications',
    reason: 'Show alerts, check-in reminders and journey status',
    required: true,
  },
  {
    key: 'contacts' as const,
    icon: '👥',
    label: 'Contacts',
    reason: 'Add guardians from your phone contacts (optional)',
    required: false,
  },
  {
    key: 'camera' as const,
    icon: '📷',
    label: 'Camera',
    reason: 'Scan QR codes when pairing with other GuardianCircle users (optional)',
    required: false,
  },
  {
    key: 'backgroundLocation' as const,
    icon: '🗺️',
    label: 'Background location',
    reason: 'Monitor your journey when the app is in the background (optional)',
    required: false,
  },
  {
    key: 'microphone' as const,
    icon: '🎙️',
    label: 'Microphone',
    reason: 'Record audio evidence at your request only (optional)',
    required: false,
  },
  {
    key: 'bluetoothScan' as const,
    icon: '🔵',
    label: 'Bluetooth (scan)',
    reason: 'Detect nearby SOS beacons and relay them when you have signal (optional)',
    required: false,
  },
  {
    key: 'bluetoothAdvertise' as const,
    icon: '📡',
    label: 'Bluetooth (broadcast)',
    reason: 'Broadcast your own SOS via Bluetooth when there is no mobile signal (optional)',
    required: false,
  },
];

export default function PermissionsScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const [granting, setGranting] = useState(false);

  const handleGrant = async (): Promise<void> => {
    setGranting(true);
    try {
      // Request all permissions — Android shows OS dialog for each
      for (const perm of PERMISSIONS) {
        await PermissionManager.request(perm.key);
      }
    } finally {
      setGranting(false);
      navigation.navigate('IdentitySetup');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.emoji}>🔐</Text>
          <Text style={styles.title} accessibilityRole="header">A few permissions</Text>
          <Text style={styles.subtitle}>
            GuardianCircle needs these to keep you safe. You can change them any time in Settings.
          </Text>
        </View>

        {/* Disclaimer card — required by Play Store Personal Safety policy */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>About fall & crash detection</Text>
          <Text style={styles.disclaimerBody}>
            GuardianCircle can detect possible falls or vehicle crashes using your phone's sensors.
            These features assist but do not replace emergency services. A countdown screen
            lets you cancel any false alert before it's sent.
          </Text>
        </View>

        <View style={styles.permList}>
          {PERMISSIONS.map((p) => (
            <View key={p.key} style={styles.permRow}>
              <Text style={styles.permIcon}>{p.icon}</Text>
              <View style={styles.permText}>
                <View style={styles.permTitleRow}>
                  <Text style={styles.permLabel}>{p.label}</Text>
                  {p.required && <View style={styles.badge}><Text style={styles.badgeText}>Required</Text></View>}
                </View>
                <Text style={styles.permReason}>{p.reason}</Text>
              </View>
            </View>
          ))}
        </View>

        <AccessibleButton
          onPress={() => { void handleGrant(); }}
          accessibilityLabel="Allow permissions and continue"
          variant="primary"
          minHeight={56}
          style={styles.cta}
          disabled={granting}
        >
          {granting ? 'Requesting…' : 'Allow & Continue'}
        </AccessibleButton>

        {granting && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />}

        <Text style={styles.note}>
          Android will ask for each permission one at a time.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  scroll: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
  header: { alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 48 },
  title: { ...typography.headlineLarge, color: colors.light.onBackground, textAlign: 'center' },
  subtitle: { ...typography.bodyLarge, color: colors.light.onSurfaceVariant, textAlign: 'center' },
  disclaimer: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    gap: spacing.xs,
  },
  disclaimerTitle: { ...typography.titleSmall, color: colors.light.onBackground },
  disclaimerBody: { ...typography.bodySmall, color: colors.light.onSurfaceVariant, lineHeight: 18 },
  permList: { gap: spacing.sm },
  permRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.light.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  permIcon: { fontSize: 22, marginTop: 2 },
  permText: { flex: 1, gap: 4 },
  permTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  permLabel: { ...typography.titleSmall, color: colors.light.onBackground },
  permReason: { ...typography.bodySmall, color: colors.light.onSurfaceVariant },
  badge: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { ...typography.labelMedium, color: colors.primary, fontSize: 10 },
  cta: { width: '100%' },
  note: { ...typography.bodySmall, color: colors.light.onSurfaceVariant, textAlign: 'center' },
});
