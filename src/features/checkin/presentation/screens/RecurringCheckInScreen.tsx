import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import { ScheduleCheckInUseCase } from '../../application/ScheduleCheckInUseCase';
import { useCheckInStore } from '../store/checkinStore';
import type { JourneyStackParams } from '@core/navigation/NavigationTypes';

type Nav = NativeStackNavigationProp<JourneyStackParams, 'RecurringCheckIn'>;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_RRULE = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

const DELAY_OPTIONS = [
  { label: '5 min',  value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
];

export default function RecurringCheckInScreen(): React.JSX.Element {
  const theme   = useTheme();
  const nav     = useNavigation<Nav>();
  const { addCheckIn } = useCheckInStore();

  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));
  const [hour,   setHour]   = useState('21');
  const [minute, setMinute] = useState('00');
  const [delay,  setDelay]  = useState(15);
  const [label,  setLabel]  = useState('Evening check-in');
  const [allDays, setAllDays] = useState(false);
  const [isBusy, setIsBusy]  = useState(false);

  const toggleDay = useCallback((idx: number): void => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {next.delete(idx);}
      else {next.add(idx);}
      return next;
    });
  }, []);

  const toggleAllDays = useCallback((val: boolean): void => {
    setAllDays(val);
    setSelectedDays(val ? new Set([0, 1, 2, 3, 4, 5, 6]) : new Set([0, 1, 2, 3, 4]));
  }, []);

  const buildRRule = (): string => {
    const days = [...selectedDays]
      .sort((a, b) => a - b)
      .map((i) => DAY_RRULE[i])
      .join(',');
    return `FREQ=WEEKLY;BYDAY=${days};BYHOUR=${parseInt(hour, 10)};BYMINUTE=${parseInt(minute, 10)};BYSECOND=0`;
  };

  const nextOccurrence = (): Date => {
    const now = new Date();
    const d = new Date();
    d.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
    const todayDow = (now.getDay() + 6) % 7; // convert Sun=0 to Mon=0
    for (let offset = 0; offset < 8; offset++) {
      const tryDow = (todayDow + offset) % 7;
      if (selectedDays.has(tryDow)) {
        d.setDate(now.getDate() + offset);
        d.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
        if (d > now) {return d;}
      }
    }
    d.setDate(now.getDate() + 1);
    return d;
  };

  const handleSave = async (): Promise<void> => {
    if (selectedDays.size === 0) {
      Alert.alert('Select at least one day');
      return;
    }
    setIsBusy(true);
    try {
      const uc = new ScheduleCheckInUseCase();
      const ci = await uc.execute({
        label: label.trim() || 'Recurring check-in',
        type: 'recurring',
        scheduledAt: nextOccurrence(),
        recurrenceRule: buildRRule(),
        escalationDelayMinutes: delay,
      });
      addCheckIn(ci);
      Alert.alert('Recurring check-in saved', `First check-in: ${nextOccurrence().toLocaleString()}`);
      nav.goBack();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setIsBusy(false);
    }
  };

  const styles = makeStyles(theme);

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
        <Text style={styles.title}>Recurring check-in</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Label */}
        <Text style={styles.sectionLabel}>Label</Text>
        <TouchableOpacity
          style={[styles.labelInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          onPress={() => {
            Alert.prompt('Label', 'Name for this check-in', (val) => {
              if (val !== undefined) {setLabel(val);}
            }, 'plain-text', label);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Label: ${label}`}
        >
          <Text style={{ color: theme.colors.onSurface, fontSize: 15 }}>{label}</Text>
        </TouchableOpacity>

        {/* Days of week */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Days</Text>
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.colors.onSurfaceVariant }]}>Every day</Text>
            <Switch
              value={allDays}
              onValueChange={toggleAllDays}
              accessibilityLabel="Toggle every day"
            />
          </View>
        </View>
        <View style={styles.daysRow}>
          {DAYS.map((d, i) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.dayChip,
                {
                  backgroundColor: selectedDays.has(i) ? theme.colors.primary : theme.colors.surface,
                  borderColor: selectedDays.has(i) ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => toggleDay(i)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selectedDays.has(i) }}
              accessibilityLabel={d}
            >
              <Text style={{ color: selectedDays.has(i) ? '#fff' : theme.colors.onSurface, fontSize: 12, fontWeight: '600' }}>
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time picker */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Time</Text>
        <View style={styles.timeRow}>
          <View style={styles.pickerGroup}>
            <Text style={[styles.pickerLabel, { color: theme.colors.onSurfaceVariant }]}>Hour</Text>
            <ScrollView
              style={[styles.pickerScroll, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {HOURS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.pickerItem, h === hour && { backgroundColor: theme.colors.primary + '22' }]}
                  onPress={() => setHour(h)}
                >
                  <Text style={{ color: h === hour ? theme.colors.primary : theme.colors.onSurface, fontWeight: h === hour ? '700' : '400' }}>
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <Text style={[styles.timeSep, { color: theme.colors.onSurface }]}>:</Text>
          <View style={styles.pickerGroup}>
            <Text style={[styles.pickerLabel, { color: theme.colors.onSurfaceVariant }]}>Min</Text>
            <ScrollView
              style={[styles.pickerScroll, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {MINUTES.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.pickerItem, m === minute && { backgroundColor: theme.colors.primary + '22' }]}
                  onPress={() => setMinute(m)}
                >
                  <Text style={{ color: m === minute ? theme.colors.primary : theme.colors.onSurface, fontWeight: m === minute ? '700' : '400' }}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Escalation delay */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Alert guardians if missed after</Text>
        <View style={styles.delayRow}>
          {DELAY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.delayChip,
                {
                  backgroundColor: delay === opt.value ? theme.colors.primary : theme.colors.surface,
                  borderColor: delay === opt.value ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setDelay(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: delay === opt.value }}
              accessibilityLabel={opt.label}
            >
              <Text style={{ color: delay === opt.value ? '#fff' : theme.colors.onSurface, fontSize: 13, fontWeight: '600' }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview */}
        <View style={[styles.preview, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.previewLabel, { color: theme.colors.onSurfaceVariant }]}>Next check-in</Text>
          <Text style={[styles.previewValue, { color: theme.colors.onSurface }]}>
            {selectedDays.size > 0 ? nextOccurrence().toLocaleString() : '—'}
          </Text>
          <Text style={[styles.previewLabel, { color: theme.colors.onSurfaceVariant, marginTop: 6 }]}>Rule</Text>
          <Text style={[styles.previewMono, { color: theme.colors.onSurface }]}>
            {selectedDays.size > 0 ? buildRRule() : '—'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary }, isBusy && { opacity: 0.6 }]}
          onPress={() => { void handleSave(); }}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Save recurring check-in"
        >
          {isBusy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save recurring check-in</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: theme.colors.background },
    header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
    back:         { fontSize: 17 },
    title:        { ...theme.typography.titleMedium, color: theme.colors.onBackground, flex: 1, textAlign: 'center' },
    content:      { padding: theme.spacing.lg, paddingBottom: 48 },
    sectionLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.onSurfaceVariant, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
    sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switchRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
    switchLabel:  { fontSize: 14 },
    labelInput:   { borderWidth: 1, borderRadius: theme.radius.md, padding: theme.spacing.md, minHeight: 48, justifyContent: 'center' },
    daysRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    dayChip:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    timeRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    pickerGroup:  { flex: 1 },
    pickerLabel:  { fontSize: 12, marginBottom: 4 },
    pickerScroll: { borderWidth: 1, borderRadius: theme.radius.md, maxHeight: 140 },
    pickerItem:   { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
    timeSep:      { fontSize: 24, fontWeight: '700', marginTop: 24, paddingHorizontal: 4 },
    delayRow:     { flexDirection: 'row', gap: 8 },
    delayChip:    { flex: 1, paddingVertical: 10, borderRadius: theme.radius.md, borderWidth: 1, alignItems: 'center' },
    preview:      { borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginTop: 24, marginBottom: 8 },
    previewLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
    previewValue: { fontSize: 15, fontWeight: '500', marginTop: 2 },
    previewMono:  { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
    saveBtn:      { borderRadius: theme.radius.full, paddingVertical: theme.spacing.md, alignItems: 'center', marginTop: 24 },
    saveBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
