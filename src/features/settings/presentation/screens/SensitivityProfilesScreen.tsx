import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import {
  SensitivityConfig,
  PROFILE_META,
  type SensitivityProfile,
} from '../../domain/SensitivityProfiles';
import type { SettingsStackParams } from '@core/navigation/NavigationTypes';

type Nav = NativeStackNavigationProp<SettingsStackParams, 'SensitivityProfiles'>;

const PROFILES = Object.keys(PROFILE_META) as SensitivityProfile[];

export default function SensitivityProfilesScreen(): React.JSX.Element {
  const theme  = useTheme();
  const styles = makeStyles(theme);
  const nav    = useNavigation<Nav>();

  const [active, setActive] = useState<SensitivityProfile>(() => SensitivityConfig.getProfile());

  const selectProfile = (p: SensitivityProfile): void => {
    SensitivityConfig.setProfile(p);
    setActive(p);
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
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>Detection Profile</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
          Choose a profile that matches your current activity.
          GuardianCircle adjusts fall and distress detection thresholds automatically.
        </Text>

        {PROFILES.map((p) => {
          const meta = PROFILE_META[p];
          const isSelected = p === active;
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.card,
                { backgroundColor: theme.colors.surface },
                isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
              ]}
              onPress={() => selectProfile(p)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${meta.label} profile — ${meta.description}`}
            >
              <View style={styles.cardRow}>
                <Text style={styles.icon}>{meta.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardLabel, { color: theme.colors.onSurface }]}>
                    {meta.label}
                  </Text>
                  <Text style={[styles.cardDesc, { color: theme.colors.onSurfaceVariant }]}>
                    {meta.description}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.check, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                )}
              </View>

              {isSelected && (
                <View style={[styles.thresholdBox, { borderTopColor: theme.colors.border }]}>
                  <ThresholdRow
                    label="Fall sensitivity"
                    value={sensitivityLabel(SensitivityConfig.getThresholds(p).fallConfidenceThreshold)}
                    theme={theme}
                  />
                  <ThresholdRow
                    label="Distress sensitivity"
                    value={sensitivityLabel(SensitivityConfig.getThresholds(p).distressConfidenceThreshold)}
                    theme={theme}
                  />
                  <ThresholdRow
                    label="Crash sensitivity"
                    value={sensitivityLabel(SensitivityConfig.getThresholds(p).crashConfidenceThreshold)}
                    theme={theme}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.footnote, { color: theme.colors.onSurfaceVariant }]}>
          Changes take effect the next time a detection session starts.
          If fall detection is running, restart it from the home screen.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function sensitivityLabel(threshold: number): string {
  if (threshold >= 0.80) {return 'Low (fewer alerts)';}
  if (threshold >= 0.65) {return 'Normal';}
  return 'High (more sensitive)';
}

function ThresholdRow({
  label, value, theme,
}: { label: string; value: string; theme: ReturnType<typeof useTheme> }): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <Text style={{ fontSize: 12, color: theme.colors.onSurface, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: theme.colors.background },
    header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
    back:         { fontSize: 17 },
    title:        { ...theme.typography.titleMedium, flex: 1, textAlign: 'center' },
    content:      { padding: theme.spacing.md, paddingBottom: 48 },
    intro:        { fontSize: 13, lineHeight: 20, marginBottom: theme.spacing.lg },
    card:         { borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: 12, borderWidth: 1, borderColor: 'transparent' },
    cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
    icon:         { fontSize: 28 },
    cardLabel:    { fontSize: 16, fontWeight: '700', marginBottom: 3 },
    cardDesc:     { fontSize: 13, lineHeight: 18 },
    check:        { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    checkMark:    { color: '#fff', fontSize: 13, fontWeight: '700' },
    thresholdBox: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10 },
    footnote:     { fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center' },
  });
}
