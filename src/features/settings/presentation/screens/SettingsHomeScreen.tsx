import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import type { SettingsStackParams } from '@core/navigation/NavigationTypes';

type Nav = NativeStackNavigationProp<SettingsStackParams>;

/**
 * SettingsHomeScreen — app settings grouped by category.
 *
 * Phase 3 adds: duress PIN setup, decoy mode toggle, app icon disguise,
 * AI provider configuration, and export/wipe flows.
 */
export default function SettingsHomeScreen(): React.JSX.Element {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation<Nav>();

  const [distressEnabled, setDistressEnabled] = React.useState(
    () => PreferencesStore.getBoolean(PREF_KEYS.DISTRESS_DETECTION_ENABLED) ?? false,
  );

  const toggleDistress = (value: boolean): void => {
    setDistressEnabled(value);
    PreferencesStore.setBoolean(PREF_KEYS.DISTRESS_DETECTION_ENABLED, value);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Safety */}
        <Text style={styles.sectionLabel}>SAFETY</Text>
        <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>
          <SettingRow
            label="Distress Detection"
            description="Detect distress from motion patterns"
            right={
              <Switch
                value={distressEnabled}
                onValueChange={toggleDistress}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                accessibilityLabel="Distress detection toggle"
                accessibilityRole="switch"
              />
            }
          />
          <Divider />
          <SettingRow
            label="Detection Profile"
            description="Gym, Driving, Sleep — tune fall & distress sensitivity"
            right={<ChevronRight color={theme.colors.onSurfaceVariant} />}
            onPress={() => navigation.navigate('SensitivityProfiles')}
          />
          <Divider />
          <SettingRow
            label="Duress PIN"
            description="A fake PIN that silently triggers SOS"
            right={<ChevronRight color={theme.colors.onSurfaceVariant} />}
            onPress={() => navigation.navigate('SafetySettings')}
          />
          <Divider />
          <SettingRow
            label="Decoy Mode"
            description="Show a fake guardian list when under duress"
            right={<ChevronRight color={theme.colors.onSurfaceVariant} />}
            onPress={() => navigation.navigate('DecoyMode')}
          />
          <Divider />
          <SettingRow
            label="App Icon"
            description="Disguise the app icon on your home screen"
            right={<ChevronRight color={theme.colors.onSurfaceVariant} />}
            onPress={() => navigation.navigate('AppIconPicker')}
          />
        </View>

        {/* AI Assistant */}
        <Text style={styles.sectionLabel}>AI ASSISTANT</Text>
        <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>
          <SettingRow
            label="AI Provider"
            description="Configure your own API key (BYOK)"
            right={<ChevronRight color={theme.colors.onSurfaceVariant} />}
            onPress={() => navigation.navigate('AIAssistant')}
          />
        </View>

        {/* Privacy */}
        <Text style={styles.sectionLabel}>PRIVACY & DATA</Text>
        <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>
          <SettingRow
            label="Evidence Log"
            description="View, add notes, and export on-device evidence"
            right={<ChevronRight color={theme.colors.onSurfaceVariant} />}
            onPress={() => navigation.navigate('EvidenceLog')}
          />
          <Divider />
          <SettingRow
            label="Wipe All Data"
            description="Permanently delete all GuardianCircle data"
            right={<ChevronRight color={theme.colors.danger} />}
            onPress={() => navigation.navigate('WipeData')}
            labelColor={theme.colors.danger}
          />
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>
          <SettingRow label="Version" right={<Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}>1.0.0</Text>} />
          <Divider />
          <SettingRow
            label="Privacy Policy"
            right={<ChevronRight color={theme.colors.onSurfaceVariant} />}
            onPress={() => Alert.alert(
              'Privacy Policy',
              'GuardianCircle collects no data and has no backend servers.\n\n' +
              '• All contacts and settings are stored only on your device.\n' +
              '• AI keys you provide are stored in Android Keystore and never transmitted.\n' +
              '• SOS alerts are sent directly from your device via SMS and (optionally) your own relay server.\n' +
              '• No analytics, crash reporting, or tracking SDKs are included.',
              [{ text: 'Close', style: 'cancel' }],
            )}
          />
          <Divider />
          <SettingRow
            label="View Logs"
            description="Local debug logs (not sent anywhere)"
            right={<ChevronRight color={theme.colors.onSurfaceVariant} />}
            onPress={() => navigation.navigate('Logs')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  labelColor?: string;
}

function SettingRow({
  label,
  description,
  right,
  onPress,
  labelColor,
}: SettingRowProps): React.JSX.Element {
  const theme = useTheme();
  const inner = (
    <View style={rowStyles.row}>
      <View style={rowStyles.labelGroup}>
        <Text style={[rowStyles.label, { color: labelColor ?? theme.colors.onSurface }]}>
          {label}
        </Text>
        {description !== null && description !== undefined && (
          <Text style={[rowStyles.description, { color: theme.colors.onSurfaceVariant }]}>
            {description}
          </Text>
        )}
      </View>
      <View style={rowStyles.right}>{right}</View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

function Divider(): React.JSX.Element {
  const theme = useTheme();
  return <View style={[rowStyles.divider, { backgroundColor: theme.colors.divider }]} />;
}

function ChevronRight({ color }: { color: string }): React.JSX.Element {
  return <Text style={{ color, fontSize: 18, fontWeight: '300' }}>›</Text>;
}

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onBackground,
    },
    content: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    sectionLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      paddingHorizontal: theme.spacing.sm,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xs,
      letterSpacing: 0.8,
    },
    group: {
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
  });
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  labelGroup: { flex: 1 },
  label: { fontSize: 15, fontWeight: '500' },
  description: { fontSize: 12, marginTop: 2 },
  right: { marginLeft: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
});
