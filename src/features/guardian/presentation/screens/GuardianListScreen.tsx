import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '@core/theme/ThemeProvider';
import { useGuardianStore } from '../store/guardianStore';
import { Container, DI_TOKENS } from '@core/di/Container';
import type { IGuardianRepository } from '../../domain/interfaces/IGuardianRepository';
import type { Guardian } from '../../domain/entities/Guardian';
import type { GuardianStackParams } from '@core/navigation/NavigationTypes';
import { Logger } from '@core/logger/Logger';

const TAG = 'GuardianListScreen';

type NavProp = NativeStackNavigationProp<GuardianStackParams>;

export default function GuardianListScreen(): React.JSX.Element {
  const theme   = useTheme();
  const store   = useGuardianStore();
  const nav     = useNavigation<NavProp>();
  const styles  = makeStyles(theme);

  // Load guardians from repository on mount
  useEffect(() => {
    void loadGuardians();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadGuardians(): Promise<void> {
    store.setLoading(true);
    try {
      const repo      = Container.resolve<IGuardianRepository>(DI_TOKENS.IGuardianRepository);
      const guardians = await repo.getAll();
      store.setGuardians(guardians);
    } catch (err) {
      Logger.error(TAG, 'loadGuardians failed', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      store.setLoading(false);
    }
  }

  const renderGuardian = useCallback(
    ({ item }: ListRenderItemInfo<Guardian>) => (
      <GuardianRow
        guardian={item}
        onPress={() => nav.navigate('GuardianDetail', { guardianId: item.id })}
      />
    ),
    [nav],
  );

  const keyExtractor = useCallback((item: Guardian) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Guardians
        </Text>
        <Text style={styles.subtitle}>
          {store.guardians.length}/10 trusted contacts
        </Text>
      </View>

      <FlatList
        data={store.guardians}
        renderItem={renderGuardian}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        ListEmptyComponent={store.isLoading ? null : <EmptyGuardians />}
        accessibilityLabel="Guardian list"
        refreshing={store.isLoading}
        onRefresh={() => { void loadGuardians(); }}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.addButton,
            store.guardians.length >= 10 && styles.addButtonDisabled,
          ]}
          disabled={store.guardians.length >= 10}
          onPress={() => nav.navigate('AddGuardian')}
          accessibilityRole="button"
          accessibilityLabel="Add guardian"
          accessibilityHint="Add a trusted contact who will receive your emergency alerts"
          accessibilityState={{ disabled: store.guardians.length >= 10 }}
        >
          <Text style={styles.addButtonText}>+ Add Guardian</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function GuardianRow({
  guardian,
  onPress,
}: {
  guardian: Guardian;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const trustColor = [theme.colors.sosRed, theme.colors.safe, theme.colors.info][guardian.trustLevel - 1]
    ?? theme.colors.neutral;
  const trustLabel = ['Priority', 'Verified', 'Observer'][guardian.trustLevel - 1] ?? 'Unknown';
  const initial    = (guardian.displayName || guardian.phoneNumber).charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      style={[rowStyles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Guardian: ${guardian.displayName}`}
      accessibilityHint="Tap to view or edit this guardian"
    >
      <View style={[rowStyles.avatar, { backgroundColor: trustColor + '22' }]}>
        <Text style={[rowStyles.avatarText, { color: trustColor }]}>{initial}</Text>
      </View>
      <View style={rowStyles.info}>
        <Text style={[rowStyles.name, { color: theme.colors.onSurface }]}>
          {guardian.displayName}
        </Text>
        <Text style={[rowStyles.phone, { color: theme.colors.onSurfaceVariant }]}>
          {guardian.phoneNumber}
        </Text>
      </View>
      <View style={[rowStyles.badge, { backgroundColor: trustColor + '22' }]}>
        <Text style={[rowStyles.badgeText, { color: trustColor }]}>{trustLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyGuardians(): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>👥</Text>
      <Text style={[emptyStyles.title, { color: theme.colors.onBackground }]}>
        No guardians yet
      </Text>
      <Text style={[emptyStyles.body, { color: theme.colors.onSurfaceVariant }]}>
        Add trusted contacts who will receive your emergency alerts.
        They do not need to have the app installed.
      </Text>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    title: { ...theme.typography.headlineMedium, color: theme.colors.onBackground },
    subtitle: { ...theme.typography.bodyMedium, color: theme.colors.onSurfaceVariant, marginTop: 2 },
    list: { padding: theme.spacing.md, flexGrow: 1 },
    footer: {
      padding: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    addButtonDisabled: { backgroundColor: theme.colors.border },
    addButtonText: { ...theme.typography.labelLarge, color: theme.colors.onPrimary },
  });
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: '600' },
  phone: { fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

const emptyStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
