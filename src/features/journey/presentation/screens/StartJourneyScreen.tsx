import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import { StartJourneyUseCase } from '../../application/StartJourneyUseCase';
import { useJourneyStore } from '../store/journeyStore';
import type { JourneyStackParams } from '@core/navigation/NavigationTypes';

type Nav = NativeStackNavigationProp<JourneyStackParams>;

export default function StartJourneyScreen(): React.JSX.Element {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation<Nav>();
  const setActive = useJourneyStore((s) => s.setActive);

  const [destination, setDestination] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');   // HH:MM
  const [deviation, setDeviation]     = useState('500');
  const [isBusy, setIsBusy]           = useState(false);
  const [errors, setErrors]           = useState<Partial<Record<string, string>>>({});

  const validate = (): boolean => {
    const next: Partial<Record<string, string>> = {};
    if (arrivalTime && !/^\d{1,2}:\d{2}$/.test(arrivalTime)) {
      next['arrival'] = 'Use HH:MM format (e.g. 21:30)';
    }
    const dev = parseInt(deviation, 10);
    if (isNaN(dev) || dev < 50) {
      next['deviation'] = 'Minimum 50 metres';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleStart = async (): Promise<void> => {
    if (!validate()) return;
    setIsBusy(true);
    try {
      let expectedArrivalAt: Date | undefined;
      if (arrivalTime) {
        const [h, m] = arrivalTime.split(':').map(Number);
        const d = new Date();
        d.setHours(h!, m!, 0, 0);
        if (d < new Date()) d.setDate(d.getDate() + 1); // next day if past
        expectedArrivalAt = d;
      }

      const uc = new StartJourneyUseCase();
      const journey = await uc.execute({
        destinationLabel: destination.trim() || undefined,
        expectedArrivalAt,
        deviationThresholdMeters: parseInt(deviation, 10),
      });
      setActive(journey);
      navigation.replace('ActiveJourney', { journeyId: journey.id });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to start journey.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.back, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Start Journey</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: theme.colors.onSurface }]}>Destination</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.onSurface, backgroundColor: theme.colors.surface }]}
          placeholder="e.g. Home, Work, Friend's place"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={destination}
          onChangeText={setDestination}
          returnKeyType="next"
          accessibilityLabel="Destination label"
        />

        <Text style={[styles.label, { color: theme.colors.onSurface, marginTop: theme.spacing.md }]}>
          Expected arrival
        </Text>
        <TextInput
          style={[styles.input, { borderColor: errors['arrival'] ? theme.colors.danger : theme.colors.border, color: theme.colors.onSurface, backgroundColor: theme.colors.surface }]}
          placeholder="HH:MM (e.g. 21:30) — optional"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={arrivalTime}
          onChangeText={setArrivalTime}
          keyboardType="numbers-and-punctuation"
          returnKeyType="next"
          accessibilityLabel="Expected arrival time"
        />
        {errors['arrival'] && (
          <Text style={[styles.error, { color: theme.colors.danger }]}>{errors['arrival']}</Text>
        )}

        <Text style={[styles.label, { color: theme.colors.onSurface, marginTop: theme.spacing.md }]}>
          Route deviation alert (metres)
        </Text>
        <TextInput
          style={[styles.input, { borderColor: errors['deviation'] ? theme.colors.danger : theme.colors.border, color: theme.colors.onSurface, backgroundColor: theme.colors.surface }]}
          value={deviation}
          onChangeText={setDeviation}
          keyboardType="number-pad"
          returnKeyType="done"
          accessibilityLabel="Deviation threshold in metres"
        />
        {errors['deviation'] && (
          <Text style={[styles.error, { color: theme.colors.danger }]}>{errors['deviation']}</Text>
        )}

        <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          Your active guardians will receive SMS updates during this journey.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.divider, backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: theme.colors.primary }, isBusy && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Start journey"
        >
          {isBusy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.startBtnText}>Start Journey</Text>
          }
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
      paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm,
    },
    back: { fontSize: 17 },
    title: { ...theme.typography.titleMedium, color: theme.colors.onBackground, flex: 1, textAlign: 'center' },
    content: { padding: theme.spacing.lg, paddingBottom: 32 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    input: {
      borderWidth: 1, borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
      fontSize: 15, minHeight: 48,
    },
    error: { fontSize: 12, marginTop: 4 },
    hint: { fontSize: 13, marginTop: theme.spacing.lg, lineHeight: 20 },
    footer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      padding: theme.spacing.md,
    },
    startBtn: {
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    startBtnDisabled: { opacity: 0.6 },
    startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
