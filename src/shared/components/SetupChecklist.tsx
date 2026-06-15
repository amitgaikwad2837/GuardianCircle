import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '@core/theme/tokens';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { PermissionManager } from '@core/permissions/PermissionManager';
import { EventBus } from '@core/events/EventBus';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

async function computeItems(): Promise<ChecklistItem[]> {
  const locationGranted = await PermissionManager.check('location');

  return [
    {
      id: 'guardian',
      label: 'Add a guardian',
      done: PreferencesStore.getBoolean(PREF_KEYS.CHECKLIST_GUARDIAN_ADDED),
    },
    {
      id: 'location',
      label: 'Grant location access',
      done: locationGranted,
    },
    {
      id: 'pin',
      label: 'Set a duress PIN',
      // Written by DuressPinService.setRealPin() — avoids a shared→feature import
      done: PreferencesStore.getBoolean(PREF_KEYS.CHECKLIST_DURESS_PIN_SET),
    },
    {
      id: 'test_sos',
      label: 'Do a test SOS',
      done: PreferencesStore.getBoolean(PREF_KEYS.CHECKLIST_TEST_SOS_DONE),
    },
  ];
}

export function SetupChecklist(): React.JSX.Element | null {
  const [items, setItems] = useState<ChecklistItem[]>([]);

  const refresh = useCallback((): void => {
    void computeItems().then(setItems);
  }, []);

  useEffect(() => {
    refresh();

    // Re-check when a guardian is added
    const offGuardian = EventBus.on('guardian:added', () => {
      PreferencesStore.setBoolean(PREF_KEYS.CHECKLIST_GUARDIAN_ADDED, true);
      refresh();
    });

    return () => { offGuardian(); };
  }, [refresh]);

  const doneCount = items.filter((i) => i.done).length;

  // Hide once all four steps are complete
  if (items.length === 0 || doneCount === items.length) {return null;}

  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <View style={styles.card} accessibilityRole="none" accessibilityLabel={`Setup checklist: ${pct}% complete`}>
      <View style={styles.header}>
        <Text style={styles.title}>Get started</Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack} accessibilityElementsHidden>
        <View style={[styles.barFill, { width: `${pct}%` as `${number}%` }]} />
      </View>

      <View style={styles.items}>
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={[styles.dot, item.done && styles.dotDone]}>
              {item.done && <Text style={styles.check}>✓</Text>}
            </View>
            <Text
              style={[styles.itemLabel, item.done && styles.itemLabelDone]}
              accessibilityLabel={`${item.label}: ${item.done ? 'complete' : 'not done'}`}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.light.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.titleSmall,
    color: colors.light.onBackground,
  },
  pct: {
    ...typography.labelLarge,
    color: colors.brandIndigo,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.light.border,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brandIndigo,
  },
  items: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.light.onSurfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: colors.brandIndigo,
    borderColor: colors.brandIndigo,
  },
  check: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  itemLabel: {
    ...typography.bodyMedium,
    color: colors.light.onSurfaceVariant,
  },
  itemLabelDone: {
    color: colors.light.onBackground,
    textDecorationLine: 'line-through',
  },
});
