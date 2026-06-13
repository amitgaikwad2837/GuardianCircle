import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { useTheme } from '@core/theme/ThemeProvider';
import { Container, DI_TOKENS } from '@core/di/Container';
import { LocationService } from '@core/location/LocationService';
import { ArriveJourneyUseCase } from '../../application/ArriveJourneyUseCase';
import { CancelJourneyUseCase } from '../../application/CancelJourneyUseCase';
import { DeviationCheckUseCase } from '../../application/DeviationCheckUseCase';
import { useJourneyStore } from '../store/journeyStore';
import type { IJourneyRepository } from '../../domain/interfaces/IJourneyRepository';
import type { Journey } from '../../domain/entities/Journey';
import type { JourneyStackParams } from '@core/navigation/NavigationTypes';

type Nav   = NativeStackNavigationProp<JourneyStackParams, 'ActiveJourney'>;
type Route = RouteProp<JourneyStackParams, 'ActiveJourney'>;

const UPDATE_INTERVAL_MS = 60_000;

export default function ActiveJourneyScreen(): React.JSX.Element {
  const theme    = useTheme();
  const styles   = makeStyles(theme);
  const nav      = useNavigation<Nav>();
  const route    = useRoute<Route>();
  const { journeyId } = route.params;

  const activeJourney              = useJourneyStore((s) => s.activeJourney);
  const { setActive, updateActive } = useJourneyStore();
  const [journey, setJourney]   = useState<Journey | null>(activeJourney);
  const [isBusy, setIsBusy]     = useState(false);
  const [elapsed, setElapsed]   = useState(0); // seconds since journey start

  // Load journey if not in store
  useEffect(() => {
    if (!journey) {
      const repo = Container.resolve<IJourneyRepository>(DI_TOKENS.IJourneyRepository);
      void repo.getById(journeyId).then(setJourney);
    }
  }, [journey, journeyId]);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Periodic location update + deviation check
  useEffect(() => {
    const interval = setInterval((): void => { void (async () => {
      try {
        const loc = await LocationService.getCurrentLocation();
        const uc = new DeviationCheckUseCase();
        await uc.execute(journeyId, loc);
        const repo = Container.resolve<IJourneyRepository>(DI_TOKENS.IJourneyRepository);
        const updated = await repo.getById(journeyId);
        if (updated) { setJourney(updated); updateActive(updated); }
      } catch {}
    })(); }, UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [journeyId, updateActive]);

  const formatElapsed = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {return `${h}h ${m}m`;}
    if (m > 0) {return `${m}m ${s}s`;}
    return `${s}s`;
  };

  const handleArrive = async (): Promise<void> => {
    setIsBusy(true);
    try {
      await new ArriveJourneyUseCase().execute(journeyId);
      setActive(null);
      nav.popToTop();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancel = (): void => {
    Alert.alert(
      'Cancel Journey',
      'Are you sure you want to cancel this journey? Your guardians will be notified.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Cancel Journey',
          style: 'destructive',
          onPress: (): void => {
            setIsBusy(true);
            void new CancelJourneyUseCase().execute(journeyId)
              .then(() => { setActive(null); nav.popToTop(); })
              .catch((err: unknown) => { Alert.alert('Error', err instanceof Error ? err.message : 'Failed.'); })
              .finally(() => { setIsBusy(false); });
          },
        },
      ],
    );
  };

  if (!journey) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const statusColor: Record<string, string> = {
    active:   theme.colors.primary,
    arrived:  theme.colors.success ?? '#4CAF50',
    overdue:  theme.colors.warning ?? '#FF9800',
    deviated: theme.colors.danger,
    cancelled: theme.colors.onSurfaceVariant,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.back, { color: theme.colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>
          Active Journey
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.body}>
        {/* Destination */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardLabel, { color: theme.colors.onSurfaceVariant }]}>
            DESTINATION
          </Text>
          <Text style={[styles.cardValue, { color: theme.colors.onSurface }]}>
            {journey.destinationLabel ?? 'Not set'}
          </Text>
        </View>

        {/* Status */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardLabel, { color: theme.colors.onSurfaceVariant }]}>STATUS</Text>
          <Text style={[styles.cardValue, { color: statusColor[journey.status] ?? theme.colors.onSurface, textTransform: 'capitalize' }]}>
            {journey.status}
          </Text>
        </View>

        {/* Elapsed */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardLabel, { color: theme.colors.onSurfaceVariant }]}>ELAPSED</Text>
          <Text style={[styles.cardValue, { color: theme.colors.onSurface }]}>
            {formatElapsed(elapsed)}
          </Text>
        </View>

        {/* Expected arrival */}
        {journey.expectedArrivalAt && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardLabel, { color: theme.colors.onSurfaceVariant }]}>
              EXPECTED ARRIVAL
            </Text>
            <Text style={[styles.cardValue, { color: theme.colors.onSurface }]}>
              {journey.expectedArrivalAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={[styles.footer, { borderTopColor: theme.colors.divider, backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[styles.arriveBtn, { backgroundColor: theme.colors.primary }, isBusy && { opacity: 0.6 }]}
          onPress={() => { void handleArrive(); }}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="I have arrived"
        >
          {isBusy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.arriveBtnText}>I've Arrived</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: theme.colors.danger }]}
          onPress={handleCancel}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Cancel journey"
        >
          <Text style={[styles.cancelBtnText, { color: theme.colors.danger }]}>
            Cancel Journey
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm,
    },
    back: { fontSize: 26, lineHeight: 30 },
    headerTitle: { ...theme.typography.titleMedium, flex: 1, textAlign: 'center' },
    body: { flex: 1, padding: theme.spacing.md, gap: 12 },
    card: { borderRadius: theme.radius.lg, padding: theme.spacing.lg },
    cardLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 4 },
    cardValue: { fontSize: 18, fontWeight: '600' },
    footer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      padding: theme.spacing.md, gap: 10,
    },
    arriveBtn: {
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    arriveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    cancelBtn: {
      borderWidth: 1.5,
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, fontWeight: '600' },
  });
}
