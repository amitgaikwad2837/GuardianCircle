import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '@core/theme/ThemeProvider';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { Container, DI_TOKENS } from '@core/di/Container';
import type { IGuardianRepository } from '@features/guardian/domain/interfaces/IGuardianRepository';
import type { Guardian } from '@features/guardian/domain/entities/Guardian';

export default function DecoyModeScreen(): React.JSX.Element {
  const theme   = useTheme();
  const styles  = makeStyles(theme);
  const navigation = useNavigation();

  const [enabled, setEnabled]         = useState(() => PreferencesStore.getBoolean(PREF_KEYS.IS_DECOY_MODE_ENABLED));
  const [guardians, setGuardians]     = useState<Guardian[]>([]);
  const [decoys, setDecoys]           = useState<Guardian[]>([]);
  const [loading, setLoading]         = useState(true);

  const repo = Container.resolve<IGuardianRepository>(DI_TOKENS.IGuardianRepository);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await repo.getAll();
      setGuardians(all.filter((g) => !g.isDecoy));
      setDecoys(all.filter((g) => g.isDecoy));
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => { void load(); }, [load]);

  const toggleEnabled = (value: boolean): void => {
    setEnabled(value);
    PreferencesStore.setBoolean(PREF_KEYS.IS_DECOY_MODE_ENABLED, value);
  };

  const markAsDecoy = (guardian: Guardian): void => {
    Alert.alert(
      'Add to Decoy List',
      `Move "${guardian.displayName}" to the decoy guardian list? They will only appear when decoy mode is active.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Decoy',
          style: 'destructive',
          onPress: (): void => {
            void repo.update(guardian.id, { isDecoy: true }).then(() => { void load(); });
          },
        },
      ],
    );
  };

  const removeDecoy = (guardian: Guardian): void => {
    Alert.alert(
      'Remove from Decoy List',
      `Move "${guardian.displayName}" back to your real guardian list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Real List',
          onPress: (): void => {
            void repo.update(guardian.id, { isDecoy: false }).then(() => { void load(); });
          },
        },
      ],
    );
  };

  const renderGuardian = (item: Guardian, isDecoy: boolean): React.JSX.Element => (
    <View key={item.id} style={[styles.row, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.colors.onSurface }]}>{item.displayName}</Text>
        <Text style={[styles.phone, { color: theme.colors.onSurfaceVariant }]}>{item.phoneNumber}</Text>
      </View>
      <TouchableOpacity
        style={[styles.badge, { backgroundColor: isDecoy ? theme.colors.warning + '22' : theme.colors.primary + '22' }]}
        onPress={() => (isDecoy ? removeDecoy(item) : markAsDecoy(item))}
        accessibilityRole="button"
        accessibilityLabel={isDecoy ? `Remove ${item.displayName} from decoy list` : `Add ${item.displayName} to decoy list`}
      >
        <Text style={[styles.badgeText, { color: isDecoy ? theme.colors.warning : theme.colors.primary }]}>
          {isDecoy ? 'Remove' : 'Make Decoy'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={[styles.back, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.onBackground }]} accessibilityRole="header">
          Decoy Mode
        </Text>
      </View>

      <View style={[styles.toggleCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.toggleInfo}>
          <Text style={[styles.toggleLabel, { color: theme.colors.onSurface }]}>Enable Decoy Mode</Text>
          <Text style={[styles.toggleDesc, { color: theme.colors.onSurfaceVariant }]}>
            Show fake guardian list to someone checking your phone under duress.
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggleEnabled}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          accessibilityLabel="Decoy mode toggle"
          accessibilityRole="switch"
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={[]}
          ListHeaderComponent={() => (
            <>
              <Text style={[styles.section, { color: theme.colors.onSurfaceVariant }]}>DECOY GUARDIANS</Text>
              {decoys.length === 0 ? (
                <View style={[styles.empty, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                    No decoy guardians. Add some from your real list below.
                  </Text>
                </View>
              ) : (
                decoys.map((g) => renderGuardian(g, true))
              )}

              <Text style={[styles.section, { color: theme.colors.onSurfaceVariant }]}>REAL GUARDIANS</Text>
              {guardians.length === 0 ? (
                <View style={[styles.empty, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                    No guardians added yet.
                  </Text>
                </View>
              ) : (
                guardians.map((g) => renderGuardian(g, false))
              )}

              <Text style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}>
                When decoy mode is active, only decoy guardians are shown in the guardians list.
                Your real guardians remain active and will still receive SOS alerts.
              </Text>
            </>
          )}
          renderItem={() => null}
          contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
    back: { fontSize: 17, marginBottom: 4 },
    title: { ...theme.typography.headlineMedium },
    toggleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      gap: 12,
    },
    toggleInfo: { flex: 1 },
    toggleLabel: { fontSize: 15, fontWeight: '600' },
    toggleDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
    section: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.8,
      paddingHorizontal: theme.spacing.sm,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      marginBottom: 8,
    },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '500' },
    phone: { fontSize: 12, marginTop: 2 },
    badge: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: theme.radius.full,
      minHeight: 48,
      justifyContent: 'center',
    },
    badgeText: { fontSize: 12, fontWeight: '600' },
    empty: { borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: 8 },
    emptyText: { fontSize: 13, textAlign: 'center' },
    disclaimer: { fontSize: 11, lineHeight: 16, marginTop: theme.spacing.lg, textAlign: 'center', fontStyle: 'italic' },
  });
}
