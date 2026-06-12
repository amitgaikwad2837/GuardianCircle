import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { useTheme } from '@core/theme/ThemeProvider';
import { ScheduleCheckInUseCase } from '../../application/ScheduleCheckInUseCase';
import { CompleteCheckInUseCase } from '../../application/CompleteCheckInUseCase';
import { Container, DI_TOKENS } from '@core/di/Container';
import { useCheckInStore } from '../store/checkinStore';
import type { ICheckInRepository } from '../../domain/interfaces/ICheckInRepository';
import type { CheckIn } from '../../domain/entities/CheckIn';
import type { JourneyStackParams } from '@core/navigation/NavigationTypes';

type Nav   = NativeStackNavigationProp<JourneyStackParams, 'CheckIn'>;
type Route = RouteProp<JourneyStackParams, 'CheckIn'>;

export default function CheckInScreen(): React.JSX.Element {
  const theme  = useTheme();
  const styles = makeStyles(theme);
  const nav    = useNavigation<Nav>();
  const route  = useRoute<Route>();
  const { checkinId } = route.params;

  const { addCheckIn, updateCheckIn, removeCheckIn } = useCheckInStore();

  const [existing, setExisting] = useState<CheckIn | null>(null);
  const [label, setLabel]       = useState('');
  const [time, setTime]         = useState('');       // HH:MM
  const [delay, setDelay]       = useState('15');     // minutes
  const [isBusy, setIsBusy]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (checkinId) {
      const repo = Container.resolve<ICheckInRepository>(DI_TOKENS.ICheckInRepository);
      void repo.getById(checkinId).then((ci) => {
        if (ci) {
          setExisting(ci);
          setLabel(ci.label ?? '');
          setTime(ci.scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          setDelay(String(ci.escalationDelayMinutes));
        }
      });
    }
  }, [checkinId]);

  const handleComplete = async (): Promise<void> => {
    if (!checkinId) return;
    setIsBusy(true);
    try {
      await new CompleteCheckInUseCase().execute(checkinId);
      updateCheckIn(checkinId, { status: 'completed' });
      nav.goBack();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSchedule = async (): Promise<void> => {
    setError('');
    if (!/^\d{1,2}:\d{2}$/.test(time)) {
      setError('Enter a valid time (HH:MM)');
      return;
    }
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h!, m!, 0, 0);
    if (d < new Date()) d.setDate(d.getDate() + 1);

    setIsBusy(true);
    try {
      const ci = await new ScheduleCheckInUseCase().execute({
        label: label.trim() || undefined,
        scheduledAt: d,
        escalationDelayMinutes: parseInt(delay, 10) || 15,
      });
      addCheckIn(ci);
      nav.goBack();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed.');
    } finally {
      setIsBusy(false);
    }
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
          <Text style={[styles.back, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          {existing ? 'Check-in' : 'Schedule Check-in'}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {existing ? (
          /* View existing check-in */
          <View>
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.cardLabel, { color: theme.colors.onSurfaceVariant }]}>
                LABEL
              </Text>
              <Text style={[styles.cardValue, { color: theme.colors.onSurface }]}>
                {existing.label ?? 'Unnamed check-in'}
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: theme.colors.surface, marginTop: 12 }]}>
              <Text style={[styles.cardLabel, { color: theme.colors.onSurfaceVariant }]}>
                SCHEDULED
              </Text>
              <Text style={[styles.cardValue, { color: theme.colors.onSurface }]}>
                {existing.scheduledAt.toLocaleString()}
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: theme.colors.surface, marginTop: 12 }]}>
              <Text style={[styles.cardLabel, { color: theme.colors.onSurfaceVariant }]}>
                STATUS
              </Text>
              <Text style={[styles.cardValue, { color: theme.colors.onSurface, textTransform: 'capitalize' }]}>
                {existing.status}
              </Text>
            </View>

            {(existing.status === 'pending' || existing.status === 'escalated') && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.colors.primary, marginTop: 24 }, isBusy && { opacity: 0.6 }]}
                onPress={handleComplete}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel="Mark as completed"
              >
                {isBusy
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>I'm Safe — Complete</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* Create new check-in */
          <View>
            <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Label</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.onSurface, backgroundColor: theme.colors.surface }]}
              placeholder="e.g. Home safe, Arrived at work"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={label}
              onChangeText={setLabel}
              returnKeyType="next"
              accessibilityLabel="Check-in label"
            />

            <Text style={[styles.fieldLabel, { color: theme.colors.onSurface, marginTop: 16 }]}>
              Time (HH:MM)
            </Text>
            <TextInput
              style={[styles.input, { borderColor: error ? theme.colors.danger : theme.colors.border, color: theme.colors.onSurface, backgroundColor: theme.colors.surface }]}
              placeholder="e.g. 21:00"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={time}
              onChangeText={setTime}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
              accessibilityLabel="Scheduled time"
            />
            {error !== '' && (
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
            )}

            <Text style={[styles.fieldLabel, { color: theme.colors.onSurface, marginTop: 16 }]}>
              Alert guardians if missed after (minutes)
            </Text>
            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.onSurface, backgroundColor: theme.colors.surface }]}
              value={delay}
              onChangeText={setDelay}
              keyboardType="number-pad"
              returnKeyType="done"
              accessibilityLabel="Escalation delay in minutes"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.colors.primary, marginTop: 24 }, isBusy && { opacity: 0.6 }]}
              onPress={handleSchedule}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Schedule check-in"
            >
              {isBusy
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Schedule Check-in</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm,
    },
    back: { fontSize: 17 },
    title: { ...theme.typography.titleMedium, flex: 1, textAlign: 'center' },
    content: { padding: theme.spacing.lg, paddingBottom: 40 },
    card: { borderRadius: theme.radius.lg, padding: theme.spacing.lg },
    cardLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 4 },
    cardValue: { fontSize: 17, fontWeight: '500' },
    fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    input: {
      borderWidth: 1, borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
      fontSize: 15, minHeight: 48,
    },
    errorText: { fontSize: 12, marginTop: 4 },
    primaryBtn: {
      borderRadius: theme.radius.full, paddingVertical: theme.spacing.md, alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
