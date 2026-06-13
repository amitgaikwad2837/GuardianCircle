import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Keychain from 'react-native-keychain';

import { useTheme } from '@core/theme/ThemeProvider';
import { PreferencesStore } from '@core/storage/preferences/PreferencesStore';
import { Logger } from '@core/logger/Logger';

const TAG = 'WipeData';
const CONFIRM_PHRASE = 'DELETE MY DATA';

interface WipeNativeModule {
  wipeAll(): Promise<void>;
}
const WipeNative = NativeModules.WipeModule as WipeNativeModule | undefined;

// All Keychain service keys written by GuardianCircle — must be exhaustive.
// Add here whenever a new SecureStore.set() call is introduced elsewhere.
const KEYCHAIN_SERVICES = [
  // Identity keys (IdentityManager)
  'identity_public_key',
  'fcm_encryption_public_key',
  // PIN hashes (DuressPinService)
  'gc_real_pin_hash',
  'gc_duress_pin_hash',
  'gc_pin_enabled',
  // Legacy pin hash key (kept for older installs)
  'gc_pin_hash',
  // AI BYOK keys
  'ai_openai_key',
  'ai_anthropic_key',
  'ai_gemini_key',
];

export default function WipeDataScreen(): React.JSX.Element {
  const theme     = useTheme();
  const styles    = makeStyles(theme);
  const navigation = useNavigation();

  const [phrase, setPhrase] = useState('');
  const [wiping, setWiping] = useState(false);

  const confirmed = phrase.trim() === CONFIRM_PHRASE;

  const wipeAll = (): void => {
    if (!confirmed) {return;}

    Alert.alert(
      'Final Confirmation',
      'This permanently deletes ALL GuardianCircle data — guardians, journeys, evidence, and all encryption keys. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe Everything',
          style: 'destructive',
          onPress: (): void => { void (async () => {
            setWiping(true);
            try {
              // 1. Clear MMKV preferences (non-sensitive app state)
              PreferencesStore.clearAll();
              Logger.info(TAG, 'MMKV cleared');

              // 2. Delete Keychain entries (AI keys, PIN hash)
              for (const service of KEYCHAIN_SERVICES) {
                try {
                  await Keychain.resetGenericPassword({ service });
                } catch {
                  // Key may not exist — tolerate
                }
              }
              Logger.info(TAG, 'Keychain entries cleared');

              // 3. Native wipe: DB file, SharedPreferences passphrase blob, Keystore keys, process exit
              if (WipeNative) {
                await WipeNative.wipeAll();
                // Process exits inside wipeAll — code below is unreachable in normal flow
              } else {
                Logger.warn(TAG, 'WipeModule unavailable — manual uninstall required to fully clear data');
                Alert.alert(
                  'Partial Wipe',
                  'App preferences and AI keys have been cleared. To fully delete all data, please uninstall and reinstall the app.',
                );
              }
            } catch (err) {
              setWiping(false);
              const msg = err instanceof Error ? err.message : 'Wipe failed';
              Logger.error(TAG, 'Wipe error', { message: msg.slice(0, 120) });
              // Show error but still exit — partial wipe is better than no wipe
              Alert.alert(
                'Wipe Completed with Errors',
                `Most data has been cleared. ${msg}\n\nUninstalling the app will remove any remaining data.`,
              );
            }
          })(); },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={[styles.back, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.danger }]} accessibilityRole="header">
          Wipe All Data
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.icon}>⚠️</Text>

        <Text style={[styles.warning, { color: theme.colors.onSurface }]}>
          This permanently deletes all GuardianCircle data:
        </Text>

        <View style={[styles.list, { backgroundColor: theme.colors.surface }]}>
          {[
            'Guardians and their keys',
            'Journey history and waypoints',
            'Check-in records and geofences',
            'Evidence file metadata',
            'Android Keystore encryption keys',
            'All app preferences and settings',
          ].map((item) => (
            <Text key={item} style={[styles.listItem, { color: theme.colors.onSurface }]}>
              • {item}
            </Text>
          ))}
        </View>

        <Text style={[styles.instruction, { color: theme.colors.onSurfaceVariant }]}>
          Type <Text style={{ fontWeight: '700', color: theme.colors.danger }}>{CONFIRM_PHRASE}</Text> to confirm:
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.onSurface,
              borderColor: confirmed ? theme.colors.danger : theme.colors.border,
            },
          ]}
          value={phrase}
          onChangeText={setPhrase}
          placeholder={CONFIRM_PHRASE}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel="Type DELETE MY DATA to confirm"
        />

        <TouchableOpacity
          style={[styles.wipeBtn, { backgroundColor: confirmed ? theme.colors.danger : theme.colors.border }]}
          onPress={wipeAll}
          disabled={!confirmed || wiping}
          accessibilityRole="button"
          accessibilityLabel="Wipe all data"
        >
          {wiping
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.wipeBtnText}>Wipe All Data</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
    back: { fontSize: 17, marginBottom: 4 },
    title: { ...theme.typography.headlineMedium },
    body: { flex: 1, padding: theme.spacing.lg },
    icon: { fontSize: 48, textAlign: 'center', marginBottom: theme.spacing.md },
    warning: { fontSize: 15, fontWeight: '600', marginBottom: theme.spacing.md },
    list: { borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg, gap: 6 },
    listItem: { fontSize: 14, lineHeight: 20 },
    instruction: { fontSize: 14, marginBottom: theme.spacing.sm },
    input: {
      borderWidth: 1.5, borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md, paddingVertical: 12,
      fontSize: 15, marginBottom: theme.spacing.lg, letterSpacing: 1,
    },
    wipeBtn: { borderRadius: theme.radius.full, paddingVertical: theme.spacing.md, alignItems: 'center' },
    wipeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
