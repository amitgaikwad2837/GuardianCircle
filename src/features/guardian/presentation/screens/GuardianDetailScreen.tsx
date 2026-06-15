import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import { RemoveGuardianUseCase } from '../../application/RemoveGuardianUseCase';
import { Container, DI_TOKENS }  from '@core/di/Container';
import type { IGuardianRepository } from '../../domain/interfaces/IGuardianRepository';
import { useGuardianStore }         from '../store/guardianStore';
import type { Guardian }            from '../../domain/entities/Guardian';
import type { GuardianStackParams } from '@core/navigation/NavigationTypes';
import { Logger } from '@core/logger/Logger';

const TAG = 'GuardianDetailScreen';

type NavProp   = NativeStackNavigationProp<GuardianStackParams>;
type RouteProp = NativeStackScreenProps<GuardianStackParams, 'GuardianDetail'>['route'];

export default function GuardianDetailScreen(): React.JSX.Element {
  const theme  = useTheme();
  const nav    = useNavigation<NavProp>();
  const route  = useRoute<RouteProp>();
  const store  = useGuardianStore();
  const styles = makeStyles(theme);

  const { guardianId } = route.params;

  const [guardian, setGuardian] = useState<Guardian | null>(
    store.guardians.find((g) => g.id === guardianId) ?? null,
  );
  const [isLoading, setIsLoading] = useState(guardian === null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (guardian !== null) {return;}
    void loadGuardian();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardianId]);

  async function loadGuardian(): Promise<void> {
    try {
      const repo = Container.resolve<IGuardianRepository>(DI_TOKENS.IGuardianRepository);
      const g    = await repo.getById(guardianId);
      setGuardian(g);
    } catch (err) {
      Logger.error(TAG, 'loadGuardian failed', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsLoading(false);
    }
  }

  function confirmRemove(): void {
    Alert.alert(
      'Remove Guardian',
      `Remove ${guardian?.displayName ?? 'this guardian'}? They will no longer receive emergency alerts.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => { void handleRemove(false); },
        },
      ],
    );
  }

  async function handleRemove(immediate: boolean): Promise<void> {
    setIsRemoving(true);
    try {
      const repo     = Container.resolve<IGuardianRepository>(DI_TOKENS.IGuardianRepository);
      const useCase  = new RemoveGuardianUseCase(repo);
      await useCase.execute(guardianId, immediate);
      store.removeGuardian(guardianId);
      nav.goBack();
    } catch (err) {
      Logger.error(TAG, 'handleRemove failed', { error: err instanceof Error ? err.message : String(err) });
      Alert.alert('Error', 'Could not remove guardian. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator style={styles.loadingCenter} color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!guardian) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingCenter}>
          <Text style={{ color: theme.colors.danger }}>Guardian not found</Text>
          <TouchableOpacity onPress={() => nav.goBack()} accessibilityRole="button">
            <Text style={{ color: theme.colors.primary, marginTop: 12 }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const trustLabels: Record<number, string> = { 1: 'Priority Contact', 2: 'Verified (QR paired)', 3: 'Observer' };
  const trustLabel = trustLabels[guardian.trustLevel] ?? 'Unknown';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">Guardian</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => nav.navigate('GuardianForm', { guardianId })}
          accessibilityRole="button"
          accessibilityLabel="Edit guardian"
        >
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '22' }]}>
            <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
              {guardian.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: theme.colors.onBackground }]}>
            {guardian.displayName}
          </Text>
          <Text style={[styles.phone, { color: theme.colors.onSurfaceVariant }]}>
            {guardian.phoneNumber}
          </Text>
        </View>

        {/* Info rows */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <InfoRow label="Trust level"    value={trustLabel}                              theme={theme} />
          <InfoRow label="Alert priority" value={`#${guardian.notificationPriority}`}    theme={theme} />
          <InfoRow label="Status"         value={guardian.isActive ? 'Active' : 'Inactive'} theme={theme} />
          {guardian.fcmToken !== null && guardian.fcmToken !== undefined && (
            <InfoRow label="Push alerts"  value="App installed ✓"                        theme={theme} />
          )}
          {guardian.lastAlertAt !== null && guardian.lastAlertAt !== undefined && (
            <InfoRow
              label="Last alerted"
              value={guardian.lastAlertAt.toLocaleString('en-IN')}
              theme={theme}
            />
          )}
          {guardian.notes !== null && guardian.notes !== undefined && guardian.notes.length > 0 && (
            <InfoRow label="Notes" value={guardian.notes} theme={theme} />
          )}
        </View>

        {/* Remove */}
        <TouchableOpacity
          style={[styles.removeButton, { borderColor: theme.colors.danger }]}
          onPress={confirmRemove}
          disabled={isRemoving}
          accessibilityRole="button"
          accessibilityLabel="Remove guardian"
          accessibilityHint="Remove this contact from your guardian list"
        >
          {isRemoving
            ? <ActivityIndicator color={theme.colors.danger} />
            : <Text style={[styles.removeText, { color: theme.colors.danger }]}>Remove Guardian</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }): React.JSX.Element {
  return (
    <View style={infoStyles.row}>
      <Text style={[infoStyles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: theme.colors.onSurface }]}>{value}</Text>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    backButton: { width: 80 },
    backText: { ...theme.typography.bodyLarge, color: theme.colors.primary },
    title: { flex: 1, ...theme.typography.titleLarge, color: theme.colors.onBackground, textAlign: 'center' },
    editButton: { width: 80, alignItems: 'flex-end' },
    editText: { ...theme.typography.bodyLarge, color: theme.colors.primary },
    content: { padding: theme.spacing.md },
    avatarContainer: { alignItems: 'center', marginVertical: theme.spacing.lg },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
    avatarText: { fontSize: 32, fontWeight: '700' },
    name: { ...theme.typography.headlineMedium },
    phone: { ...theme.typography.bodyLarge, marginTop: 4 },
    card: { borderRadius: theme.radius.lg, overflow: 'hidden', marginBottom: theme.spacing.lg },
    removeButton: {
      borderWidth: 1.5,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    removeText: { ...theme.typography.labelLarge },
  });
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    minHeight: 50,
    alignItems: 'center',
  },
  label: { fontSize: 14, fontWeight: '500' },
  value: { fontSize: 14, fontWeight: '400', flexShrink: 1, textAlign: 'right', marginLeft: 8 },
});
