import React, { useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import { Container, DI_TOKENS } from '@core/di/Container';
import { Logger } from '@core/logger/Logger';
import { useJourneyStore } from '../store/journeyStore';
import { useCheckInStore } from '@features/checkin/presentation/store/checkinStore';
import type { IJourneyRepository } from '../../domain/interfaces/IJourneyRepository';
import type { ICheckInRepository } from '@features/checkin/domain/interfaces/ICheckInRepository';
import type { JourneyStackParams } from '@core/navigation/NavigationTypes';

type Nav = NativeStackNavigationProp<JourneyStackParams>;

const TAG = 'JourneyDashboard';

export default function JourneyDashboardScreen(): React.JSX.Element {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation<Nav>();

  const { activeJourney, history, isLoading, setActive, setHistory, setLoading } =
    useJourneyStore();
  const { pending, setPending } = useCheckInStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const journeyRepo = Container.resolve<IJourneyRepository>(DI_TOKENS.IJourneyRepository);
      const checkinRepo = Container.resolve<ICheckInRepository>(DI_TOKENS.ICheckInRepository);
      const [active, hist, checkins] = await Promise.all([
        journeyRepo.getActive(),
        journeyRepo.getHistory(10),
        checkinRepo.getPending(),
      ]);
      setActive(active);
      setHistory(hist);
      setPending(checkins);
    } catch (err) {
      Logger.error(TAG, 'Load failed', err);
    } finally {
      setLoading(false);
    }
  }, [setActive, setHistory, setLoading, setPending]);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Journey</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
      >
        {activeJourney ? (
          <TouchableOpacity
            style={[styles.activeBanner, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('ActiveJourney', { journeyId: activeJourney.id })}
            accessibilityRole="button"
            accessibilityLabel="View active journey"
          >
            <Text style={styles.activeBannerTitle}>Journey Active</Text>
            <Text style={styles.activeBannerSub}>
              {activeJourney.destinationLabel ?? 'No destination set'} — tap to manage
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.startCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => navigation.navigate('StartJourney')}
            accessibilityRole="button"
            accessibilityLabel="Start a new journey"
          >
            <Text style={[styles.startIcon, { color: theme.colors.primary }]}>+</Text>
            <Text style={[styles.startLabel, { color: theme.colors.onSurface }]}>
              Start Journey
            </Text>
            <Text style={[styles.startSub, { color: theme.colors.onSurfaceVariant }]}>
              Share your route with guardians
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
          CHECK-INS
        </Text>

        {pending.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No pending check-ins
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, { borderColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('CheckIn', {})}
              accessibilityRole="button"
            >
              <Text style={[styles.addBtnText, { color: theme.colors.primary }]}>+ Schedule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {pending.slice(0, 3).map((ci) => (
              <TouchableOpacity
                key={ci.id}
                style={[styles.checkinRow, { backgroundColor: theme.colors.surface }]}
                onPress={() => navigation.navigate('CheckIn', { checkinId: ci.id })}
                accessibilityRole="button"
                accessibilityLabel={`Check-in: ${ci.label ?? 'Unnamed'}`}
              >
                <View style={[styles.checkinDot, { backgroundColor: theme.colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.checkinLabel, { color: theme.colors.onSurface }]}>
                    {ci.label ?? 'Check-in'}
                  </Text>
                  <Text style={[styles.checkinTime, { color: theme.colors.onSurfaceVariant }]}>
                    {ci.scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.addBtn, { borderColor: theme.colors.primary, marginTop: 8, alignSelf: 'center' }]}
              onPress={() => navigation.navigate('CheckIn', {})}
              accessibilityRole="button"
            >
              <Text style={[styles.addBtnText, { color: theme.colors.primary }]}>
                + Schedule New
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
          SAFE ZONES
        </Text>
        <TouchableOpacity
          style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('Geofences')}
          accessibilityRole="button"
        >
          <Text style={[styles.startLabel, { color: theme.colors.onSurface }]}>
            Manage Safe Zones
          </Text>
          <Text style={[styles.startSub, { color: theme.colors.onSurfaceVariant }]}>
            Get alerted when entering or leaving an area
          </Text>
        </TouchableOpacity>

        {history.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              RECENT
            </Text>
            {history.slice(0, 3).map((j) => (
              <View
                key={j.id}
                style={[styles.historyRow, { backgroundColor: theme.colors.surface }]}
              >
                <Text style={[styles.historyLabel, { color: theme.colors.onSurface }]}>
                  {j.destinationLabel ?? 'Journey'}
                </Text>
                <Text style={[styles.historyStatus, { color: theme.colors.onSurfaceVariant }]}>
                  {j.status}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
    title: { ...theme.typography.headlineMedium, color: theme.colors.onBackground },
    content: { padding: theme.spacing.md, paddingBottom: 80 },
    activeBanner: { borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
    activeBannerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    activeBannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
    startCard: { borderRadius: theme.radius.lg, padding: theme.spacing.lg, alignItems: 'center', marginBottom: theme.spacing.md },
    startIcon: { fontSize: 32, fontWeight: '200', marginBottom: 4 },
    startLabel: { fontSize: 16, fontWeight: '600' },
    startSub: { fontSize: 13, marginTop: 4 },
    sectionLabel: {
      fontSize: 11, fontWeight: '600', letterSpacing: 0.8,
      paddingHorizontal: theme.spacing.sm,
      paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xs,
    },
    emptyCard: { borderRadius: theme.radius.lg, padding: theme.spacing.lg, alignItems: 'center', marginBottom: 8 },
    emptyText: { fontSize: 14, marginBottom: theme.spacing.sm },
    addBtn: { borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: 6 },
    addBtnText: { fontSize: 14, fontWeight: '600' },
    checkinRow: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.radius.md, marginBottom: 8 },
    checkinDot: { width: 10, height: 10, borderRadius: 5, marginRight: theme.spacing.sm },
    checkinLabel: { fontSize: 14, fontWeight: '500' },
    checkinTime: { fontSize: 12, marginTop: 2 },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.radius.md, marginBottom: 8 },
    historyLabel: { fontSize: 14 },
    historyStatus: { fontSize: 12, textTransform: 'capitalize' },
  });
}
